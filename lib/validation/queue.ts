import { z } from "zod";

export const createQueueSchema = z.object({
  name: z.string().min(2, "Queue name must be at least 2 characters").max(100),
  avgServiceTimeMin: z.number().int().min(1, "Average service time must be at least 1 minute").default(8),
  maxCapacity: z.number().int().min(1).nullable().optional(),
  workingHoursStart: z
    .string()
    .regex(/^([0-9]|0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid start time format (HH:MM)")
    .nullable()
    .optional()
    .or(z.literal("")),
  workingHoursEnd: z
    .string()
    .regex(/^([0-9]|0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid end time format (HH:MM)")
    .nullable()
    .optional()
    .or(z.literal("")),
});

export const updateQueueSchema = createQueueSchema.partial();

export type CreateQueueInput = z.infer<typeof createQueueSchema>;
export type UpdateQueueInput = z.infer<typeof updateQueueSchema>;
