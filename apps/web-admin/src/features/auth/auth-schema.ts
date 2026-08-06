import { z } from "zod";

export const emailSchema = z.string().trim().email("Введіть коректну email-адресу");
export const credentialsSchema = z.object({
  email: emailSchema,
  password: z.string().min(8, "Пароль має містити щонайменше 8 символів"),
});
export const passwordUpdateSchema = z
  .object({
    password: z.string().min(8, "Пароль має містити щонайменше 8 символів"),
    passwordConfirmation: z.string(),
  })
  .refine((value) => value.password === value.passwordConfirmation, {
    path: ["passwordConfirmation"],
    message: "Паролі не збігаються",
  });
