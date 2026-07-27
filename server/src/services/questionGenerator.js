// Each suggestion is now a SET of 3 prompts for the observer to ask.
// The observer can edit them or type their own.

const templates = {
  romantic: [
    {
      id: "romantic-1",
      category: "Intimacy & Distance",
      prompts: [
        "What would make you quietly start pulling away in this relationship?",
        "When do you feel the loneliest — even when we are together?",
        "What is the one thing you want from me that you have never said directly?"
      ]
    },
    {
      id: "romantic-2",
      category: "Fears & Honesty",
      prompts: [
        "What truth about yourself would be hardest to say to a partner?",
        "Is there something you have been avoiding because you are scared of the answer?",
        "What is the one thing you are still unsure about in this relationship?"
      ]
    },
    {
      id: "romantic-3",
      category: "Future & Commitment",
      prompts: [
        "If I asked for a serious commitment tomorrow, what would your honest gut say?",
        "What part of a future together excites you — and what quietly worries you?",
        "If this relationship ended, what is the one thing you would regret not saying?"
      ]
    }
  ],
  friends: [
    {
      id: "friends-1",
      category: "Honesty & Loyalty",
      prompts: [
        "If I made an embarrassing mistake in public, what would you actually do?",
        "Have you ever held something back from me to avoid conflict?",
        "What is the one thing you think about me but never say?"
      ]
    },
    {
      id: "friends-2",
      category: "Drift & Connection",
      prompts: [
        "If this friendship started fading, would you say something — or let it go?",
        "Is there something that changed between us that we have never talked about?",
        "What would it take for you to consider us truly close, not just friends?"
      ]
    },
    {
      id: "friends-3",
      category: "Secrets & Trust",
      prompts: [
        "If I told you something big about myself, would you keep it — or tell someone?",
        "What is something you have shared with others that you never told me?",
        "What part of your life would you hide even from a good friend?"
      ]
    }
  ],
  close_friends: [
    {
      id: "close_friends-1",
      category: "Hidden Things",
      prompts: [
        "What part of your life would you still hide from me, even as a close friend?",
        "Is there a version of you that I have never seen — and do you want me to?",
        "What have I got wrong about you that you have never corrected?"
      ]
    },
    {
      id: "close_friends-2",
      category: "Conflict & Feedback",
      prompts: [
        "If I called you out honestly right now, what would your first reaction be?",
        "Have you ever been annoyed at me and said nothing? What was it?",
        "What is something I do that bothers you but you have never mentioned?"
      ]
    },
    {
      id: "close_friends-3",
      category: "What You Need",
      prompts: [
        "What do you want most from this friendship right now — and are you getting it?",
        "Is there something you have needed from me that you have never asked for?",
        "What would make you feel like I truly understand you?"
      ]
    }
  ],
  siblings: [
    {
      id: "siblings-1",
      category: "Family & Secrets",
      prompts: [
        "What would you least want me to know about you — as a sibling?",
        "Is there something from our family life you have never fully processed?",
        "What is a decision you made that you know I would question?"
      ]
    },
    {
      id: "siblings-2",
      category: "Family Dynamics",
      prompts: [
        "When family drama starts, what is your real role — and what do you wish it was?",
        "Is there something unfair in our family dynamic you have never said out loud?",
        "What is the one thing you have always wanted to say to me but held back?"
      ]
    },
    {
      id: "siblings-3",
      category: "Crisis & Support",
      prompts: [
        "If I was in a serious crisis tomorrow, what would you actually do?",
        "What would make you feel like you could really ask me for help?",
        "Is there a time I let you down that we have never talked about?"
      ]
    }
  ],
  mentor_friend: [
    {
      id: "mentor_friend-1",
      category: "Guidance & Doubt",
      prompts: [
        "If I gave you advice you completely disagreed with, what would you actually do?",
        "Is there something you have pretended to agree with me about to avoid conflict?",
        "What is the most uncertain you have ever felt after talking to me?"
      ]
    },
    {
      id: "mentor_friend-2",
      category: "Honesty & Image",
      prompts: [
        "What would be hardest to admit to someone who looks up to you?",
        "Is there something about yourself you have hidden from me to manage how I see you?",
        "When do you feel most unsure of yourself — even if you never show it?"
      ]
    },
    {
      id: "mentor_friend-3",
      category: "Opportunity & Growth",
      prompts: [
        "If I opened a real door for you, what would your honest first instinct be?",
        "Is there advice I gave you that you ignored — and later regretted?",
        "What is something you want from this relationship that you have not asked for?"
      ]
    }
  ],
  just_close: [
    {
      id: "just_close-1",
      category: "Clarity & Expectations",
      prompts: [
        "What would help you understand what we actually are to each other?",
        "Is there something you have been avoiding saying because you are not sure how I will react?",
        "What do you actually expect from me — that you have never said?"
      ]
    },
    {
      id: "just_close-2",
      category: "Feelings & Uncertainty",
      prompts: [
        "What are you most likely to hide from me right now?",
        "Is there a feeling you have had around me that you have kept to yourself?",
        "What would make this connection feel more real or defined to you?"
      ]
    },
    {
      id: "just_close-3",
      category: "What Comes Next",
      prompts: [
        "If this connection became something more, what would you actually want?",
        "What would make you pull back — even if things are going well?",
        "Is there something you want to say to me that you keep stopping yourself from saying?"
      ]
    }
  ]
};

export function buildQuestionSuggestions(relationshipType, _roundNumber) {
  const bank = templates[relationshipType] ?? templates.close_friends;
  return bank;
}
