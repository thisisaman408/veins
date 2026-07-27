import GameSession from "../models/GameSession.js";
import Question from "../models/Question.js";
import { seedQuestions } from "../data/questions.js";
import { getRelationshipProfile } from "../data/relationships.js";
import {
  buildQuestionSuggestions,
  normalizeRoundQuestion
} from "./questionGenerator.js";
import {
  calculateFinalMetrics,
  calculateRoundScore,
  normalizePredictability
} from "./scoring.js";

const revealTimers = new Map();

export function generateRoomCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function serializeQuestion(question) {
  if (!question) return null;
  return {
    id: question._id ? String(question._id) : undefined,
    category: question.category,
    prompt: question.prompt,
    options: question.options,
    predictableIndexMap: question.predictableIndexMap,
    source: question.source ?? "seed"
  };
}

export async function ensureQuestionBank() {
  const existing = await Question.countDocuments();
  if (existing > 0) return;
  await Question.insertMany(seedQuestions);
}

function cleanName(name, fallback) {
  const value = String(name ?? "").trim();
  return value ? value.slice(0, 40) : fallback;
}

function addAudit(session, actor, action, details = {}) {
  session.auditLog.push({
    actorName: actor?.name,
    actorSocketId: actor?.socketId,
    action,
    details
  });
}

function addRoundAudit(round, actor, action, details = {}) {
  round.auditLog.push({
    actorName: actor?.name,
    actorSocketId: actor?.socketId,
    action,
    details
  });
}

function getPlayerBySlot(session, slot) {
  return session.players?.[slot];
}

function getSlotForSocket(session, socketId) {
  if (session.hostSocketId === socketId) return "host";
  if (session.guestSocketId === socketId) return "guest";
  return null;
}

function getRoundSlots(session, roundNumber = session.currentRound) {
  const firstTargetSlot = session.firstTargetSlot ?? "host";
  const targetSlot = (roundNumber - 1) % 2 === 0
    ? firstTargetSlot
    : firstTargetSlot === "host"
      ? "guest"
      : "host";
  return {
    targetSlot,
    observerSlot: targetSlot === "host" ? "guest" : "host"
  };
}

function buildRound(session, roundNumber) {
  const { targetSlot, observerSlot } = getRoundSlots(session, roundNumber);
  const target = getPlayerBySlot(session, targetSlot);
  const observer = getPlayerBySlot(session, observerSlot);

  return {
    phase: "QUESTION_SELECTION",
    targetSocketId: target.socketId,
    targetName: target.name,
    observerSocketId: observer.socketId,
    observerName: observer.name,
    questionAuthorSocketId: observer.socketId,
    questionAuthorName: observer.name,
    auditLog: [
      {
        actorName: "System",
        action: "round_started",
        details: {
          roundNumber,
          targetName: target.name,
          observerName: observer.name
        }
      }
    ]
  };
}

export async function createSession(hostSocketId, payload = {}) {
  await ensureQuestionBank();

  let roomCode = generateRoomCode();
  let attempts = 0;
  while (await GameSession.exists({ roomCode, status: { $ne: "COMPLETED" } })) {
    attempts += 1;
    if (attempts > 20) throw new Error("Unable to allocate a room code.");
    roomCode = generateRoomCode();
  }

  const relationship = getRelationshipProfile(payload.relationshipType);
  const host = {
    socketId: hostSocketId,
    name: cleanName(payload.playerName, "Player 1"),
    slot: "host"
  };

  const session = await GameSession.create({
    roomCode,
    hostSocketId,
    players: { host },
    relationship,
    maxRounds: Number(payload.maxRounds) || 10,
    auditLog: [
      {
        actorName: host.name,
        actorSocketId: host.socketId,
        action: "room_created",
        details: { relationship }
      }
    ]
  });

  return session;
}

export async function joinSession(roomCode, guestSocketId, payload = {}) {
  const session = await GameSession.findOne({ roomCode });
  if (!session) throw new Error("Room not found.");
  if (session.status !== "LOBBY") throw new Error("Room is already in progress.");
  if (session.guestSocketId && session.guestSocketId !== guestSocketId) {
    throw new Error("Room already has two players.");
  }

  const guest = {
    socketId: guestSocketId,
    name: cleanName(payload.playerName, "Player 2"),
    slot: "guest"
  };

  session.guestSocketId = guestSocketId;
  session.players.guest = guest;
  session.status = "IN_PROGRESS";
  session.currentRound = 1;
  session.firstTargetSlot = Math.random() >= 0.5 ? "host" : "guest";
  session.roundsData = [buildRound(session, 1)];
  addAudit(session, guest, "player_joined", {
    firstTargetName: session.roundsData[0].targetName,
    firstObserverName: session.roundsData[0].observerName
  });
  await session.save();
  return session;
}

