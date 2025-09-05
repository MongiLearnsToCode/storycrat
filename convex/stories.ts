import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const heroJourneyBeats = [
  // Act I: Departure
  { id: 'ordinary-world', title: 'The Ordinary World', description: 'Show the hero in their normal life before transformation begins.' },
  { id: 'call-to-adventure', title: 'The Call to Adventure', description: 'The hero is presented with a problem or challenge.' },
  { id: 'refusal-of-call', title: 'Refusal of the Call', description: 'The hero hesitates or refuses the adventure.' },
  { id: 'meeting-mentor', title: 'Meeting the Mentor', description: 'The hero encounters a wise figure who gives advice.' },
  { id: 'crossing-threshold', title: 'Crossing the First Threshold', description: 'The hero commits to the adventure and enters a new world.' },
  // Act II: Initiation
  { id: 'tests-allies-enemies', title: 'Tests, Allies, and Enemies', description: 'The hero faces challenges and makes allies and enemies.' },
  { id: 'approach-inmost-cave', title: 'Approach to the Inmost Cave', description: 'The hero prepares for the major challenge in the special world.' },
  { id: 'ordeal', title: 'The Ordeal', description: 'The hero faces their greatest fear or most difficult challenge.' },
  { id: 'reward', title: 'Reward (Seizing the Sword)', description: 'The hero survives and gains something from the experience.' },
  // Act III: Return
  { id: 'road-back', title: 'The Road Back', description: 'The hero begins the journey back to the ordinary world.' },
  { id: 'resurrection', title: 'The Resurrection', description: 'The hero faces a final test and is transformed.' },
  { id: 'return-with-elixir', title: 'Return with the Elixir', description: 'The hero returns home transformed with wisdom to help others.' }
];

export const getStories = query({
  handler: async (ctx) => {
    return await ctx.db.query("stories").order("desc").collect();
  },
});

export const getStory = query({
  args: { storyId: v.id("stories") },
  handler: async (ctx, { storyId }) => {
    return await ctx.db.get(storyId);
  },
});

export const createStory = mutation({
  args: { title: v.string() },
  handler: async (ctx, { title }) => {
    const now = Date.now();
    return await ctx.db.insert("stories", {
      title,
      framework: "hero-journey",
      beats: heroJourneyBeats.map(beat => ({
        ...beat,
        content: "",
        completed: false
      })),
      characters: [],
      createdAt: now,
      updatedAt: now,
      lastEdited: now,
    });
  },
});

export const updateBeatContent = mutation({
  args: { 
    storyId: v.id("stories"), 
    beatId: v.string(), 
    content: v.string() 
  },
  handler: async (ctx, { storyId, beatId, content }) => {
    const story = await ctx.db.get(storyId);
    if (!story) throw new Error("Story not found");

    const updatedBeats = story.beats.map(beat =>
      beat.id === beatId 
        ? { ...beat, content, completed: content.trim().length > 0 }
        : beat
    );

    const now = Date.now();
    await ctx.db.patch(storyId, {
      beats: updatedBeats,
      updatedAt: now,
      lastEdited: now,
    });
  },
});

export const addCharacter = mutation({
  args: {
    storyId: v.id("stories"),
    name: v.string(),
    role: v.string(),
    description: v.string(),
  },
  handler: async (ctx, { storyId, name, role, description }) => {
    const story = await ctx.db.get(storyId);
    if (!story) throw new Error("Story not found");

    const newCharacter = {
      id: crypto.randomUUID(),
      name,
      role,
      description,
    };

    const now = Date.now();
    await ctx.db.patch(storyId, {
      characters: [...story.characters, newCharacter],
      updatedAt: now,
      lastEdited: now,
    });
  },
});
