import {betterAuth} from "better-auth";
import {drizzleAdapter} from "better-auth/adapters/drizzle";
import {db} from "../db";
import * as schema from "../db/schema";
import z from "zod";

export type Auth = typeof auth;

const betterAuthSchema = z.object({
  BETTER_AUTH_SECRET: z.string(),
  BETTER_AUTH_URL: z.string(),
});

const googleEnvSchema = z.object({
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_API_KEY: z.string().optional(),
});

const githubEnvSchema = z.object({
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
});

export const betterauthSchema = z.object({
  ...betterAuthSchema.shape,
  ...googleEnvSchema.shape,
  ...githubEnvSchema.shape,
});

export const authEnv = betterauthSchema.parse(process.env);

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day - update session if older than this
  },
  socialProviders: {
    ...(authEnv.GOOGLE_CLIENT_ID && authEnv.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: authEnv.GOOGLE_CLIENT_ID,
            clientSecret: authEnv.GOOGLE_CLIENT_SECRET,
          },
        }
      : {}),
  },
});
