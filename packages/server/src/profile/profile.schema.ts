import { z } from "zod";

export const upsertProfileSchema = z.object({
  height: z.number().positive().optional().nullable(),
  weight: z.number().positive().optional().nullable(),
  sex: z.enum(["male", "female", "other"]).optional().nullable(),
  dateOfBirth: z.string().optional().nullable(),
  activityLevel: z
    .enum(["sedentary", "light", "moderate", "active", "very_active"])
    .optional()
    .nullable(),
  goal: z.enum(["lose", "maintain", "gain"]).optional().nullable(),
  calorieTarget: z.number().int().positive().optional().nullable(),
  proteinTarget: z.number().int().nonnegative().optional().nullable(),
  carbTarget: z.number().int().nonnegative().optional().nullable(),
  fatTarget: z.number().int().nonnegative().optional().nullable(),
  unitSystem: z.enum(["metric", "imperial"]).optional(),
});

export type UpsertProfileInput = z.infer<typeof upsertProfileSchema>;
