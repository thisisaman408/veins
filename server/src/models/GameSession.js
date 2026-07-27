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

const roundQuestionSchema = new mongoose.Schema(
  {
    category: { type: String, default: "Custom" },
    prompt: { type: String, required: true },
    options: [{ type: String, required: true }],
    predictableIndexMap: [
      {
        optionIndex: Number,
        safetyScore: Number
      }
    ],
    source: { type: String, enum: ["generated", "generated_edited", "custom", "seed"], default: "generated" }
  },
  { _id: false }
);

const roundSchema = new mongoose.Schema(
  {
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: "Question" },
    question: roundQuestionSchema,
    phase: {
      type: String,
      enum: ["QUESTION_SELECTION", "TARGET_ANSWER", "OBSERVER_GUESS", "REVEAL", "COMPLETE"],
      default: "QUESTION_SELECTION"
    },
    targetSocketId: String,
    targetName: String,
    observerSocketId: String,
    observerName: String,
    questionAuthorSocketId: String,
    questionAuthorName: String,
    targetChoice: Number,
    isLie: Boolean,
    observerGuessIsLie: Boolean,
    observerGuessedChoice: Number,
    predictabilityScore: Number,
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
    relationship: relationshipSchema,
    firstTargetSlot: { type: String, enum: ["host", "guest"] },
    status: {
      type: String,
      enum: ["LOBBY", "IN_PROGRESS", "COMPLETED"],
      default: "LOBBY"
    },
    currentRound: { type: Number, default: 0 },
    maxRounds: { type: Number, default: 10 },
    questionOrder: [{ type: mongoose.Schema.Types.ObjectId, ref: "Question" }],
    roundsData: [roundSchema],
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
      totalPredictabilityIndex: Number,
      archetypeLabel: String,
      dimensions: {
        conformity: Number,
        predictability: Number,
        riskTolerance: Number,
        transparency: Number,
        perceptibility: Number
      }
    }
  },
  { timestamps: true }
);

export default mongoose.model("GameSession", gameSessionSchema);
