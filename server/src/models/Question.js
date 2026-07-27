import mongoose from "mongoose";

const predictableIndexMapSchema = new mongoose.Schema(
  {
    optionIndex: { type: Number, required: true },
    safetyScore: { type: Number, min: 1, max: 10, required: true }
  },
  { _id: false }
);

const questionSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      enum: ["Desire", "Conformity", "Secrets", "Future"],
      required: true
    },
    prompt: { type: String, required: true },
    options: {
      type: [{ type: String, required: true }],
      validate: {
        validator: (options) => options.length >= 3 && options.length <= 4,
        message: "Questions must have 3 to 4 options."
      },
      required: true
    },
    predictableIndexMap: {
      type: [predictableIndexMapSchema],
      required: true
    }
  },
  { timestamps: true }
);

export default mongoose.model("Question", questionSchema);
