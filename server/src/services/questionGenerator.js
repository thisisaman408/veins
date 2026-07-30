// Dark, uncomfortable question sets — 3 prompts per suggestion.
// These questions are answered BY the TARGET player about THEMSELVES.
// Second-person POV only: "Have you", "Do you", "Would you", "What is the most..."
// The observer picks/edits these to ask their target — the target then answers all 3.

const templates = {
  romantic: [
    {
      id: "romantic-1",
      category: "Dark Desires",
      prompts: [
        "Have you ever been intimate with me and mentally replaced me with another person just to finish?",
        "What is the most twisted, unsettling fantasy you have never told me about?",
        "Have you ever faked enjoying something with me just to keep the peace?"
      ]
    },
    {
      id: "romantic-2",
      category: "Cold Calculus",
      prompts: [
        "Do you honestly believe I am the right person for you, or did you settle because I felt safe?",
        "Is there a core personality trait in me that repulses you — but you've never said it out loud?",
        "If I lost everything — looks, money, status — would you honestly stay with me?"
      ]
    },
    {
      id: "romantic-3",
      category: "Emotional Violence",
      prompts: [
        "Have you ever intentionally played mind games with me just to test my loyalty?",
        "What is the most devastating thing you could say to me that you have never said?",
        "Have you ever stayed with me longer than you wanted to — just to avoid being alone?"
      ]
    }
  ],
  friends: [
    {
      id: "friends-1",
      category: "Quiet Contempt",
      prompts: [
        "Have you ever listened to me vent and secretly thought I completely deserved what happened to me?",
        "What is the most pathetic thing about me that everyone sees but you've never had the guts to tell me?",
        "Have you ever felt a twisted sense of satisfaction when something bad happened to me?"
      ]
    },
    {
      id: "friends-2",
      category: "Transactional Friendship",
      prompts: [
        "If I lost all my money and status tomorrow, how long before you genuinely stopped making time for me?",
        "Have you ever used my insecurities to make yourself feel better about your own failures?",
        "Is there a flaw you deliberately hide from me because you know I would judge you ruthlessly?"
      ]
    },
    {
      id: "friends-3",
      category: "The Expendable Bond",
      prompts: [
        "What is the worst thing you have ever said about me behind my back?",
        "Have you ever smiled to my face while internally planning to pull away from me?",
        "If someone offered you a life-changing sum of money to cut me off forever, would part of you consider it?"
      ]
    }
  ],
  best_friends: [
    {
      id: "best_friends-1",
      category: "Toxic Enmeshment",
      prompts: [
        "Are you secretly terrified I am outgrowing you and will eventually replace you?",
        "Have you ever subtly sabotaged my opportunities or relationships so I wouldn't drift away from you?",
        "If you found out I was doing something deeply illegal, would you turn me in or cover for me?"
      ]
    },
    {
      id: "best_friends-2",
      category: "Hidden Resentment",
      prompts: [
        "Have you ever felt a flash of pure hatred toward me when I succeeded at something you failed at?",
        "What is one thing I get praised for that you know is completely fake — and it sickens you?",
        "If you could secretly take one thing from me — my talent, my relationships, my luck — what would it be?"
      ]
    },
    {
      id: "best_friends-3",
      category: "Unmasking",
      prompts: [
        "What is the most horrific thing I would discover if I could read your mind for just one minute?",
        "Do you honestly think I am a good person, or do you just tolerate my toxicity out of habit?",
        "What is the deepest secret I told you in confidence that you have almost let slip to someone else?"
      ]
    }
  ],
  close_friends: [
    {
      id: "close_friends-1",
      category: "Uncomfortable Truths",
      prompts: [
        "Have you ever completely lied to me during a deep emotional conversation just because you wanted it to end?",
        "What is the most embarrassing thing about yourself that you actively hide from me?",
        "Have you ever given me advice that you knew was wrong, just because the honest answer was too uncomfortable?"
      ]
    },
    {
      id: "close_friends-2",
      category: "The Jealousy Trap",
      prompts: [
        "Have you ever looked at my life and thought 'why do they get to have that — they don't even deserve it'?",
        "Have you ever pretended to be happy for my relationship while secretly hoping it would fall apart?",
        "What is one boundary I constantly cross with you that makes you quietly furious — but you always smile through it?"
      ]
    },
    {
      id: "close_friends-3",
      category: "Silent Distance",
      prompts: [
        "If I ghosted you with no explanation tomorrow, how many days before you started feeling relieved?",
        "Have you ever withheld honest advice from me because part of you wanted to watch me make the mistake?",
        "What is the most hypocritical thing you preach about but secretly fail to practice yourself around me?"
      ]
    }
  ],
  brother_sister: [
    {
      id: "brother_sister-1",
      category: "Blood & Bile",
      prompts: [
        "If we weren't related by blood, would you choose to be in my life at all?",
        "What is the most unforgivable thing I did to you growing up that you buried and never resolved?",
        "Have you ever felt our parents loved me more than you — and be honest, did that feeling ever make you act out?"
      ]
    },
    {
      id: "brother_sister-2",
      category: "Twisted Loyalty",
      prompts: [
        "If I did something truly monstrous, would you help me hide it — or be the one to expose me?",
        "Is there a secret about me you're carrying that would shatter our parents if they ever found out?",
        "Have you ever used something I confessed to you as a weapon to destroy me in an argument?"
      ]
    },
    {
      id: "brother_sister-3",
      category: "Genetic Disgust",
      prompts: [
        "What is one trait you see in me that you are terrified you might have inherited yourself?",
        "Have you ever looked at my choices and felt genuinely ashamed to share the same name?",
        "What is one memory involving me that you wish you could surgically erase from your brain?"
      ]
    }
  ],
  mentor_friend: [
    {
      id: "mentor_friend-1",
      category: "The Power Imbalance",
      prompts: [
        "Have you ever secretly believed that I am a fraud — and you could do my job better?",
        "Do you stay close to me because you respect me, or because you are extracting value from me?",
        "What is the most condescending thing I have said to you that you have never forgotten?"
      ]
    },
    {
      id: "mentor_friend-2",
      category: "Shattered Pedestals",
      prompts: [
        "If you discovered that I was doing deeply unethical things to succeed, would you expose me — or use it as leverage?",
        "Have you ever pretended to agree with my worldview purely to stay in my good graces?",
        "What is the most pathetic weakness you have seen in me since you started looking up to me?"
      ]
    },
    {
      id: "mentor_friend-3",
      category: "Subtle Sabotage",
      prompts: [
        "Have you ever deliberately withheld information from me to make me look foolish or out of touch?",
        "Do you think I actually care about your growth, or am I just keeping you useful and loyal to me?",
        "Have you ever done something for me that looked like loyalty but was actually self-serving?"
      ]
    }
  ],
  just_close: [
    {
      id: "just_close-1",
      category: "Predatory Tension",
      prompts: [
        "Have you ever manipulated a situation just to end up alone with me, quietly hoping I'd cross a line?",
        "Is there a twisted fantasy involving me that you replay in your head but would never confess?",
        "If I kissed you aggressively right now, would you push me away — or completely give in?"
      ]
    },
    {
      id: "just_close-2",
      category: "Toxic Ambiguity",
      prompts: [
        "Are you keeping me close as an emotional backup plan just in case your romantic life falls apart?",
        "Have you ever felt irrational jealousy when I mentioned someone I was dating — even though you claim there's nothing there?",
        "What is the most relationship-destroying secret you are currently keeping from me?"
      ]
    },
    {
      id: "just_close-3",
      category: "The Breaking Point",
      prompts: [
        "If I confessed I've been madly in love with you for years, would it flatter you — or creep you out?",
        "Have you ever intentionally sent me mixed signals just to see how much emotional power you hold over me?",
        "What is the one undeniable truth about us that we are both too cowardly to say out loud?"
      ]
    }
  ]
};

export function buildQuestionSuggestions(relationshipType) {
  const bank = templates[relationshipType] ?? templates.close_friends;
  return bank.map(group => ({ ...group, prompts: [...group.prompts] }));
}
