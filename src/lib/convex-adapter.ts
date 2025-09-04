import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export const convexAdapter = {
  async createUser(user: any) {
    return await convex.mutation(api.auth.createUser, user);
  },
  
  async getUserByEmail(email: string) {
    return await convex.query(api.auth.getUserByEmail, { email });
  },
  
  async createSession(session: any) {
    return await convex.mutation(api.auth.createSession, session);
  },
  
  async getSessionByToken(token: string) {
    return await convex.query(api.auth.getSessionByToken, { token });
  },
  
  async deleteSession(token: string) {
    return await convex.mutation(api.auth.deleteSession, { token });
  },
  
  async createAccount(account: any) {
    return await convex.mutation(api.auth.createAccount, account);
  },
  
  async getAccountByProviderAccountId(providerId: string, accountId: string) {
    return await convex.query(api.auth.getAccountByProviderAccountId, { providerId, accountId });
  },
};
