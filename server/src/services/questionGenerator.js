const defaultSafetyScores = [9, 6, 3, 1];

const templates = {
  romantic: [
    {
      category: "Desire",
      prompt: "What would make you quietly distance yourself in this relationship?",
      options: [
        "Feeling emotionally ignored for too long.",
        "Repeated small lies that never get addressed.",
        "Boredom that I do not know how to admit.",
        "Finding attention somewhere else and liking it."
      ]
    },
    {
      category: "Secrets",
      prompt: "Which truth would be hardest for you to say directly to your partner?",
      options: [
        "I need more reassurance than I admit.",
        "I sometimes compare this relationship to others.",
        "I avoid conflict because I fear the answer.",
        "I have imagined leaving without warning."
      ]
    },
    {
      category: "Future",
      prompt: "If your partner wanted a serious commitment tomorrow, your honest instinct would be:",
      options: [
        "Say yes if the timing is practical.",
        "Ask for more time and a clearer plan.",
        "Feel trapped even if I love them.",
        "Test the relationship by pulling away first."
      ]
    }
  ],
  friends: [
    {
      category: "Conformity",
      prompt: "If this friend made an embarrassing mistake in public, you would:",
      options: [
        "Help them recover without making it a big deal.",
        "Joke lightly so the moment passes.",
        "Pretend I did not notice.",
        "Bring it up later because it was too funny."
      ]
    },
    {
      category: "Secrets",
      prompt: "If this friend told you a secret that changed how you see them, you would:",
      options: [
        "Keep it and treat them the same.",
        "Ask careful follow-up questions.",
        "Need time before acting normal again.",
        "Tell one trusted person to process it."
      ]
    },
    {
      category: "Future",
      prompt: "If this friendship started fading, your most likely move is:",
      options: [
        "Send a direct check-in.",
        "Wait and see if they notice too.",
        "Accept it as natural drift.",
        "Disappear first so it feels like my choice."
      ]
    }
  ],
  close_friends: [
    {
      category: "Secrets",
      prompt: "What part of your life would you still hide from a very close friend?",
      options: [
        "Private family issues.",
        "Romantic doubts.",
        "Money or career insecurity.",
        "The version of me they would judge."
      ]
    },
    {
      category: "Conformity",
      prompt: "If your close friend called you out honestly, your first reaction would be:",
      options: [
        "Listen because they usually know me.",
        "Defend myself, then think about it later.",
        "Make a joke to escape the moment.",
        "Attack their weak point back."
      ]
    },
    {
      category: "Desire",
      prompt: "What do you most want from this friendship right now?",
      options: [
        "Consistency and normal support.",
        "More emotional honesty.",
        "Space without guilt.",
        "Proof they choose me over others."
      ]
    }
  ],
  siblings: [
    {
      category: "Secrets",
      prompt: "What would you least want your sibling to know about you?",
      options: [
        "How much family pressure affects me.",
        "A choice I know they would question.",
        "How jealous I have felt before.",
        "A boundary I pretend does not exist."
      ]
    },
    {
      category: "Conformity",
      prompt: "When family drama starts, your natural role is:",
      options: [
        "Keep peace and reduce damage.",
        "Stay neutral until it affects me.",
        "Say the uncomfortable truth.",
        "Use chaos to finally say everything."
      ]
    },
    {
      category: "Future",
      prompt: "If your sibling needed help during a crisis, you would:",
      options: [
        "Show up immediately.",
        "Help, but set strict limits.",
        "Offer advice before action.",
        "Wait to see if someone else handles it."
      ]
    }
  ],
  mentor_friend: [
    {
      category: "Conformity",
      prompt: "If your mentor-friend gave advice you disagreed with, you would:",
      options: [
        "Respectfully challenge it.",
        "Thank them and decide privately.",
        "Follow it because they know more.",
        "Reject it sharply to prove independence."
      ]
    },
    {
      category: "Secrets",
      prompt: "What would be hardest to admit to someone who mentors you?",
      options: [
        "I am more uncertain than I look.",
        "I ignored advice and it went badly.",
        "I want approval more than I admit.",
        "I resent being guided sometimes."
      ]
    },
    {
      category: "Future",
      prompt: "If this person opened a door for you, your instinct would be:",
      options: [
        "Use it responsibly and stay grateful.",
        "Ask what expectations come with it.",
        "Wonder if I deserve it.",
        "Take it and detach from the relationship."
      ]
    }
  ],
  just_close: [
    {
      category: "Desire",
      prompt: "What would clarify this bond for you the fastest?",
      options: [
        "A direct conversation about expectations.",
        "More consistent behavior over time.",
        "Seeing how they act when jealous.",
        "Creating distance and watching their reaction."
      ]
    },
    {
      category: "Secrets",
      prompt: "What are you most likely to avoid saying to this person?",
      options: [
        "How much their attention affects me.",
        "What I actually expect from them.",
        "That I am unsure what we are.",
        "That I am keeping other options open."
      ]
    },
    {
      category: "Future",
      prompt: "If this connection became more serious, you would:",
      options: [
        "Move slowly and define it clearly.",
        "Let it happen naturally.",
        "Pull back to test the pressure.",
        "Deny wanting it until they say it first."
      ]
    }
  ]
};

export function buildQuestionSuggestions(relationshipType, roundNumber) {
  const bank = templates[relationshipType] ?? templates.close_friends;
  return bank.map((item, suggestionIndex) => ({
    id: `${relationshipType}-${roundNumber}-${suggestionIndex}`,
    category: item.category,
    prompt: item.prompt,
    options: item.options,
    predictableIndexMap: item.options.map((_option, optionIndex) => ({
      optionIndex,
      safetyScore: defaultSafetyScores[optionIndex] ?? 5
    })),
    source: "generated"
  }));
}

export function normalizeRoundQuestion(input) {
  const prompt = String(input?.prompt ?? "").trim();
  const options = (input?.options ?? [])
    .map((option) => String(option ?? "").trim())
    .filter(Boolean)
    .slice(0, 4);

  if (!prompt) throw new Error("Question prompt is required.");
  if (options.length < 3) throw new Error("A round question needs at least three answer options.");

  return {
    category: String(input?.category ?? "Custom").trim() || "Custom",
    prompt,
    options,
    predictableIndexMap: options.map((_option, optionIndex) => ({
      optionIndex,
      safetyScore: Number(input?.predictableIndexMap?.[optionIndex]?.safetyScore ?? defaultSafetyScores[optionIndex] ?? 5)
    })),
    source: ["generated", "generated_edited"].includes(input?.source) ? input.source : "custom"
  };
}