export function buildRoundPayload(session, socketId) {
  const round = session.roundsData[session.currentRound - 1];
  if (!round) throw new Error("Round not initialized.");

  const mySlot = getSlotForSocket(session, socketId);
  const myRole = socketId === round.targetSocketId
    ? "target"
    : socketId === round.observerSocketId
      ? "observer"
      : "spectator";

  return {
    roomCode: session.roomCode,
    relationship: session.relationship,
    players: session.players,
    mySlot,
    myRole,
    currentQuestion: serializeQuestion(round.question),
    questionSuggestions: buildQuestionSuggestions(session.relationship.type, session.currentRound),
    phase: round.phase,
    roundNumber: session.currentRound,
    maxRounds: session.maxRounds,
    targetPlayer: {
      name: round.targetName,
      socketId: round.targetSocketId
    },
    observerPlayer: {
      name: round.observerName,
      socketId: round.observerSocketId
    }
  };
}

export async function submitRoundQuestion({ roomCode, socketId, question }) {
  const session = await GameSession.findOne({ roomCode });
  if (!session) throw new Error("Room not found.");
  if (session.status !== "IN_PROGRESS") throw new Error("Game is not in progress.");

  const round = session.roundsData[session.currentRound - 1];
  if (!round) throw new Error("Round not initialized.");
  if (round.observerSocketId !== socketId) throw new Error("Only the observer/asker can set this round question.");
  if (round.question) throw new Error("Question already submitted for this round.");

  const actor = { socketId, name: round.observerName };
  round.question = normalizeRoundQuestion(question);
  round.phase = "TARGET_ANSWER";
  addRoundAudit(round, actor, "question_submitted", {
    prompt: round.question.prompt,
    options: round.question.options,
    source: round.question.source
  });
  addAudit(session, actor, "question_submitted", {
    roundNumber: session.currentRound,
    prompt: round.question.prompt,
    source: round.question.source
  });
  await session.save();
  return session;
}

export async function submitTargetMove({ roomCode, socketId, optionIndex, isLie }) {
  const session = await GameSession.findOne({ roomCode });
  if (!session) throw new Error("Room not found.");
  if (session.status !== "IN_PROGRESS") throw new Error("Game is not in progress.");

  const round = session.roundsData[session.currentRound - 1];
  if (!round) throw new Error("Round not initialized.");
  if (round.targetSocketId !== socketId) throw new Error("Only the current target can submit this move.");
  if (!round.question) throw new Error("The observer must choose a question first.");
  if (round.targetChoice !== undefined) throw new Error("Target move already submitted.");
  if (optionIndex < 0 || optionIndex >= round.question.options.length) throw new Error("Invalid option.");

  const actor = { socketId, name: round.targetName };
  round.targetChoice = optionIndex;
  round.isLie = Boolean(isLie);
  round.phase = "OBSERVER_GUESS";
  addRoundAudit(round, actor, "target_answered", {
    selectedOption: round.question.options[optionIndex],
    optionIndex,
    isLie: round.isLie
  });
  addAudit(session, actor, "target_answered", {
    roundNumber: session.currentRound,
    selectedOption: round.question.options[optionIndex],
    optionIndex,
    isLie: round.isLie
  });
  await session.save();
  return session;
}

export async function submitGuestGuess({ roomCode, socketId, guessedChoice, guessedIsLie }) {
  const session = await GameSession.findOne({ roomCode });
  if (!session) throw new Error("Room not found.");
  if (session.status !== "IN_PROGRESS") throw new Error("Game is not in progress.");

  const round = session.roundsData[session.currentRound - 1];
  if (!round || round.targetChoice === undefined) throw new Error("Target has not locked in yet.");
  if (round.observerSocketId !== socketId) throw new Error("Only the current observer can submit this guess.");
  if (round.observerGuessedChoice !== undefined) throw new Error("Observer guess already submitted.");
  if (guessedChoice < 0 || guessedChoice >= round.question.options.length) throw new Error("Invalid guess.");

  const actor = { socketId, name: round.observerName };
  round.observerGuessedChoice = guessedChoice;
  round.observerGuessIsLie = Boolean(guessedIsLie);
  round.predictabilityScore = calculateRoundScore(round.question, round.targetChoice, guessedChoice);
  round.phase = "REVEAL";
  addRoundAudit(round, actor, "observer_guessed", {
    guessedOption: round.question.options[guessedChoice],
    guessedChoice,
    guessedIsLie: round.observerGuessIsLie
  });
  addAudit(session, actor, "observer_guessed", {
    roundNumber: session.currentRound,
    guessedOption: round.question.options[guessedChoice],
    guessedChoice,
    guessedIsLie: round.observerGuessIsLie
  });
  await session.save();

  return { session, question: round.question, round };
}

