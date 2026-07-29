// Dark, weird, uncomfortable question sets — 3 prompts per suggestion.
// These are designed to push boundaries, break comfort zones, and force real honesty.
// The {target} placeholder will be dynamically replaced with the target player's actual name.

const templates = {
  romantic: [
    {
      id: "romantic-1",
      category: "Dark Desires",
      prompts: [
        "If you were guaranteed that {target} would never find out, is there an exotic or twisted fantasy you'd fulfill with a total stranger tonight?",
        "Have you ever looked at {target} while being intimate and mentally pretended they were someone else to finish?",
        "What is the most unsettling, slightly terrifying thing you secretly wish {target} would do to you behind closed doors?"
      ]
    },
    {
      id: "romantic-2",
      category: "Cold Calculus",
      prompts: [
        "If {target} suffered a horrible accident and lost their physical attractiveness permanently, would you secretly resent them for trapping you?",
        "Is there a core personality trait in {target} that completely repulses you, but you swallow it just to keep the peace?",
        "Do you truly believe {target} is your absolute equal, or do you secretly feel you settled for them because they felt 'safe'?"
      ]
    },
    {
      id: "romantic-3",
      category: "Emotional Violence",
      prompts: [
        "What is the most devastating, soul-crushing secret you could use to completely destroy {target}'s self-esteem in a single sentence?",
        "Have you ever intentionally played mind games with {target} just to test their loyalty or see them squirm?",
        "If you could completely erase {target} from your timeline and start fresh with no consequences, would a tiny part of your brain say 'yes'?"
      ]
    }
  ],
  friends: [
    {
      id: "friends-1",
      category: "Quiet Contempt",
      prompts: [
        "Have you ever listened to {target} complain about their life and secretly thought, 'You completely deserve this'?",
        "If {target} was publicly humiliated in front of everyone you know, would you feel a twisted sense of satisfaction?",
        "What is the single most pathetic thing about {target} that everyone else sees, but no one has the guts to tell them?"
      ]
    },
    {
      id: "friends-2",
      category: "Transactional Friendship",
      prompts: [
        "If {target} lost all their money, status, and connections tomorrow, how fast would you actually stop hanging out with them?",
        "Have you ever secretly used {target}'s insecurities to make yourself feel better about your own failures?",
        "Is there a specific flaw of yours that you deliberately hide from {target} because you know they would judge you ruthlessly?"
      ]
    },
    {
      id: "friends-3",
      category: "The Expendable Bond",
      prompts: [
        "If someone offered you a life-changing amount of money to never speak to {target} again, would you take it without hesitation?",
        "Have you ever smiled to {target}'s face while mentally plotting how to distance yourself from them?",
        "What is the absolute worst thing you have ever said about {target} behind their back to another friend?"
      ]
    }
  ],
  best_friends: [
    {
      id: "best_friends-1",
      category: "Toxic Enmeshment",
      prompts: [
        "Are you secretly terrified that {target} is outgrowing you and will eventually replace you with someone better?",
        "Have you ever subtly sabotaged one of {target}'s relationships or opportunities just so they wouldn't drift away from you?",
        "If you found out {target} was doing something highly illegal and immoral, would you turn them in or become their accomplice?"
      ]
    },
    {
      id: "best_friends-2",
      category: "Hidden Resentment",
      prompts: [
        "What is the one thing {target} gets praised for that absolutely sickens you because you know it's completely fake?",
        "Have you ever felt a brief flash of pure hatred toward {target} when they succeeded at something you failed at?",
        "If you could steal one singular thing from {target}'s life—their partner, their talent, their wealth—what would you take?"
      ]
    },
    {
      id: "best_friends-3",
      category: "Unmasking",
      prompts: [
        "If {target} could read your mind for exactly one minute, what is the most horrific thing they would discover about how you view them?",
        "Do you honestly think {target} is a good person, or do you just tolerate their toxicity because you are used to it?",
        "What is the absolute deepest, darkest secret {target} ever told you that you have almost let slip to someone else?"
      ]
    }
  ],
  close_friends: [
    {
      id: "close_friends-1",
      category: "Uncomfortable Truths",
      prompts: [
        "What is the most embarrassing, cringe-inducing habit {target} has that makes you want to crawl out of your skin?",
        "Have you ever completely lied to {target} during a deep emotional moment just because you wanted the conversation to end?",
        "If {target} asked you to objectively rate their physical attractiveness on a scale of 1 to 10, what number would actually break their heart?"
      ]
    },
    {
      id: "close_friends-2",
      category: "The Jealousy Trap",
      prompts: [
        "Have you ever looked at {target}'s life and thought, 'Why do they get to have that when they don't even deserve it'?",
        "If {target} started dating your ex, would you pretend to be okay with it while secretly wishing their relationship would burn to the ground?",
        "What is the one boundary {target} constantly crosses that makes you violently angry inside, even though you smile through it?"
      ]
    },
    {
      id: "close_friends-3",
      category: "Silent Distance",
      prompts: [
        "If {target} ghosted you tomorrow, how many days would it take before you genuinely felt relieved instead of sad?",
        "Have you ever withheld crucial advice from {target} because you subconsciously wanted to watch them make a mistake?",
        "What is the most hypocritical thing {target} preaches about but completely fails to practice?"
      ]
    }
  ],
  brother_sister: [
    {
      id: "brother_sister-1",
      category: "Blood & Bile",
      prompts: [
        "If {target} wasn't related to you by blood, is there any universe where you would willingly choose to be friends with them?",
        "What is the most unforgivable, traumatic thing {target} did to you growing up that you have permanently buried?",
        "Do you secretly believe your parents love you more than {target}, and do you enjoy rubbing that in?"
      ]
    },
    {
      id: "brother_sister-2",
      category: "Twisted Loyalty",
      prompts: [
        "If {target} did something monstrous—like murder or assault—would you help them hide the evidence, or would you be the one to call the cops?",
        "Is there a twisted, dark family secret you and {target} share that would completely destroy your parents if they knew?",
        "Have you ever used a deeply personal vulnerability {target} confessed to you as a weapon to destroy them in an argument?"
      ]
    },
    {
      id: "brother_sister-3",
      category: "Genetic Disgust",
      prompts: [
        "What is the one personality trait {target} inherited from your parents that absolutely disgusts you?",
        "Have you ever looked at {target}'s life choices and felt deeply ashamed to share the same last name as them?",
        "If you could surgically remove one memory involving {target} from your brain, what horrific moment would it be?"
      ]
    }
  ],
  mentor_friend: [
    {
      id: "mentor_friend-1",
      category: "The Power Imbalance",
      prompts: [
        "Have you ever secretly thought that {target}'s expertise is actually a total fraud and you could do their job better?",
        "What is the most condescending, arrogant thing {target} has ever said to you that made you want to ruin their reputation?",
        "Do you stick around {target} because you genuinely respect them, or are you just using them as a stepping stone to extract value?"
      ]
    },
    {
      id: "mentor_friend-2",
      category: "Shattered Pedestals",
      prompts: [
        "If you discovered {target} was secretly engaging in highly unethical behavior to get ahead, would you expose them or blackmail them?",
        "Have you ever pretended to agree with {target}'s completely outdated worldview just to stay in their good graces?",
        "What is the most pathetic weakness you have observed in {target} that completely shattered your respect for them?"
      ]
    },
    {
      id: "mentor_friend-3",
      category: "Subtle Sabotage",
      prompts: [
        "If you had the power to instantly take everything {target} has built and make it your own, would you hesitate?",
        "Have you ever purposely withheld information from {target} just to make them look foolish or out of touch?",
        "Does {target} actually care about your growth, or are they just grooming you to be a miniature, submissive version of themselves?"
      ]
    }
  ],
  just_close: [
    {
      id: "just_close-1",
      category: "Predatory Tension",
      prompts: [
        "Is there a deeply twisted, intensely sexual fantasy involving {target} that you replay in your head but would never confess?",
        "Have you ever purposely manipulated a situation so that you and {target} would be alone, hoping they would finally cross the line?",
        "If {target} aggressively pinned you against a wall right now and kissed you, would you push them away or give in completely?"
      ]
    },
    {
      id: "just_close-2",
      category: "Toxic Ambiguity",
      prompts: [
        "Are you keeping {target} around as an emotional backup plan just in case your actual romantic life completely fails?",
        "Have you ever felt a psychotic surge of jealousy when {target} mentions someone they are dating, even though you claim you are 'just close'?",
        "What is the absolute most damaging, relationship-destroying secret you are keeping from {target} right now?"
      ]
    },
    {
      id: "just_close-3",
      category: "The Breaking Point",
      prompts: [
        "If {target} confessed that they have been madly, obsessively in love with you for years, would it flatter your ego or completely creep you out?",
        "Have you ever intentionally sent {target} mixed signals just to see how much power you hold over their emotions?",
        "What is the one undeniable truth about your connection with {target} that you are both too cowardly to admit out loud?"
      ]
    }
  ]
};

export function buildQuestionSuggestions(relationshipType, targetName) {
  const bank = templates[relationshipType] ?? templates.close_friends;
  const safeTarget = targetName || "this person";
  
  // Clone the bank and replace {target} with the actual target's name
  return bank.map(group => ({
    ...group,
    prompts: group.prompts.map(prompt => prompt.replace(/\{target\}/g, safeTarget))
  }));
}
