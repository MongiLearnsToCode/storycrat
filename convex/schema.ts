import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  stories: defineTable({
    title: v.string(),
    framework: v.string(),
    beats: v.array(v.object({
      id: v.string(),
      title: v.string(),
      description: v.string(),
      content: v.string(),
      completed: v.boolean(),
    })),
    characters: v.array(v.object({
      id: v.string(),
      name: v.string(),
      role: v.string(),
      description: v.string(),
    })),
    lastEdited: v.number(),
  }),
});
