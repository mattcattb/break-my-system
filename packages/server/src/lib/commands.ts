import z from "zod";

export const commandStringSchema = z
  .string()
  .min(1) // alphanumeric here maybe?
  .transform((arg) => {
    return arg.split(" ");
  });
