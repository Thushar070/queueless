import { z } from "zod";

export const createStaffSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  role: z.enum(["STAFF", "BUSINESS_OWNER"]),
});

export type CreateStaffInput = z.infer<typeof createStaffSchema>;
