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
  buildRevealPayload,
  clearRevealTimer,
  createSession,
  joinSession,
  startRevealCountdown,
  submitGuestGuess,
  submitRoundQuestion,
  submitTargetMove
} from "./services/gameService.js";
import GameSession from "./models/GameSession.js";
import Question from "./models/Question.js";

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

app.get("/api/questions", async (_req, res, next) => {
  try {
    const questions = await Question.find().sort({ category: 1 });
    res.json(questions);
  } catch (error) {
    next(error);
  }
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

  socket.on("join_room", async ({ roomCode, playerName }) => {
    try {
      const normalizedRoomCode = String(roomCode ?? "").trim();
      const session = await joinSession(normalizedRoomCode, socket.id, { playerName });
      socket.join(session.roomCode);
      io.to(session.roomCode).emit("player_joined", { playersCount: 2 });
      socket.emit("joined_room", {
        roomCode: session.roomCode,
        player: session.players.guest,
        relationship: session.relationship
      });
      emitRoundState(session, "game_started");
    } catch (error) {
      emitSocketError(socket, error);
    }
  });

  socket.on("submit_round_question", async ({ roomCode, question }) => {
    try {
      const session = await submitRoundQuestion({ roomCode, socketId: socket.id, question });
      emitRoundState(session, "question_ready");
    } catch (error) {
      emitSocketError(socket, error);
    }
  });

  socket.on("submit_target_move", async ({ roomCode, optionIndex, isLie }) => {
    try {
      const session = await submitTargetMove({
        roomCode,
        socketId: socket.id,
        optionIndex: Number(optionIndex),
        isLie
      });
      emitRoundState(session, "target_submitted");
    } catch (error) {
      emitSocketError(socket, error);
    }
  });

  socket.on("submit_guest_guess", async ({ roomCode, guessedChoice, guessedIsLie }) => {
    try {
      const { session, question, round } = await submitGuestGuess({
        roomCode,
        socketId: socket.id,
        guessedChoice: Number(guessedChoice),
        guessedIsLie
      });

      startRevealCountdown(io, session.roomCode, async () => {
        io.to(session.roomCode).emit("reveal_round", buildRevealPayload(question, round));
      });
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
          players: session.players,
          relationship: session.relationship
        });
        return;
      }

      emitRoundState(session, "game_started");
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
