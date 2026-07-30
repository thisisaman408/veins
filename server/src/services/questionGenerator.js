// Dark, weird, uncomfortable question sets — 3 prompts per suggestion.
// All questions are in 2nd person POV — directed AT the target player.
// The {target} placeholder is ONLY used when it makes natural sense as context
// (e.g. "If the other person could see..."), otherwise questions use "you/your".

const templates = {
  romantic: [
    {
      id: "romantic-1",
      category: "Dark Desires",
      prompts: [
        "If you were guaranteed your partner would never find out, is there a twisted fantasy you'd fulfill with a total stranger tonight?",
        "Have you ever been intimate with someone and mentally replaced them with another person just to finish?",
        "What is the most unsettling thing you secretly wish your partner would do to you behind closed doors — something you've never told them?"
      ]
    },
    {
      id: "romantic-2",
      category: "Cold Calculus",
      prompts: [
        "If your partner suffered a horrible accident and lost their physical attractiveness permanently, would you secretly resent them for trapping you?",
        "Is there a core personality trait in your partner that completely repulses you, but you swallow it just to keep the peace?",
        "Do you truly believe your partner is your absolute equal, or do you secretly feel you settled because they felt 'safe'?"
      ]
    },
    {
      id: "romantic-3",
      category: "Emotional Violence",
      prompts: [
        "What is the most devastating, soul-crushing secret you could use to destroy someone you love in a single sentence?",
        "Have you ever intentionally played mind games with your partner just to test their loyalty or see them squirm?",
        "If you could completely erase your current relationship from your timeline and start fresh with no consequences, would a tiny part of you say yes?"
      ]
    }
  ],
  friends: [
    {
      id: "friends-1",
      category: "Quiet Contempt",
      prompts: [
        "Have you ever listened to a friend complain about their life and secretly thought 'you completely deserve this'?",
        "If someone you know was publicly humiliated in front of everyone, would you feel a twisted sense of satisfaction?",
        "What is the single most pathetic thing about someone close to you that everyone else sees but no one has the guts to say?"
      ]
    },
    {
      id: "friends-2",
      category: "Transactional Friendship",
      prompts: [
        "If a close friend lost all their money, status, and connections tomorrow, how fast would you actually stop hanging out with them?",
        "Have you ever secretly used a friend's insecurities to make yourself feel better about your own failures?",
        "Is there a specific flaw of yours that you deliberately hide from your closest friends because you know they would judge you ruthlessly?"
      ]
    },
    {
      id: "friends-3",
      category: "The Expendable Bond",
      prompts: [
        "If someone offered you a life-changing amount of money to never speak to your best friend again, would you take it without hesitation?",
        "Have you ever smiled to a friend's face while mentally plotting how to distance yourself from them?",
        "What is the absolute worst thing you have ever said about a close friend behind their back?"
      ]
    }
  ],
  best_friends: [
    {
      id: "best_friends-1",
      category: "Toxic Enmeshment",
      prompts: [
        "Are you secretly terrified that your best friend is outgrowing you and will eventually replace you with someone better?",
        "Have you ever subtly sabotaged one of your best friend's relationships or opportunities just so they wouldn't drift away from you?",
        "If you found out your best friend was doing something highly illegal and immoral, would you turn them in or become their accomplice?"
      ]
    },
    {
      id: "best_friends-2",
      category: "Hidden Resentment",
      prompts: [
        "What is one thing your best friend gets praised for that absolutely sickens you because you know it's completely fake?",
        "Have you ever felt a brief flash of pure hatred toward your best friend when they succeeded at something you failed at?",
        "If you could secretly steal one thing from your best friend's life — their partner, their talent, their wealth — what would you take?"
      ]
    },
    {
      id: "best_friends-3",
      category: "Unmasking",
      prompts: [
        "If your best friend could read your mind for exactly one minute, what is the most horrific thing they would discover about how you truly view them?",
        "Do you honestly think your best friend is a good person, or do you just tolerate their toxicity because you're too used to it?",
        "What is the deepest, darkest secret someone ever told you that you have almost let slip to someone else?"
      ]
    }
  ],
  close_friends: [
    {
      id: "close_friends-1",
      category: "Uncomfortable Truths",
      prompts: [
        "What is the most embarrassing habit someone close to you has that makes you want to cringe inside but you never say anything?",
        "Have you ever completely lied to a close friend during a deep emotional moment just because you wanted the conversation to end?",
        "If a close friend asked you to honestly rate their physical attractiveness out of 10, what number would you say — and what number would actually break their heart?"
      ]
    },
    {
      id: "close_friends-2",
      category: "The Jealousy Trap",
      prompts: [
        "Have you ever looked at someone close to you and thought 'why do they get to have that when they don't even deserve it'?",
        "If a close friend started dating your ex, would you pretend to be okay with it while secretly wishing their relationship would implode?",
        "What is one boundary someone close to you constantly crosses that makes you furious inside, even though you always smile through it?"
      ]
    },
    {
      id: "close_friends-3",
      category: "Silent Distance",
      prompts: [
        "If a close friend ghosted you tomorrow with zero explanation, how many days would it take before you genuinely felt relieved instead of sad?",
        "Have you ever withheld crucial advice from a friend because you subconsciously wanted to watch them make a mistake?",
        "What is the most hypocritical thing someone you care about preaches about, but completely fails to practice themselves?"
      ]
    }
  ],
  brother_sister: [
    {
      id: "brother_sister-1",
      category: "Blood & Bile",
      prompts: [
        "If your sibling wasn't related to you by blood, is there any universe where you would willingly choose to be friends with them?",
        "What is the most unforgivable thing your sibling did to you growing up that you have permanently buried but never truly forgiven?",
        "Do you secretly believe your parents love you more than your sibling — and be honest, do you enjoy that?"
      ]
    },
    {
      id: "brother_sister-2",
      category: "Twisted Loyalty",
      prompts: [
        "If your sibling did something monstrous — like assault or fraud — would you help them hide it, or would you be the one to report them?",
        "Is there a dark family secret you share with your sibling that would completely shatter your parents if they ever found out?",
        "Have you ever used something deeply personal your sibling confessed to you as a weapon to destroy them in an argument?"
      ]
    },
    {
      id: "brother_sister-3",
      category: "Genetic Disgust",
      prompts: [
        "What is one personality trait your sibling has that you are absolutely terrified you might also have?",
        "Have you ever looked at your sibling's life choices and felt deeply ashamed to share the same family with them?",
        "If you could surgically remove one memory involving your sibling from your brain, what horrific moment would you erase?"
      ]
    }
  ],
  mentor_friend: [
    {
      id: "mentor_friend-1",
      category: "The Power Imbalance",
      prompts: [
        "Have you ever secretly thought that the person mentoring you is a total fraud and you could do their job better?",
        "What is the most condescending thing someone you respect has ever said to you that made you want to ruin their reputation?",
        "Do you stay close to certain people because you genuinely respect them, or are you purely using them as a stepping stone?"
      ]
    },
    {
      id: "mentor_friend-2",
      category: "Shattered Pedestals",
      prompts: [
        "If you discovered someone you look up to was secretly engaging in deeply unethical behavior to get ahead, would you expose them or blackmail them?",
        "Have you ever pretended to agree with someone's completely outdated worldview just to stay in their good graces?",
        "What is the most pathetic weakness you have observed in someone you admire that completely shattered your respect for them?"
      ]
    },
    {
      id: "mentor_friend-3",
      category: "Subtle Sabotage",
      prompts: [
        "If you had the power to instantly take everything someone you know has built and make it your own, would you hesitate?",
        "Have you ever purposely withheld information from someone just to make them look foolish or out of touch?",
        "Do the people guiding you actually care about your growth, or are they grooming you to stay loyal and useful to them?"
      ]
    }
  ],
  just_close: [
    {
      id: "just_close-1",
      category: "Predatory Tension",
      prompts: [
        "Is there a twisted, intensely sexual fantasy involving someone in your life that you replay in your head but would never confess?",
        "Have you ever purposely manipulated a situation to be alone with someone, quietly hoping they would finally cross the line?",
        "If someone you consider 'just a friend' aggressively kissed you right now, would you push them away or give in completely?"
      ]
    },
    {
      id: "just_close-2",
      category: "Toxic Ambiguity",
      prompts: [
        "Are you keeping someone around as an emotional backup plan just in case your actual romantic life completely falls apart?",
        "Have you ever felt a surge of irrational jealousy when a 'just a friend' mentioned someone they were dating, even though you claim there's nothing there?",
        "What is the most damaging, relationship-destroying secret you are keeping from someone who trusts you completely?"
      ]
    },
    {
      id: "just_close-3",
      category: "The Breaking Point",
      prompts: [
        "If someone you're close to confessed they've been madly in love with you for years, would it flatter you or completely creep you out?",
        "Have you ever intentionally sent someone mixed signals just to see how much power you hold over their emotions?",
        "What is one undeniable truth about an important relationship in your life that you are both too cowardly to admit out loud?"
      ]
    }
  ]
};

export function buildQuestionSuggestions(relationshipType, targetName) {
  const bank = templates[relationshipType] ?? templates.close_friends;
  // Questions are already in 2nd person — no replacement needed.
  // targetName kept as param for backwards compatibility.
  return bank.map(group => ({ ...group, prompts: [...group.prompts] }));
}
