import { z } from "zod";

const timeFormatRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

export const updateSettingsSchema = z
  .object({
    name: z.string().min(2, "Business name must be at least 2 characters"),
    phone: z.string().nullable().optional(),
    workingHoursStart: z
      .string()
      .regex(timeFormatRegex, "Start time must be in HH:MM format (24-hour)")
      .or(z.literal(""))
      .nullable()
      .optional(),
    workingHoursEnd: z
      .string()
      .regex(timeFormatRegex, "End time must be in HH:MM format (24-hour)")
      .or(z.literal(""))
      .nullable()
      .optional(),
  })
  .refine(
    (data) => {
      if (data.workingHoursStart && data.workingHoursEnd) {
        return data.workingHoursStart < data.workingHoursEnd;
      }
      return true;
    },
    {
      message: "Start hours must be strictly before end hours",
      path: ["workingHoursStart"],
    }
  );

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
