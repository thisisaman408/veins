import mongoose from "mongoose";

const playerSchema = new mongoose.Schema(
  {
    socketId: String,
    name: { type: String, default: "Unnamed" },
    slot: { type: String, enum: ["host", "guest"], required: true }
  },
  { _id: false }
);

const relationshipSchema = new mongoose.Schema(
  {
    type: { type: String, default: "close_friends" },
    label: { type: String, default: "Close friends" },
    description: { type: String, default: "You know each other well, but some answers can still surprise you." }
  },
  { _id: false }
);

const roundSchema = new mongoose.Schema(
  {
    prompts: [{ type: String }],
    phase: {
      type: String,
      enum: [
        "QUESTION_SELECTION",
        "TARGET_ANSWER",
        "OBSERVER_GUESS",
        "REVEAL",
        "TARGET_EXPLANATION",
        "COMPLETE",
        // Platform round phases
        "PLATFORM_WAIT",
        "PLATFORM_REVEAL"
      ],
      default: "QUESTION_SELECTION"
    },
    targetSocketId: String,
    targetName: String,
    observerSocketId: String,
    observerName: String,
    questionAuthorSocketId: String,
    questionAuthorName: String,
    targetAnswers: [{ type: String }],
    targetAnswerImages: [{ type: String }], // Array of base64 images
    lieIndex: Number,
    observerGuessedLieIndex: Number,
    targetExplanation: String,
    // Platform round fields
    isPlatformRound: { type: Boolean, default: false },
    platformQuestion: String,
    platformAnswers: {
      host: { type: String, default: null },
      guest: { type: String, default: null }
    },
    platformAnswerImages: {
      host: { type: String, default: null },
      guest: { type: String, default: null }
    },
    // Timer expiry tracking
    timedOutSlots: [{ type: String }],
    gaaaliAssignments: {
      host: { type: String, default: null },
      guest: { type: String, default: null }
    },
    // Observer's honesty verdict on the target this round
    honestyJudgment: {
      verdict: { type: String, enum: ["honest", "sus"], default: null },
      judgedBy: { type: String, default: null }
    },
    auditLog: [
      {
        at: { type: Date, default: Date.now },
        actorName: String,
        actorSocketId: String,
        action: String,
        details: mongoose.Schema.Types.Mixed
      }
    ]
  },
  { _id: false }
);

const gameSessionSchema = new mongoose.Schema(
  {
    roomCode: { type: String, unique: true, required: true },
    hostSocketId: String,
    guestSocketId: String,
    players: {
      host: playerSchema,
      guest: playerSchema
    },
    // Each player picks privately — the other never sees it
    hostRelationship: relationshipSchema,
    guestRelationship: relationshipSchema,
    firstTargetSlot: { type: String, enum: ["host", "guest"] },
    status: {
      type: String,
      enum: ["LOBBY", "IN_PROGRESS", "COMPLETED"],
      default: "LOBBY"
    },
    currentRound: { type: Number, default: 0 },
    maxRounds: { type: Number, default: 10 },
    roundsData: [roundSchema],
    doodles: [{
      playerName: String,
      image: String,
      phase: String,
      at: { type: Date, default: Date.now }
    }],
    chatMessages: [
      {
        senderName: String,
        text: String,
        at: { type: Date, default: Date.now }
      }
    ],
    auditLog: [
      {
        at: { type: Date, default: Date.now },
        actorName: String,
        actorSocketId: String,
        action: String,
        details: mongoose.Schema.Types.Mixed
      }
    ],
    finalMetrics: {
      roundsWon: Number,
      roundsLost: Number
    }
  },
  { timestamps: true }
);

export default mongoose.model("GameSession", gameSessionSchema);
