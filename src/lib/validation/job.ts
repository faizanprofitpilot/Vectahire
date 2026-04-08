import { z } from "zod";

export const jobSenioritySchema = z.enum([
  "intern",
  "junior",
  "mid",
  "senior",
  "lead",
  "executive",
]);

/** Empty HTML number inputs submit ""; coerce.number("") is 0 and fails .positive(). */
const optionalSalaryInt = z.preprocess((v) => {
  if (v === "" || v === null || v === undefined) return undefined;
  return v;
}, z.coerce.number().int().positive().optional());

export const jobFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().min(1, "Description is required").max(20000),
  required_skills: z.array(z.string()).default([]),
  seniority: jobSenioritySchema,
  location: z.string().max(200).default(""),
  salary_min: optionalSalaryInt,
  salary_max: optionalSalaryInt,
  salary_currency: z.string().max(8).default("USD"),
  hiring_priorities: z.string().max(5000).optional().nullable(),
});

export type JobFormValues = z.infer<typeof jobFormSchema>;
