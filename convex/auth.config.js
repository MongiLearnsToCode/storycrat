export default {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN || `https://clerk.${process.env.CLERK_PUBLISHABLE_KEY?.split('_')[1]}.lcl.dev`,
      applicationID: "convex",
    },
  ],
};
