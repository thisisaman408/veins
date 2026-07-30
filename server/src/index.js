import dotenv from "dotenv";
import express from "express";
import http from "http";
import cors from "cors";
import mongoose from "mongoose";
import { Server } from "socket.io";
import {
  advanceRound,
  buildHistory,
  buildRoundPayload,
  clearRevealTimer,
  createSession,
  joinSession,
  rejoinSession,
  submitRoundPrompts,
  submitTargetAnswers,
  submitObserverGuess,
  submitTargetExplanation,
  addChatMessage,
  submitPlatformAnswer,
  submitHonestyJudgment,
  handleTimerTimeout
} from "./services/gameService.js";
import GameSession from "./models/GameSession.js";

dotenv.config();

const app = express();
const server = http.createServer(app);
const port = process.env.PORT ?? 4000;
const clientUrl = process.env.CLIENT_URL ?? "http://localhost:5173";
const mongoUri = process.env.MONGO_URI ?? "mongodb://127.0.0.1:27017/veritas";

app.use(cors({ origin: clientUrl }));
app.use(express.json());

const io = new Server(server, {
  cors: {
    origin: clientUrl,
    methods: ["GET", "POST"]
  }
});

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "veritas-server" });
});

function requireAdmin(req, res, next) {
  const configuredKey = process.env.ADMIN_KEY || "veritas2026";
  const providedKey = req.get("x-admin-key") ?? req.query.key;

  if (providedKey !== configuredKey) {
    res.status(401).json({ error: "Invalid admin key." });
    return;
  }

  next();
}

app.get("/api/admin/sessions", requireAdmin, async (_req, res, next) => {
  try {
    const sessions = await GameSession.find()
      .sort({ createdAt: -1 })
      .limit(25)
      .lean();
    res.json(sessions);
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: error.message ?? "Internal server error" });
});

function emitSocketError(socket, error) {
  socket.emit("game_error", { message: error.message ?? "Something went wrong." });
}

function emitRoundState(session, eventName = "game_started") {
  if (session.hostSocketId) {
    io.to(session.hostSocketId).emit(eventName, buildRoundPayload(session, session.hostSocketId));
  }
  if (session.guestSocketId) {
    io.to(session.guestSocketId).emit(eventName, buildRoundPayload(session, session.guestSocketId));
  }
}

// Grace-period timers: socketId → NodeJS.Timeout
// Gives a refreshing player 5 s to rejoin before we tell the other player they left.
const disconnectTimers = new Map();

