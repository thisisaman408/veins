export const relationshipProfiles = {
  romantic: {
    type: "romantic",
    label: "BF/GF or partners",
    description: "Emotionally and physically close. The stakes are high, and one wrong truth can start a fire."
  },
  friends: {
    type: "friends",
    label: "Friends",
    description: "You think you know them. But everyone hides something from the people they eat lunch with."
  },
  best_friends: {
    type: "best_friends",
    label: "Best friends",
    description: "You know their darkest side — or you think you do. Best friends keep the sharpest secrets."
  },
  close_friends: {
    type: "close_friends",
    label: "Close friends",
    description: "Close enough to hurt each other. Close enough to know exactly where to push."
  },
  brother_sister: {
    type: "brother_sister",
    label: "Brother & Sister",
    description: "Blood ties, shared walls, unspoken boundaries. Some things siblings never say — until now."
  },
  mentor_friend: {
    type: "mentor_friend",
    label: "Mentor and friend",
    description: "Respect, hierarchy, and the things you hide from the person you look up to."
  },
  just_close: {
    type: "just_close",
    label: "Just close to each other",
    description: "Undefined. Intense. You don't know where the line is — and that's the point."
  }
};

export function getRelationshipProfile(type) {
  return relationshipProfiles[type] ?? relationshipProfiles.close_friends;
}
