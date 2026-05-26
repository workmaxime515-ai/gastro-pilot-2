import { z } from "zod";

export const seedPayloadSchema = z
  .object({
    mode: z.enum(["quick", "full"]).optional(),
    seedText: z
      .string()
      .trim()
      .max(50, "Seed darf maximal 50 Zeichen haben.")
      .regex(/^[a-zA-Z0-9_-]*$/, "Seed darf nur a-z, A-Z, 0-9, _ und - enthalten.")
      .optional(),
  })
  .strict();

export type SeedMode = "quick" | "full";
export type SeedPayload = z.infer<typeof seedPayloadSchema>;

export function parseSeedMode(payload: unknown): SeedMode {
  const parsed = seedPayloadSchema.safeParse(payload);
  if (!parsed.success) return "quick";
  return parsed.data.mode === "full" ? "full" : "quick";
}

export function parseSeedPayload(payload: unknown): SeedPayload {
  const parsed = seedPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return { mode: "quick" };
  }
  return parsed.data;
}