export async function advanceRound(roomCode, socketId) {
  const session = await GameSession.findOne({ roomCode });
  if (!session) throw new Error("Room not found.");
  if (![session.hostSocketId, session.guestSocketId].includes(socketId)) {
    throw new Error("Player is not in this room.");
  }

  const round = session.roundsData[session.currentRound - 1];
  if (!round || round.observerGuessedChoice === undefined) {
    throw new Error("Current round is not complete.");
  }

  const actor = socketId === session.hostSocketId ? session.players.host : session.players.guest;
  addAudit(session, actor, "next_round_requested", { roundNumber: session.currentRound });

  if (session.currentRound >= session.maxRounds) {
    const completed = await completeSession(session);
    return { session: completed, gameOver: true };
  }

  session.currentRound += 1;
  session.roundsData.push(buildRound(session, session.currentRound));
  await session.save();
  return { session, gameOver: false };
}

export async function completeSession(session) {
  const questionsById = new Map(
    session.roundsData
      .filter((round) => round.question)
      .map((round) => [String(round.questionId ?? round.question.prompt), round.question])
  );
  session.status = "COMPLETED";
  session.finalMetrics = calculateFinalMetrics(session.roundsData, questionsById);
  session.roundsData[session.currentRound - 1].phase = "COMPLETE";
  addAudit(session, { name: "System" }, "game_completed", {
    finalMetrics: session.finalMetrics
  });
  await session.save();
  return session;
}

export function buildRevealPayload(question, round) {
  return {
    question: serializeQuestion(question),
    targetPlayer: {
      name: round.targetName,
      socketId: round.targetSocketId
    },
    observerPlayer: {
      name: round.observerName,
      socketId: round.observerSocketId
    },
    targetChoice: round.targetChoice,
    isLie: round.isLie,
    guestChoice: round.observerGuessedChoice,
    guestIsLie: round.observerGuessIsLie,
    roundScore: round.predictabilityScore,
    normalizedRoundScore: normalizePredictability(round.predictabilityScore ?? 0),
    choiceCorrect: round.targetChoice === round.observerGuessedChoice,
    lieCorrect: round.isLie === round.observerGuessIsLie
  };
}

export async function buildHistory(session) {
  const freshSession = await GameSession.findById(session._id);
  return freshSession.roundsData
    .filter((round) => round.targetChoice !== undefined)
    .map((round, index) => ({
      roundNumber: index + 1,
      question: serializeQuestion(round.question),
      targetPlayer: {
        name: round.targetName,
        socketId: round.targetSocketId
      },
      observerPlayer: {
        name: round.observerName,
        socketId: round.observerSocketId
      },
      targetChoice: round.targetChoice,
      targetAnswer: round.question.options[round.targetChoice],
      isLie: round.isLie,
      guestChoice: round.observerGuessedChoice,
      guestAnswer: round.question.options[round.observerGuessedChoice],
      guestIsLie: round.observerGuessIsLie,
      roundScore: round.predictabilityScore,
      normalizedRoundScore: normalizePredictability(round.predictabilityScore ?? 0)
    }));
}

export function startRevealCountdown(io, roomCode, onComplete) {
  if (revealTimers.has(roomCode)) return;

  let count = 3;
  io.to(roomCode).emit("reveal_countdown", { count });
  const timer = setInterval(async () => {
    count -= 1;
    if (count > 0) {
      io.to(roomCode).emit("reveal_countdown", { count });
      return;
    }

    clearInterval(timer);
    revealTimers.delete(roomCode);
    await onComplete();
  }, 850);

  revealTimers.set(roomCode, timer);
}

export function clearRevealTimer(roomCode) {
  const timer = revealTimers.get(roomCode);
  if (timer) {
    clearInterval(timer);
    revealTimers.delete(roomCode);
  }
}
