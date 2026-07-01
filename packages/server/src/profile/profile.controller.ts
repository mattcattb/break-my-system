import { zValidator } from "@hono/zod-validator";
import { createRouter } from "../common/hono";
import { upsertProfileSchema } from "./profile.schema";
import { getProfile, upsertProfile } from "./profile.service";

export const profileController = createRouter()
  .get("/", async (c) => {
    const profile = await getProfile(c.get("userId"));
    return c.json(profile);
  })
  .put("/", zValidator("json", upsertProfileSchema), async (c) => {
    const data = c.req.valid("json");
    const profile = await upsertProfile(c.get("userId"), data);
    return c.json(profile);
  });
