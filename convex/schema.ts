import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Auth tables
  user: defineTable({
    email: v.string(),
    emailVerified: v.optional(v.boolean()),
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_email", ["email"]),

  session: defineTable({
    userId: v.id("user"),
    expiresAt: v.number(),
    token: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_token", ["token"]).index("by_user", ["userId"]),

  account: defineTable({
    userId: v.id("user"),
    providerId: v.string(),
    accountId: v.string(),
    password: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_provider_account", ["providerId", "accountId"]).index("by_user", ["userId"]),

  // Story tables
  stories: defineTable({
    title: v.string(),
    userId: v.id("user"),
    framework: v.string(),
    beats: v.array(v.object({
      id: v.string(),
      title: v.string(),
      content: v.string(),
      completed: v.boolean(),
    })),
    characters: v.array(v.object({
      id: v.string(),
      name: v.string(),
      role: v.string(),
      description: v.string(),
    })),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),
});
