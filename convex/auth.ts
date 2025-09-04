import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const createUser = mutation({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
    emailVerified: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("user", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const getUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("user")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
  },
});

export const createSession = mutation({
  args: {
    userId: v.id("user"),
    token: v.string(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("session", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const getSessionByToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("session")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
  },
});

export const deleteSession = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("session")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    if (session) {
      await ctx.db.delete(session._id);
    }
  },
});

export const createAccount = mutation({
  args: {
    userId: v.id("user"),
    providerId: v.string(),
    accountId: v.string(),
    password: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("account", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const getAccountByProviderAccountId = query({
  args: {
    providerId: v.string(),
    accountId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("account")
      .withIndex("by_provider_account", (q) => 
        q.eq("providerId", args.providerId).eq("accountId", args.accountId)
      )
      .first();
  },
});
