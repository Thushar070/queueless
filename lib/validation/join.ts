import { z } from "zod";

export const joinInputSchema = z.object({
  customerName: z.string().min(2, "Name must be at least 2 characters").max(100),
  customerPhone: z.string().min(6, "Phone number must be at least 6 characters"),
  customerEmail: z
    .string()
    .email("Invalid email address")
    .optional()
    .nullable()
    .or(z.literal("")),
});

export type JoinInput = z.infer<typeof joinInputSchema>;
