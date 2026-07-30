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
        "Have you ever been intimate with someone and mentally replaced them with another person just to finish?",
        "What is the most twisted, unsettling fantasy you have never told your partner about?",
        "Have you ever faked enjoying something in a relationship just to keep the peace?"
      ]
    },
    {
      id: "romantic-2",
      category: "Cold Calculus",
      prompts: [
        "Do you honestly believe you are with the right person, or did you settle because they felt safe?",
        "Is there a core personality trait in your partner that repulses you — but you've never said it out loud?",
        "If your partner lost everything — looks, money, status — would you honestly stay?"
      ]
    },
    {
      id: "romantic-3",
      category: "Emotional Violence",
      prompts: [
        "Have you ever intentionally played mind games with someone you loved just to test their loyalty?",
        "What is the most devastating thing you could say to your partner that you have never said?",
        "Have you ever stayed in a relationship longer than you wanted to — just to avoid being alone?"
      ]
    }
  ],
  friends: [
    {
      id: "friends-1",
      category: "Quiet Contempt",
      prompts: [
        "Have you ever listened to a friend vent and secretly thought they completely deserved what happened to them?",
        "What is the most pathetic thing about a close friend that everyone sees but you've never had the guts to say?",
        "Have you ever felt a twisted sense of satisfaction when something bad happened to someone you were supposedly happy for?"
      ]
    },
    {
      id: "friends-2",
      category: "Transactional Friendship",
      prompts: [
        "If your closest friend lost all their money and status tomorrow, how long before you genuinely stopped making time for them?",
        "Have you ever used a friend's insecurity to make yourself feel better about your own failures?",
        "Is there a flaw you deliberately hide from certain friends because you know they would judge you ruthlessly?"
      ]
    },
    {
      id: "friends-3",
      category: "The Expendable Bond",
      prompts: [
        "What is the worst thing you have ever said about a close friend behind their back?",
        "Have you ever smiled to a friend's face while internally planning to pull away from them?",
        "If someone offered you a life-changing sum of money to cut off your closest friend forever, would part of you consider it?"
      ]
    }
  ],
  best_friends: [
    {
      id: "best_friends-1",
      category: "Toxic Enmeshment",
      prompts: [
        "Are you secretly terrified your best friend is outgrowing you and will eventually replace you?",
        "Have you ever subtly sabotaged a friend's opportunity or relationship so they wouldn't drift away from you?",
        "If you found out your best friend was doing something deeply illegal, would you turn them in or cover for them?"
      ]
    },
    {
      id: "best_friends-2",
      category: "Hidden Resentment",
      prompts: [
        "Have you ever felt a flash of pure hatred toward your best friend when they succeeded at something you failed at?",
        "What is one thing your best friend gets praised for that you know is completely fake — and it sickens you?",
        "If you could secretly take one thing from someone you love — their talent, their relationship, their luck — what would it be?"
      ]
    },
    {
      id: "best_friends-3",
      category: "Unmasking",
      prompts: [
        "What is the most horrific thing your best friend would discover if they could read your mind for just one minute?",
        "Do you honestly think your best friend is a good person, or do you just tolerate their toxicity out of habit?",
        "What is the deepest secret someone told you in confidence that you have almost let slip to someone else?"
      ]
    }
  ],
  close_friends: [
    {
      id: "close_friends-1",
      category: "Uncomfortable Truths",
      prompts: [
        "Have you ever completely lied to someone during a deep emotional conversation just because you wanted it to end?",
        "What is the most embarrassing thing about yourself that you actively hide from people close to you?",
        "Have you ever given advice to a friend that you knew was wrong, just because the honest answer was too uncomfortable?"
      ]
    },
    {
      id: "close_friends-2",
      category: "The Jealousy Trap",
      prompts: [
        "Have you ever looked at someone's life and thought 'why do they get to have that — they don't even deserve it'?",
        "Have you ever pretended to be happy for a friend's relationship while secretly hoping it would fall apart?",
        "What is one boundary someone constantly crosses with you that makes you quietly furious — but you always smile through it?"
      ]
    },
    {
      id: "close_friends-3",
      category: "Silent Distance",
      prompts: [
        "If a close friend ghosted you with no explanation tomorrow, how many days before you started feeling relieved?",
        "Have you ever withheld honest advice from someone you care about because part of you wanted to watch them make the mistake?",
        "What is the most hypocritical thing you preach about but secretly fail to practice yourself?"
      ]
    }
  ],
  brother_sister: [
    {
      id: "brother_sister-1",
      category: "Blood & Bile",
      prompts: [
        "If your sibling wasn't related to you by blood, would you choose to be in their life at all?",
        "What is the most unforgivable thing a family member did to you growing up that you buried and never resolved?",
        "Have you ever felt your parents loved another sibling more than you — and be honest, did that feeling ever make you act out?"
      ]
    },
    {
      id: "brother_sister-2",
      category: "Twisted Loyalty",
      prompts: [
        "If your sibling did something truly monstrous, would you help them hide it — or be the one to expose them?",
        "Is there a family secret you're carrying that would shatter your parents if they ever found out?",
        "Have you ever used something your sibling confessed to you as a weapon to destroy them in an argument?"
      ]
    },
    {
      id: "brother_sister-3",
      category: "Genetic Disgust",
      prompts: [
        "What is one trait you see in your family that you are terrified you might have inherited yourself?",
        "Have you ever looked at a family member's choices and felt genuinely ashamed to share the same name?",
        "What is one memory involving a family member that you wish you could surgically erase from your brain?"
      ]
    }
  ],
  mentor_friend: [
    {
      id: "mentor_friend-1",
      category: "The Power Imbalance",
      prompts: [
        "Have you ever secretly believed that someone mentoring you was a fraud — and you could do their job better?",
        "Do you stay close to certain people because you respect them, or because you are extracting value from them?",
        "What is the most condescending thing someone you look up to said to you that you have never forgotten?"
      ]
    },
    {
      id: "mentor_friend-2",
      category: "Shattered Pedestals",
      prompts: [
        "If you discovered that someone you admire was doing deeply unethical things to succeed, would you expose them — or use it as leverage?",
        "Have you ever pretended to agree with someone's worldview purely to stay in their good graces?",
        "What is the most pathetic weakness you have seen in someone you once put on a pedestal?"
      ]
    },
    {
      id: "mentor_friend-3",
      category: "Subtle Sabotage",
      prompts: [
        "Have you ever deliberately withheld information from someone to make them look foolish or out of touch?",
        "Do the people guiding you actually care about your growth, or are they keeping you useful and loyal to them?",
        "Have you ever done something that looked like loyalty but was actually self-serving?"
      ]
    }
  ],
  just_close: [
    {
      id: "just_close-1",
      category: "Predatory Tension",
      prompts: [
        "Have you ever manipulated a situation just to end up alone with someone, quietly hoping they'd cross a line?",
        "Is there a twisted fantasy involving someone in your life that you replay in your head but would never confess?",
        "If someone you consider 'just a friend' kissed you aggressively right now, would you push them away — or completely give in?"
      ]
    },
    {
      id: "just_close-2",
      category: "Toxic Ambiguity",
      prompts: [
        "Are you keeping someone close as an emotional backup plan just in case your romantic life falls apart?",
        "Have you ever felt irrational jealousy when a 'just a friend' mentioned someone they were dating — even though you claim there's nothing there?",
        "What is the most relationship-destroying secret you are currently keeping from someone who trusts you completely?"
      ]
    },
    {
      id: "just_close-3",
      category: "The Breaking Point",
      prompts: [
        "If someone you're close to confessed they've been madly in love with you for years, would it flatter you — or creep you out?",
        "Have you ever intentionally sent mixed signals to someone just to see how much emotional power you hold over them?",
        "What is the one undeniable truth about an important relationship in your life that you are both too cowardly to say out loud?"
      ]
    }
  ]
};

export function buildQuestionSuggestions(relationshipType) {
  const bank = templates[relationshipType] ?? templates.close_friends;
  return bank.map(group => ({ ...group, prompts: [...group.prompts] }));
}
