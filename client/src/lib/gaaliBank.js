// Friendly roast nicknames awarded when a phase timer expires.
// Zero caste / race / religion / body content — purely behaviour-based.
export const GAALI_BANK = [
  { text: "Certified Keyboard Molasses", emoji: "🐌" },
  { text: "Professional Ghost Writer", emoji: "✍️" },
  { text: "Legendary Overthought Machine", emoji: "🧠" },
  { text: "World-Class Overthinker", emoji: "💭" },
  { text: "Panic Typist Extraordinaire", emoji: "⌨️" },
  { text: "The Human 'I'll Tell You Later'", emoji: "📬" },
  { text: "Royal Procrastinator", emoji: "👑" },
  { text: "Supreme Avoider of Answers", emoji: "🦅" },
  { text: "Grand Master of Wasting Time", emoji: "⏳" },
  { text: "Official Slow-Motion Champion", emoji: "🐢" },
  { text: "PhD in Saying Nothing", emoji: "🎓" },
  { text: "Captain of Lost Thoughts", emoji: "🚢" },
  { text: "The Walking Ellipsis...", emoji: "💬" },
  { text: "First-Class Daydreamer", emoji: "☁️" },
  { text: "Certified Can't-Make-Up-Their-Mind", emoji: "🪄" },
  { text: "Deluxe Edition of a Blank Page", emoji: "📄" },
  { text: "Ambassador of Unfinished Thoughts", emoji: "🏛️" },
  { text: "Official Sponsor of Awkward Silence", emoji: "🔇" },
  { text: "Director of Doing Absolutely Nothing", emoji: "🎬" },
  { text: "Master of the Dramatic Pause", emoji: "🎭" },
  { text: "Supreme Being of Indecision", emoji: "⚖️" },
  { text: "National Treasure of Confusion", emoji: "🗺️" },
  { text: "Professionally Late to the Point", emoji: "🕰️" },
  { text: "World's Slowest Answer Provider", emoji: "🐇" },
  { text: "Emperor of Unnecessary Delays", emoji: "👘" },
  { text: "The Living Buffering Symbol", emoji: "⏳" },
  { text: "Registered Expert in Nothing", emoji: "📋" },
  { text: "Hall of Fame Distractor", emoji: "🏆" },
  { text: "Certified Anxiety Architect", emoji: "🏗️" },
  { text: "Professional Blank-Starer", emoji: "👁️" },
];

export function getRandomGaali() {
  return GAALI_BANK[Math.floor(Math.random() * GAALI_BANK.length)];
}
