import GameSession from "../models/GameSession.js";
import { getRelationshipProfile } from "../data/relationships.js";
import { buildQuestionSuggestions } from "./questionGenerator.js";

const revealTimers = new Map();

export function generateRoomCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
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

// Get the relationship that THIS player chose (private to them)
function getMyRelationship(session, socketId) {
  const slot = getSlotForSocket(session, socketId);
  if (slot === "host") return session.hostRelationship;
  if (slot === "guest") return session.guestRelationship;
  return session.hostRelationship; // fallback
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
    prompts: [],
    targetAnswers: [],
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
  let roomCode = generateRoomCode();
  let attempts = 0;
  while (await GameSession.exists({ roomCode, status: { $ne: "COMPLETED" } })) {
    attempts += 1;
    if (attempts > 20) throw new Error("Unable to allocate a room code.");
    roomCode = generateRoomCode();
  }

  const hostRelationship = getRelationshipProfile(payload.relationshipType);
  const host = {
    socketId: hostSocketId,
    name: cleanName(payload.playerName, "Player 1"),
    slot: "host"
  };

  const session = await GameSession.create({
    roomCode,
    hostSocketId,
    players: { host },
    hostRelationship,
    maxRounds: Number(payload.maxRounds) || 10,
    finalMetrics: { roundsWon: 0, roundsLost: 0 },
    chatMessages: [],
    auditLog: [
      {
        actorName: host.name,
        actorSocketId: host.socketId,
        action: "room_created",
        details: { hostRelationship }
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

  const guestRelationship = getRelationshipProfile(payload.relationshipType);

  session.guestSocketId = guestSocketId;
  session.players.guest = guest;
  session.guestRelationship = guestRelationship;
  session.status = "IN_PROGRESS";
  session.currentRound = 1;
  session.firstTargetSlot = Math.random() >= 0.5 ? "host" : "guest";
  session.roundsData = [buildRound(session, 1)];
  addAudit(session, guest, "player_joined", {
    guestRelationship,
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

  // Each player only sees THEIR OWN relationship choice
  const myRelationship = getMyRelationship(session, socketId);

  // Question suggestions are based on the OBSERVER's own relationship type
  const observerRelationship = getMyRelationship(session, round.observerSocketId);

  return {
    roomCode: session.roomCode,
    myRelationship,
    players: session.players,
    mySlot,
    myRole,
    prompts: round.prompts,
    targetAnswers: round.targetAnswers,
    lieIndex: round.lieIndex,
    observerGuessedLieIndex: round.observerGuessedLieIndex,
    targetExplanation: round.targetExplanation,
    questionSuggestions: buildQuestionSuggestions(observerRelationship?.type ?? "close_friends", round.targetName),
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
    },
    chatMessages: session.chatMessages,
    finalMetrics: session.finalMetrics
  };
}

export async function submitRoundPrompts({ roomCode, socketId, prompts }) {
  const session = await GameSession.findOne({ roomCode });
  if (!session) throw new Error("Room not found.");
  if (session.status !== "IN_PROGRESS") throw new Error("Game is not in progress.");

  const round = session.roundsData[session.currentRound - 1];
  if (!round) throw new Error("Round not initialized.");
  if (round.observerSocketId !== socketId) throw new Error("Only the observer/asker can set the prompts.");
  if (round.prompts && round.prompts.length > 0) throw new Error("Prompts already submitted for this round.");
  if (!Array.isArray(prompts) || prompts.length !== 3) throw new Error("Must submit exactly 3 prompts.");

  const actor = { socketId, name: round.observerName };
  round.prompts = prompts.map(p => String(p).trim());
  round.phase = "TARGET_ANSWER";
  
  addRoundAudit(round, actor, "prompts_submitted", { prompts: round.prompts });
  addAudit(session, actor, "prompts_submitted", { roundNumber: session.currentRound, prompts: round.prompts });
  
  await session.save();
  return session;
}

export async function submitTargetAnswers({ roomCode, socketId, targetAnswers, lieIndex }) {
  const session = await GameSession.findOne({ roomCode });
  if (!session) throw new Error("Room not found.");
  if (session.status !== "IN_PROGRESS") throw new Error("Game is not in progress.");

  const round = session.roundsData[session.currentRound - 1];
  if (!round) throw new Error("Round not initialized.");
  if (round.targetSocketId !== socketId) throw new Error("Only the current target can submit answers.");
  if (!round.prompts || round.prompts.length === 0) throw new Error("The observer must choose questions first.");
  if (round.targetAnswers && round.targetAnswers.length > 0) throw new Error("Target answers already submitted.");
  if (!Array.isArray(targetAnswers) || targetAnswers.length !== 3) throw new Error("Must submit exactly 3 answers.");
  if (lieIndex < 0 || lieIndex > 2) throw new Error("Invalid lie index.");

  const actor = { socketId, name: round.targetName };
  round.targetAnswers = targetAnswers.map(a => String(a).trim());
  round.lieIndex = lieIndex;
  round.phase = "OBSERVER_GUESS";
  
  addRoundAudit(round, actor, "target_answered", { targetAnswers: round.targetAnswers, lieIndex });
  addAudit(session, actor, "target_answered", { roundNumber: session.currentRound, lieIndex });
  
  await session.save();
  return session;
}

export async function submitObserverGuess({ roomCode, socketId, guessedLieIndex }) {
  const session = await GameSession.findOne({ roomCode });
  if (!session) throw new Error("Room not found.");
  if (session.status !== "IN_PROGRESS") throw new Error("Game is not in progress.");

  const round = session.roundsData[session.currentRound - 1];
  if (!round || !round.targetAnswers || round.targetAnswers.length === 0) throw new Error("Target has not locked in yet.");
  if (round.observerSocketId !== socketId) throw new Error("Only the current observer can submit this guess.");
  if (round.observerGuessedLieIndex !== undefined) throw new Error("Observer guess already submitted.");
  if (guessedLieIndex < 0 || guessedLieIndex > 2) throw new Error("Invalid guess.");

  const actor = { socketId, name: round.observerName };
  round.observerGuessedLieIndex = guessedLieIndex;
  
  const isCorrect = guessedLieIndex === round.lieIndex;
  if (!session.finalMetrics) session.finalMetrics = { roundsWon: 0, roundsLost: 0 };
  if (isCorrect) {
    session.finalMetrics.roundsWon += 1;
    round.phase = "TARGET_EXPLANATION";
  } else {
    session.finalMetrics.roundsLost += 1;
    round.phase = "REVEAL";
  }

  addRoundAudit(round, actor, "observer_guessed", { guessedLieIndex, isCorrect });
  addAudit(session, actor, "observer_guessed", { roundNumber: session.currentRound, guessedLieIndex, isCorrect });
  
  await session.save();
  return { session, round };
}

export async function submitTargetExplanation({ roomCode, socketId, explanation }) {
  const session = await GameSession.findOne({ roomCode });
  if (!session) throw new Error("Room not found.");
  if (session.status !== "IN_PROGRESS") throw new Error("Game is not in progress.");

  const round = session.roundsData[session.currentRound - 1];
  if (!round) throw new Error("Round not initialized.");
  if (round.targetSocketId !== socketId) throw new Error("Only the current target can submit the explanation.");
  if (round.phase !== "TARGET_EXPLANATION") throw new Error("Not in explanation phase.");
  if (round.targetExplanation !== undefined) throw new Error("Explanation already submitted.");

  const actor = { socketId, name: round.targetName };
  round.targetExplanation = String(explanation).trim();
  round.phase = "REVEAL";
  
  addRoundAudit(round, actor, "target_explained", { explanation: round.targetExplanation });
  addAudit(session, actor, "target_explained", { roundNumber: session.currentRound });
  
  await session.save();
  return { session, round };
}

export async function advanceRound(roomCode, socketId) {
  const session = await GameSession.findOne({ roomCode });
  if (!session) throw new Error("Room not found.");
  if (![session.hostSocketId, session.guestSocketId].includes(socketId)) {
    throw new Error("Player is not in this room.");
  }

  const round = session.roundsData[session.currentRound - 1];
  if (!round || round.observerGuessedLieIndex === undefined) {
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
  session.status = "COMPLETED";
  session.roundsData[session.currentRound - 1].phase = "COMPLETE";
  // Clear chat on game end
  session.chatMessages = [];
  addAudit(session, { name: "System" }, "game_completed", {
    finalMetrics: session.finalMetrics
  });
  await session.save();
  return session;
}

export async function buildHistory(session) {
  const freshSession = await GameSession.findById(session._id);
  return freshSession.roundsData
    .filter((round) => round.targetAnswers && round.targetAnswers.length > 0)
    .map((round, index) => ({
      roundNumber: index + 1,
      prompts: round.prompts,
      targetPlayer: {
        name: round.targetName,
        socketId: round.targetSocketId
      },
      observerPlayer: {
        name: round.observerName,
        socketId: round.observerSocketId
      },
      targetAnswers: round.targetAnswers,
      lieIndex: round.lieIndex,
      observerGuessedLieIndex: round.observerGuessedLieIndex,
      targetExplanation: round.targetExplanation,
      isCorrect: round.lieIndex === round.observerGuessedLieIndex
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

export async function addChatMessage({ roomCode, socketId, text }) {
  const session = await GameSession.findOne({ roomCode });
  if (!session) throw new Error("Room not found.");
  
  const senderName = session.hostSocketId === socketId ? session.players.host.name : session.players.guest.name;
  session.chatMessages.push({ senderName, text: String(text).trim(), at: new Date() });
  
  if (session.chatMessages.length > 100) {
    session.chatMessages.shift();
  }
  
  await session.save();
  return session;
}
