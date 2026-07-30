import Groq from "groq-sdk";

// ─── Fallback bank ────────────────────────────────────────────────────────────
// 60 dark, uncomfortably personal platform questions.
// No caste / race / gender / body content — purely psychological & relational.
const FALLBACK_BANK = [
  "What is one emotion you constantly fake around the people closest to you?",
  "What is the most selfish thing you have ever done that nobody found out about?",
  "What is a belief you hold that you are ashamed to admit in public?",
  "When did you last genuinely cry, and what triggered it?",
  "What is something you have forgiven someone for, but actually haven't?",
  "What is the worst lie you have ever told someone who trusted you completely?",
  "What is a relationship in your life that you are only maintaining out of guilt?",
  "What part of yourself do you feel the most ashamed of?",
  "What is something you want desperately but would never admit you want?",
  "Have you ever let someone take blame for something that was your fault?",
  "What is a personal failure you have never told anyone about?",
  "What is the most jealous you have ever been of someone you claimed to support?",
  "What is a compliment you give that you do not genuinely mean?",
  "If your closest friend could read your real thoughts about them, what would surprise them most?",
  "What is something you deeply regret doing to someone who never found out?",
  "What is the most cowardly thing you have ever done?",
  "Have you ever manipulated someone into doing what you wanted while pretending it was their idea?",
  "What is a personal limit you claim to have that you would absolutely break given the right circumstances?",
  "What is one thing you judge other people for that you secretly also do?",
  "What is the harshest truth about yourself that you avoid thinking about?",
  "When did you last betray someone's trust, even in a small way?",
  "What is a part of your personality that you deliberately hide from almost everyone?",
  "What would you do if you found out no one was watching and there were zero consequences?",
  "What is the most you have ever envied someone's life while pretending to be happy for them?",
  "What personal trait have you never been able to fix, even though you know you should?",
  "What is the most hurtful thing you have ever said, and did you mean it at the time?",
  "What is one thing you have convinced yourself is okay that you know is not?",
  "Who is one person you have wronged and never apologized to?",
  "What is your biggest fear about who you might actually be as a person?",
  "Have you ever felt relieved when something bad happened to someone you dislike?",
  "What is a conversation you have been avoiding for months or years?",
  "What is one thing you have lied to yourself about so consistently you almost believe it?",
  "What would you change about yourself if you could do it without anyone noticing?",
  "What is a habit you have that you would be embarrassed for people to know about?",
  "Have you ever walked away from someone who needed you, because it was easier?",
  "What is the most unfair thing you have ever done to someone who cared about you?",
  "What is one version of yourself that you are afraid you might actually be?",
  "What is a moment where you chose comfort over doing the right thing?",
  "Have you ever stayed silent when speaking up could have helped someone?",
  "What is the most dishonest impression you have ever deliberately created about yourself?",
  "What is one relationship dynamic in your life that you know is unhealthy, but you keep it anyway?",
  "What is something you told yourself you would never do that you have already done?",
  "What is the most uncomfortable truth you know about yourself that you rarely face?",
  "What is one resentment you are carrying that you pretend you have let go of?",
  "If the most important person in your life saw every thought you had today, what would damage your relationship most?",
  "What is a pain from your past that still controls your present behaviour?",
  "What is the most significant lie you have told through omission?",
  "Have you ever loved someone less than they loved you, and let them believe otherwise?",
  "What is the cruelest thought you have had about someone you care about?",
  "What is one thing you are doing right now in your life that you know you will regret?",
  "What is a boundary you pretend to respect but actually resent?",
  "What is something you have always blamed others for that was actually your fault?",
  "What is the most dishonest version of yourself that others see and you do not correct?",
  "What is an apology you owe someone that you have convinced yourself you don't?",
  "What do you know about yourself that makes you feel genuinely unworthy of being loved?",
  "What is a secret you are keeping that, if revealed, would change how someone sees you?",
  "What is one thing you deeply admire in others that you suspect you will never achieve?",
  "What is the most meaningless thing you have sacrificed something real for?",
  "Have you ever punished someone for something that was not actually their fault?",
  "What is the most honest thing you would say about yourself if there were absolutely no consequences?",
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

Write exactly ONE question. It must:
- Be uncomfortable and personal but not offensive (no caste, race, religion, body shaming)
- Make both players think deeply about themselves or their relationship
- Be completely different from the recent topics
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
