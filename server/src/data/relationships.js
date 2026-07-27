export const relationshipProfiles = {
  romantic: {
    type: "romantic",
    label: "BF/GF or partners",
    description: "You are emotionally close, but some answers can create friction fast."
  },
  friends: {
    type: "friends",
    label: "Friends",
    description: "You know each other casually, so the read depends on habits more than history."
  },
  close_friends: {
    type: "close_friends",
    label: "Close friends",
    description: "You know each other very well, which makes wrong guesses more interesting."
  },
  siblings: {
    type: "siblings",
    label: "Brother/sister/siblings",
    description: "You share history, but you may hesitate to reveal a few personal things."
  },
  mentor_friend: {
    type: "mentor_friend",
    label: "Mentor and friend",
    description: "There is trust, but respect and image-management can affect honesty."
  },
  just_close: {
    type: "just_close",
    label: "Just close to each other",
    description: "You have a bond, but the boundaries are still not fully defined."
  }
};

export function getRelationshipProfile(type) {
  return relationshipProfiles[type] ?? relationshipProfiles.close_friends;
}