io.on("connection", (socket) => {
  socket.on("create_room", async (payload = {}) => {
    try {
      const session = await createSession(socket.id, payload);
      socket.join(session.roomCode);
      socket.emit("room_created", {
        roomCode: session.roomCode,
        player: session.players.host,
        relationship: session.relationship
      });
      socket.emit("player_joined", { playersCount: 1 });
    } catch (error) {
      emitSocketError(socket, error);
    }
  });

  socket.on("join_room", async ({ roomCode, playerName, relationshipType }) => {
    try {
      const normalizedRoomCode = String(roomCode ?? "").trim();
      const session = await joinSession(normalizedRoomCode, socket.id, { playerName, relationshipType });
      socket.join(session.roomCode);
      io.to(session.roomCode).emit("player_joined", { playersCount: 2 });
      socket.emit("joined_room", {
        roomCode: session.roomCode,
        player: session.players.guest
      });
      emitRoundState(session, "game_started");
    } catch (error) {
      emitSocketError(socket, error);
    }
  });

  // Observer submits 3 questions
  socket.on("submit_round_prompts", async ({ roomCode, prompts }) => {
    try {
      const session = await submitRoundPrompts({ roomCode, socketId: socket.id, prompts });
      emitRoundState(session, "prompts_ready");
    } catch (error) {
      emitSocketError(socket, error);
    }
  });

  // Target submits 3 answers + which one is the lie
  socket.on("submit_target_answers", async ({ roomCode, targetAnswers, targetAnswerImages, lieIndex }) => {
    try {
      const session = await submitTargetAnswers({ roomCode, socketId: socket.id, targetAnswers, targetAnswerImages, lieIndex: Number(lieIndex) });
      emitRoundState(session, "answers_ready");
    } catch (error) {
      emitSocketError(socket, error);
    }
  });

  // Observer guesses which answer is the lie
  socket.on("submit_observer_guess", async ({ roomCode, guessedLieIndex }) => {
    try {
      const { session, round } = await submitObserverGuess({ roomCode, socketId: socket.id, guessedLieIndex: Number(guessedLieIndex) });
      // emit updated state to both players — phase will be TARGET_EXPLANATION or REVEAL
      emitRoundState(session, "guess_submitted");
    } catch (error) {
      emitSocketError(socket, error);
    }
  });

  // Target types their real explanation (only if observer guessed correctly)
  socket.on("submit_target_explanation", async ({ roomCode, explanation }) => {
    try {
      const { session } = await submitTargetExplanation({ roomCode, socketId: socket.id, explanation });
      emitRoundState(session, "round_reveal");
    } catch (error) {
      emitSocketError(socket, error);
    }
  });

  socket.on("next_round", async ({ roomCode }) => {
    try {
      const { session, gameOver } = await advanceRound(roomCode, socket.id);

      if (gameOver) {
        const history = await buildHistory(session);
        io.to(session.roomCode).emit("game_over", {
          finalMetrics: session.finalMetrics,
          roundHistory: history,
          players: session.players
        });
        return;
      }

      emitRoundState(session, "game_started");
    } catch (error) {
      emitSocketError(socket, error);
    }
  });

  // Chat message
  socket.on("send_chat", async ({ roomCode, text }) => {
    try {
      if (!text || !String(text).trim()) return;
      const session = await addChatMessage({ roomCode, socketId: socket.id, text });
      const lastMsg = session.chatMessages[session.chatMessages.length - 1];
      io.to(roomCode).emit("chat_message", lastMsg);
    } catch (error) {
      emitSocketError(socket, error);
    }
  });

  // Platform round — player submits their answer
  socket.on("submit_platform_answer", async ({ roomCode, answer, image }) => {
    try {
      const { session, bothAnswered } = await submitPlatformAnswer({ roomCode, socketId: socket.id, answer, image });
      const eventName = bothAnswered ? "platform_reveal" : "platform_answer_ready";
      emitRoundState(session, eventName);
    } catch (error) {
      emitSocketError(socket, error);
    }
  });

  // Observer rates target's honesty this round
  socket.on("submit_honesty_judgment", async ({ roomCode, verdict }) => {
    try {
      const session = await submitHonestyJudgment({ roomCode, socketId: socket.id, verdict });
      emitRoundState(session, "honesty_judged");
    } catch (error) {
      emitSocketError(socket, error);
    }
  });

  // Client-side timer expired — record it and auto-advance phase
  socket.on("timer_timeout", async ({ roomCode, phase, gaaliText }) => {
    try {
      const session = await handleTimerTimeout({ roomCode, socketId: socket.id, phase, gaaliText });
      if (!session) return;
      // Emit updated state; also emit gaali to the room so both players see it
      emitRoundState(session, "phase_advanced");
      // Broadcast the gaali assignment so the poster can show on both devices
      io.to(roomCode).emit("gaali_assigned", {
        slot: session.hostSocketId === socket.id ? "host" : "guest",
        gaaliText
      });
    } catch (error) {
      emitSocketError(socket, error);
    }
  });

  socket.on("disconnect", async () => {
    const session = await GameSession.findOne({
      status: { $ne: "COMPLETED" },
      $or: [{ hostSocketId: socket.id }, { guestSocketId: socket.id }]
    });

    if (!session) return;

    if (session.status === "LOBBY") {
      // No game in progress — clean up immediately
      clearRevealTimer(session.roomCode);
      await GameSession.deleteOne({ _id: session._id });
      return;
    }

    // Give the player 5 seconds to rejoin (handles browser refresh)
    const timer = setTimeout(async () => {
      disconnectTimers.delete(socket.id);
      // Re-fetch in case they already rejoined
      const fresh = await GameSession.findOne({
        roomCode: session.roomCode,
        status: "IN_PROGRESS"
      });
      if (!fresh) return; // session already gone
      // If neither socket ID matches the old id anymore, they rejoined — skip
      if (fresh.hostSocketId !== socket.id && fresh.guestSocketId !== socket.id) return;
      clearRevealTimer(session.roomCode);
      io.to(session.roomCode).emit("player_disconnected");
    }, 5000);

    disconnectTimers.set(socket.id, timer);
  });

  // Player refreshed the page — restore them to an active game
  socket.on("rejoin_room", async ({ roomCode, slot }) => {
    try {
      // Cancel their own pending disconnect timer if it exists
      const pending = disconnectTimers.get(socket.id);
      if (pending) {
        clearTimeout(pending);
        disconnectTimers.delete(socket.id);
      }

      const session = await rejoinSession(roomCode, slot, socket.id);
      socket.join(session.roomCode);

      const payload = buildRoundPayload(session, socket.id);
      socket.emit("round_state_resumed", payload);
    } catch (error) {
      emitSocketError(socket, error);
    }
  });
});

async function start() {
  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 60000,
    heartbeatFrequencyMS: 10000
  });
  console.log("MongoDB connected.");

  mongoose.connection.on("disconnected", () => {
    console.warn("MongoDB disconnected — attempting to reconnect…");
  });
  mongoose.connection.on("reconnected", () => {
    console.log("MongoDB reconnected.");
  });

  server.listen(port, () => {
    console.log(`Veritas server listening on http://localhost:${port}`);
  });
}

start().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
