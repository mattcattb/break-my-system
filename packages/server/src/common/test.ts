import {db} from "../db";
import {account, project, session, user, verification} from "../db/schema";

export const resetTestDb = async () => {
  await db.delete(project);
  await db.delete(account);
  await db.delete(session);
  await db.delete(verification);
  await db.delete(user);
};

export const createTestUser = async () => {
  const [created] = await db
    .insert(user)
    .values({
      id: crypto.randomUUID(),
      name: "Test User",
      email: `test-${crypto.randomUUID()}@example.com`,
      emailVerified: true,
    })
    .returning();

  return created;
};
