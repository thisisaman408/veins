// Dark, uncomfortable question sets — 3 prompts per suggestion.
// These are designed to push boundaries and force real honesty.

const templates = {
  romantic: [
    {
      id: "romantic-1",
      category: "Betrayal & Doubt",
      prompts: [
        "Have you ever imagined what your life would look like if you had ended up with someone else?",
        "Is there something your partner does in bed that you have never had the courage to be honest about?",
        "If someone you were deeply attracted to made a serious move on you tomorrow — and no one would ever know — what would you actually do?"
      ]
    },
    {
      id: "romantic-2",
      category: "Power & Control",
      prompts: [
        "Do you stay in this relationship because you love them — or because you are afraid of being alone?",
        "Have you ever gone through their phone, messages, or social media without telling them?",
        "What is the one thing you have done in this relationship that you would never want them to find out about?"
      ]
    },
    {
      id: "romantic-3",
      category: "The Ugly Truth",
      prompts: [
        "If your partner gained significant weight or changed physically, would your attraction survive — honestly?",
        "Have you ever compared your partner to an ex and wished your partner was more like them?",
        "Is there a version of yourself you perform around your partner that is not who you really are?"
      ]
    }
  ],
  friends: [
    {
      id: "friends-1",
      category: "Fake Loyalty",
      prompts: [
        "Have you ever talked badly about this friend behind their back — and meant it?",
        "If this friend failed publicly, would a small part of you feel relieved or satisfied?",
        "Is there a secret you know about this friend that you have used to feel superior to them?"
      ]
    },
    {
      id: "friends-2",
      category: "Hidden Judgment",
      prompts: [
        "What is the one thing about this friend's life choices that you silently judge them for?",
        "Have you ever felt embarrassed to be associated with this friend in front of certain people?",
        "If you had to rank your friendships honestly, where would this person actually fall?"
      ]
    },
    {
      id: "friends-3",
      category: "Disposable Bonds",
      prompts: [
        "If this friend moved away tomorrow and stopped reaching out, would you actually fight to keep the connection?",
        "Have you ever stayed friends with someone only because cutting them off felt too awkward?",
        "What is the real reason you became friends with this person — and is that reason still true?"
      ]
    }
  ],
  best_friends: [
    {
      id: "best_friends-1",
      category: "Darkest Secrets",
      prompts: [
        "What is the one thing you have never told your best friend because you know it would change how they see you forever?",
        "Have you ever been jealous of your best friend's relationship, career, or life — and hated yourself for it?",
        "If your best friend asked you to be brutally honest about their biggest flaw, could you actually say it?"
      ]
    },
    {
      id: "best_friends-2",
      category: "Loyalty Under Fire",
      prompts: [
        "If your best friend's partner told you they were cheating — would you tell your friend, or protect the peace?",
        "Have you ever chosen someone else — a partner, another friend, an opportunity — over your best friend and never told them?",
        "Is there something your best friend confided in you that you have told someone else?"
      ]
    },
    {
      id: "best_friends-3",
      category: "The Real Bond",
      prompts: [
        "Do you think your best friend needs you more than you need them — or is it the other way around?",
        "If your best friend became extremely successful and you did not, would the friendship survive your ego?",
        "What is the cruelest thought you have ever had about your best friend — even for a second?"
      ]
    }
  ],
  close_friends: [
    {
      id: "close_friends-1",
      category: "Things Left Unsaid",
      prompts: [
        "What is the most painful thing you know about this person that they do not know you know?",
        "Have you ever lied to this friend to protect yourself — not them?",
        "If this friend read every thought you have ever had about them, would they still want to be close to you?"
      ]
    },
    {
      id: "close_friends-2",
      category: "Resentment & Envy",
      prompts: [
        "Is there something about this friend's life that makes you feel inadequate about your own?",
        "Have you ever felt like this friend was performing their closeness with you for an audience?",
        "What is the one boundary this friend has crossed that you never confronted them about?"
      ]
    },
    {
      id: "close_friends-3",
      category: "Breaking Point",
      prompts: [
        "What would this friend have to do for you to cut them off permanently — and how close have they come?",
        "If you found out this friend had been lying to you about something major for years, would you forgive them?",
        "Have you ever wished this friendship would just end naturally so you would not have to be the one to walk away?"
      ]
    }
  ],
  brother_sister: [
    {
      id: "brother_sister-1",
      category: "Family Wounds",
      prompts: [
        "Which parent loved you more — and do you think your sibling knows it too?",
        "Is there something you saw or heard growing up at home that you have never talked about with your sibling?",
        "Have you ever resented your sibling for the way your parents treated them differently?"
      ]
    },
    {
      id: "brother_sister-2",
      category: "Unspoken Boundaries",
      prompts: [
        "Is there something about your sibling's personal life — relationships, habits, choices — that genuinely disgusts you but you have never said?",
        "Have you ever felt protective of your sibling in a way that crossed into controlling?",
        "What is the one thing about growing up together that still makes you uncomfortable to think about?"
      ]
    },
    {
      id: "brother_sister-3",
      category: "Blood & Betrayal",
      prompts: [
        "If your sibling asked you to keep a secret from your parents that could ruin the family — would you?",
        "Have you ever used something personal your sibling told you in confidence as a weapon during a fight?",
        "If you could go back and grow up without this sibling, would any part of you consider it?"
      ]
    }
  ],
  mentor_friend: [
    {
      id: "mentor_friend-1",
      category: "Respect & Resentment",
      prompts: [
        "Have you ever resented the person who mentored you — for knowing more, having more, or being further ahead?",
        "Is there advice your mentor gave you that you publicly agreed with but privately thought was wrong or outdated?",
        "Do you look up to this person because you respect them — or because you want what they have?"
      ]
    },
    {
      id: "mentor_friend-2",
      category: "Hidden Weakness",
      prompts: [
        "What is the one failure or shame you have hidden from the person who guides you — because you could not bear their judgment?",
        "Have you ever exaggerated your progress or success to maintain their image of you?",
        "If your mentor saw the version of you that exists when no one is watching, would they still respect you?"
      ]
    },
    {
      id: "mentor_friend-3",
      category: "The Power Gap",
      prompts: [
        "Do you think your mentor truly sees you as an equal — or will you always be below them in their mind?",
        "Has your mentor ever made you feel small, and did you say anything about it?",
        "If you surpassed your mentor in every way tomorrow, would you still want them in your life?"
      ]
    }
  ],
  just_close: [
    {
      id: "just_close-1",
      category: "Tension & Desire",
      prompts: [
        "Is there a physical or emotional attraction between you two that neither of you has ever named out loud?",
        "Have you ever imagined what it would be like to be with this person — and then immediately buried the thought?",
        "What would happen if one of you confessed something deeper — would it destroy what you have or finally make it real?"
      ]
    },
    {
      id: "just_close-2",
      category: "Undefined & Dangerous",
      prompts: [
        "Are you keeping this relationship undefined on purpose — because defining it would force you to face something you are not ready for?",
        "Have you ever felt possessive over this person when they got close to someone else — even though you have no right to?",
        "What is the one thing you are most afraid this person will say to you?"
      ]
    },
    {
      id: "just_close-3",
      category: "The Real Question",
      prompts: [
        "If this person disappeared from your life tomorrow, what would hurt more — losing them, or realizing you never said what you wanted to?",
        "Is there a version of this relationship that you fantasize about but would never initiate?",
        "Do you think this person knows exactly how you feel — and is choosing to ignore it?"
      ]
    }
  ]
};

export function buildQuestionSuggestions(relationshipType, _roundNumber) {
  const bank = templates[relationshipType] ?? templates.close_friends;
  return bank;
}
