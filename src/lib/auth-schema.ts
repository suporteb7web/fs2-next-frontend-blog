import { z } from "zod";

const email = z
  .string({ error: "Informe um e-mail válido." })
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: "Informe um e-mail válido." }));

const password = z
  .string({ error: "A senha precisa ter pelo menos 6 caracteres." })
  .min(6, { error: "A senha precisa ter pelo menos 6 caracteres." });

const name = z
  .string({ error: "Informe o nome." })
  .trim()
  .min(1, { error: "Informe o nome." })
  .max(100, { error: "O nome pode ter no máximo 100 caracteres." });

export const loginSchema = z.object({
  email,
  password,
});

export const registerSchema = loginSchema.extend({
  name,
});

export type AuthField = "name" | "email" | "password";

export type AuthFormState = {
  revision: number;
  values: {
    name: string;
    email: string;
  };
  errors?: Partial<Record<AuthField, string>>;
  message?: string;
};
