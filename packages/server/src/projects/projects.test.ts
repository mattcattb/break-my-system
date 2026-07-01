import {afterAll, beforeEach, describe, expect, test} from "bun:test";
import {closeDb} from "../db";
import {createTestUser, resetTestDb} from "../test/db";
import {createProject, listProjects} from "./projects.service";

describe("projects", () => {
  beforeEach(async () => {
    await resetTestDb();
  });

  afterAll(async () => {
    await resetTestDb();
    await closeDb();
  });

  test("creates and lists projects for a user", async () => {
    const user = await createTestUser();

    const created = await createProject(user.id, "Example project");
    const projects = await listProjects(user.id);

    expect(created.name).toBe("Example project");
    expect(projects).toHaveLength(1);
    expect(projects[0]?.id).toBe(created.id);
    expect(projects[0]?.ownerId).toBe(user.id);
  });

  test("does not list projects owned by another user", async () => {
    const owner = await createTestUser();
    const otherUser = await createTestUser();

    await createProject(owner.id, "Private project");

    expect(await listProjects(otherUser.id)).toEqual([]);
  });
});
