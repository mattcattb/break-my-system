import { eq } from "drizzle-orm";
import { db } from "../db";
import { userProfile } from "../db/schema";
import type { UpsertProfileInput } from "./profile.schema";

export const getProfile = async (userId: string) => {
  const [profile] = await db
    .select()
    .from(userProfile)
    .where(eq(userProfile.userId, userId));
  return profile ?? null;
};

export const upsertProfile = async (
  userId: string,
  data: UpsertProfileInput,
) => {
  const existing = await getProfile(userId);

  if (existing) {
    const [updated] = await db
      .update(userProfile)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(userProfile.userId, userId))
      .returning();
    return updated;
  }

  const [created] = await db
    .insert(userProfile)
    .values({ userId, ...data })
    .returning();
  return created;
};
