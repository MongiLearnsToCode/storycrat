export const aiSuggestions = {
  'ordinary-world': [
    "Show your hero's daily routine to establish normalcy before change.",
    "What makes this world unique? Add specific details that ground the reader.",
    "Reveal your hero's values through their actions and choices.",
    "Establish what your hero wants vs what they need."
  ],
  'call-to-adventure': [
    "The call should disrupt your hero's ordinary world completely.",
    "Make the stakes clear - what happens if they ignore the call?",
    "Consider who or what delivers this call to adventure.",
    "Show your hero's initial reaction to this disruption."
  ],
  'refusal-of-call': [
    "What fears hold your hero back from accepting the adventure?",
    "Show the consequences of refusing through external pressure.",
    "Reveal your hero's internal conflict about the decision.",
    "What would your hero lose by staying in their comfort zone?"
  ],
  'meeting-mentor': [
    "The mentor should provide wisdom, not solve problems for the hero.",
    "What gift or knowledge does the mentor offer?",
    "Show how the mentor has walked this path before.",
    "Create a meaningful connection between mentor and hero."
  ],
  'crossing-threshold': [
    "This is the point of no return - make it feel significant.",
    "What does your hero leave behind when they cross over?",
    "Introduce the rules and dangers of this new world.",
    "Show your hero's commitment to the journey ahead."
  ],
  'tests-allies-enemies': [
    "Each test should reveal something about your hero's character.",
    "Allies should complement your hero's weaknesses.",
    "Enemies should challenge your hero's greatest strengths.",
    "Build relationships that will matter in the climax."
  ],
  'ordeal': [
    "This should be your hero's greatest fear made manifest.",
    "The hero must face this challenge alone, using what they've learned.",
    "Make the outcome uncertain - real stakes, real consequences.",
    "This moment should transform your hero fundamentally."
  ],
  'reward': [
    "The reward should be both external and internal growth.",
    "Show how your hero has changed from who they were before.",
    "The reward should come at a cost or with new responsibility.",
    "Set up the challenges that await on the return journey."
  ],
  'return-with-elixir': [
    "Your hero should return changed, with wisdom to share.",
    "Show how the ordinary world looks different to your transformed hero.",
    "The elixir should benefit others, not just the hero.",
    "Complete the character arc - show the full transformation."
  ]
}

const lastSuggestionIndexes: { [key: string]: number } = {};

export function getSuggestion(beatId: string): string {
  const suggestions = aiSuggestions[beatId as keyof typeof aiSuggestions] || [
    "Consider the emotional core of this scene.",
    "What conflict drives this moment forward?",
    "How does this advance your character's growth?",
    "What obstacles can you introduce here?"
  ];

  let lastIndex = lastSuggestionIndexes[beatId];
  if (lastIndex === undefined) {
    lastIndex = -1;
  }

  const nextIndex = (lastIndex + 1) % suggestions.length;
  lastSuggestionIndexes[beatId] = nextIndex;

  return suggestions[nextIndex];
}