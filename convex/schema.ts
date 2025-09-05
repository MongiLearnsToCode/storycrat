import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Story tables
  stories: defineTable({
    title: v.string(),
    framework: v.string(),
    beats: v.array(v.object({
      id: v.string(),
      title: v.string(),
      content: v.string(),
      completed: v.boolean(),
      description: v.string(),
    })),
    characters: v.array(v.object({
      id: v.string(),
      name: v.string(),
      role: v.string(),
      description: v.string(),
    })),
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
    lastEdited: v.number(),
    userId: v.optional(v.string()), // Optional for backward compatibility
  }),
});
