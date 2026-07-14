import { z } from "zod";

export const signupSchema = z.object({
  businessName: z.string().min(2, "Business name must be at least 2 characters").max(100),
  businessSlug: z
    .string()
    .min(2, "Slug must be at least 2 characters")
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Slug must only contain lowercase alphanumeric characters and dashes"),
  businessEmail: z.string().email("Invalid business email"),
  businessPhone: z.string().optional().or(z.literal("")),
  ownerName: z.string().min(2, "Owner name must be at least 2 characters").max(100),
  ownerEmail: z.string().email("Invalid owner email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type SignupErrors = z.typeToFlattenedError<SignupInput>;
