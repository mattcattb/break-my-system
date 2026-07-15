import {createAuthClient} from "better-auth/react";

const apiBaseUrl = import.meta.env.VITE_API_URL?.trim();

/**
 * Better Auth client for React.
 * Handles authentication state, sign-in, sign-up, and sign-out.
 */
export const authClient = createAuthClient({
  ...(apiBaseUrl ? {baseURL: apiBaseUrl} : {}),
});

// Export auth methods and hooks
export const {signIn, signUp, signOut, useSession, getSession} = authClient;
