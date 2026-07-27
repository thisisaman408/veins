import dotenv from "dotenv";
import mongoose from "mongoose";
import Question from "./models/Question.js";
import { seedQuestions } from "./data/questions.js";

dotenv.config();

const mongoUri = process.env.MONGO_URI ?? "mongodb://127.0.0.1:27017/veritas";

async function seed() {
  await mongoose.connect(mongoUri);
  await Question.deleteMany({});
  await Question.insertMany(seedQuestions);
  console.log(`Seeded ${seedQuestions.length} Veritas questions.`);
  await mongoose.disconnect();
}

seed().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
