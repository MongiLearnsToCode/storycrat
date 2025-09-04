import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const heroJourneyBeats = [
  { id: 'ordinary-world', title: 'Ordinary World', description: 'Show the hero in their normal life before transformation begins.' },
  { id: 'call-to-adventure', title: 'Call to Adventure', description: 'The hero is presented with a problem or challenge.' },
  { id: 'refusal-of-call', title: 'Refusal of the Call', description: 'The hero hesitates or refuses the adventure.' },
  { id: 'meeting-mentor', title: 'Meeting the Mentor', description: 'The hero encounters a wise figure who gives advice.' },
  { id: 'crossing-threshold', title: 'Crossing the Threshold', description: 'The hero commits to the adventure and enters a new world.' },
  { id: 'tests-allies-enemies', title: 'Tests, Allies & Enemies', description: 'The hero faces challenges and makes allies and enemies.' },
  { id: 'ordeal', title: 'The Ordeal', description: 'The hero faces their greatest fear or most difficult challenge.' },
  { id: 'reward', title: 'The Reward', description: 'The hero survives and gains something from the experience.' },
  { id: 'return-with-elixir', title: 'Return with the Elixir', description: 'The hero returns home transformed.' }
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
      userId: "temp-user-id" as any, // TODO: Replace with actual user ID from auth
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
