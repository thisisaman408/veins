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
  submitRoundPrompts,
  submitTargetAnswers,
  submitObserverGuess,
  submitTargetExplanation,
  addChatMessage
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
  const configuredKey = process.env.ADMIN_KEY;
  const providedKey = req.get("x-admin-key") ?? req.query.key;

  if (!configuredKey) {
    res.status(503).json({ error: "ADMIN_KEY is not configured on the server." });
    return;
  }

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
  socket.on("submit_target_answers", async ({ roomCode, targetAnswers, lieIndex }) => {
    try {
      const session = await submitTargetAnswers({ roomCode, socketId: socket.id, targetAnswers, lieIndex: Number(lieIndex) });
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

  socket.on("disconnect", async () => {
    const session = await GameSession.findOne({
      status: { $ne: "COMPLETED" },
      $or: [{ hostSocketId: socket.id }, { guestSocketId: socket.id }]
    });

    if (!session) return;
    clearRevealTimer(session.roomCode);
    io.to(session.roomCode).emit("player_disconnected");
    if (session.status === "LOBBY") {
      await GameSession.deleteOne({ _id: session._id });
    }
  });
});

async function start() {
  await mongoose.connect(mongoUri);
  console.log("MongoDB connected.");
  server.listen(port, () => {
    console.log(`Veritas server listening on http://localhost:${port}`);
  });
}

start().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
