import Groq from "groq-sdk";

// ─── Fallback bank ────────────────────────────────────────────────────────────
// 60 dark, uncomfortably personal platform questions — all in 2nd person POV.
// No caste / race / gender / body content — purely psychological & relational.
const FALLBACK_BANK = [
  "What is one emotion you constantly fake around me?",
  "What is the most selfish thing you have ever done to me that I never found out about?",
  "What is a belief you hold about our relationship that you are ashamed to admit?",
  "When did I last genuinely disappoint you, and what triggered it?",
  "What is something you told me you forgave me for, but actually haven't?",
  "What is the worst lie you have ever told me?",
  "Are you only maintaining your closeness with me out of guilt or habit?",
  "What part of yourself do you feel the most ashamed to show me?",
  "What is something you want desperately from me but would never admit?",
  "Have you ever let me take the blame for something that was your fault?",
  "What is a personal failure you have never told me about?",
  "What is the most jealous you have ever been of me?",
  "What is a compliment you give me that you do not genuinely mean?",
  "If I could read your real thoughts about me, what would surprise me most?",
  "What is something you deeply regret doing to me that I never found out?",
  "What is the most cowardly thing you have ever done in our relationship?",
  "Have you ever manipulated me into doing what you wanted while pretending it was my idea?",
  "What is one thing you judge me for that you secretly also do?",
  "What is the harshest truth about me that you actively avoid bringing up?",
  "When did you last betray my trust, even in a small way?",
  "What is a part of your personality that you deliberately hide from me?",
  "What would you do to me if you found out no one was watching and there were zero consequences?",
  "Have you ever envied my life while pretending to be genuinely happy for me?",
  "What is the most hurtful thing you have ever said about me behind my back?",
  "What is one thing you have convinced yourself is okay to do to me that you know deep down is not?",
  "What is your biggest fear about who I might actually be as a person?",
  "Have you ever felt secretly relieved when something bad happened to me?",
  "What is a conversation with me you have been avoiding for months?",
  "What is one thing you have lied to yourself about regarding our relationship?",
  "What would you change about me if you could do it without me noticing?",
  "Have you ever walked away from me when I needed you because it was simply easier for you?",
  "What is the most unfair thing you have ever done to me?",
  "What is a moment where you chose your own comfort over being there for me?",
  "Have you ever stayed silent when speaking up could have helped me?",
  "What is the most dishonest impression you have deliberately given me?",
  "What is something you told yourself you would never do to me that you have already done?",
  "What is one resentment you are carrying against me that you pretend you have let go of?",
  "If I saw every thought you had about me today, what would damage our relationship most?",
  "What is the most significant lie you have told me through omission?",
  "Have you ever cared about me less than I cared about you, and let me believe otherwise?",
  "What is the cruelest thought you have ever had about me?",
  "What is one thing you are doing right now that you know will hurt me eventually?",
  "What is a boundary of mine you pretend to respect but actually resent?",
  "What is something you have always blamed me for that was actually your fault?",
  "What is the most dishonest version of yourself that you let me see and never correct?",
  "What is an apology you owe me that you have convinced yourself you don't?",
  "What do you know about yourself that makes you feel genuinely unworthy of my time?",
  "What is a secret you are keeping that, if I knew, would change how I see you forever?",
  "What is one thing you deeply admire in me that you suspect you will never achieve yourself?",
  "Have you ever punished me for something that was not actually my fault?",
  "What is the most honest thing you would say to me if there were absolutely no consequences?"
];

const usedFallbackIds = new Set();

export function getFallbackDarkQuestion() {
  // Reset if we've used them all
  if (usedFallbackIds.size >= FALLBACK_BANK.length) usedFallbackIds.clear();
  const available = FALLBACK_BANK.filter((_, i) => !usedFallbackIds.has(i));
  const idx = Math.floor(Math.random() * available.length);
  const originalIdx = FALLBACK_BANK.indexOf(available[idx]);
  usedFallbackIds.add(originalIdx);
  return FALLBACK_BANK[originalIdx];
}

// ─── Groq generator ───────────────────────────────────────────────────────────
let groqClient = null;

function getGroqClient() {
  if (!groqClient && process.env.GROQ_API_KEY) {
    groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return groqClient;
}

/**
 * Generate a dark platform question using Groq.
 * Context: { relationshipType, roundNumber, pastTopics: string[] }
 * Falls back to the static bank if Groq is unavailable or slow (>2s).
 */
export async function generateDarkQuestion(context = {}) {
  const groq = getGroqClient();
  if (!groq) return getFallbackDarkQuestion();

  const { relationshipType = "close_friends", pastTopics = [] } = context;
  const topicsStr = pastTopics.slice(-3).join(", ") || "none";

  const prompt = `You are writing a brutally honest, psychologically uncomfortable question for a party truth game between two ${relationshipType.replace(/_/g, " ")} people.

Recent topics already covered: ${topicsStr}.

Write exactly ONE question. This question is being asked BY one player TO the other player about their relationship.
It MUST use "I" and "you" / "me" and "you". 
Examples of the tone and format:
- "Never have I ever lied to you about..."
- "Do you honestly think I am..."
- "Have you ever secretly resented me for..."
- "If I ghosted you tomorrow..."

Rules:
- Be deeply uncomfortable and personal but not offensive (no caste, race, religion, body shaming)
- Make the person think hard about how they view the person asking the question
- Be completely different from the recent topics
- NEVER mention a person's name
- Be a single sentence only — no explanations, no context, no numbering

Respond with only the question text.`;


  try {
    const raceResult = await Promise.race([
      groq.chat.completions.create({
        model: "llama3-8b-8192",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 80,
        temperature: 0.9,
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 2000)),
    ]);

    const text = raceResult.choices?.[0]?.message?.content?.trim();
    if (text && text.length > 10) return text;
    return getFallbackDarkQuestion();
  } catch {
    return getFallbackDarkQuestion();
  }
}
