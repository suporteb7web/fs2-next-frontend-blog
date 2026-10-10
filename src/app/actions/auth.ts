"use server";

import { redirect } from "next/navigation";
import { z, type ZodError } from "zod";
import { ApiError, login, register } from "@/lib/api";
import { safeNextPath } from "@/lib/auth";
import {
  loginSchema,
  registerSchema,
  type AuthField,
  type AuthFormState,
} from "@/lib/auth-schema";
import { clearSession, createSession } from "@/lib/session";

export async function logout() {
  await clearSession();
  redirect("/");
}

export async function loginAction(
  state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  return authenticate(state, formData, {
    schema: loginSchema,
    submit: login,
    fallback: "Não foi possível entrar. Tente de novo.",
  });
}

export async function registerAction(
  state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  return authenticate(state, formData, {
    schema: registerSchema,
    submit: register,
    fallback: "Não foi possível criar a conta. Tente de novo.",
  });
}

async function authenticate<T extends { email: string; password: string }>(
  state: AuthFormState,
  formData: FormData,
  options: {
    schema: z.ZodType<T>;
    submit: (input: T) => Promise<{ token: string }>;
    fallback: string;
  },
): Promise<AuthFormState> {
  const values = readValues(formData);
  const revision = state.revision + 1;
  const parsed = options.schema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { revision, values, errors: fieldErrors(parsed.error) };
  }

  const next = safeNextPath(formData.get("next"));

  try {
    const result = await options.submit(parsed.data);
    await createSession(result.token);
  } catch (error) {
    return { revision, values, ...authFailure(error, options.fallback) };
  }

  redirect(next);
}

function readValues(formData: FormData): AuthFormState["values"] {
  return {
    name: textField(formData, "name"),
    email: textField(formData, "email"),
  };
}

function textField(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function fieldErrors(error: ZodError): AuthFormState["errors"] {
  const errors: NonNullable<AuthFormState["errors"]> = {};

  for (const issue of error.issues) {
    const field = issue.path[0];
    if (field === "name" || field === "email" || field === "password") {
      errors[field] ??= issue.message;
    }
  }

  return errors;
}

function authFailure(
  error: unknown,
  fallback: string,
): Pick<AuthFormState, "message" | "errors"> {
  if (!(error instanceof ApiError)) return { message: fallback };

  if (error.code === "UNAUTHORIZED") {
    return { message: "E-mail ou senha inválidos." };
  }

  if (error.code === "CONFLICT") {
    return { errors: { email: "Este e-mail já está cadastrado." } };
  }

  if (error.code === "VALIDATION_ERROR" && error.details) {
    const errors: Partial<Record<AuthField, string>> = {};
    for (const detail of error.details) {
      const field = detail.path.split(".").at(-1);
      if (field === "name" || field === "email" || field === "password") {
        errors[field] ??= fieldFallback[field];
      }
    }
    if (Object.keys(errors).length > 0) return { errors };
  }

  return { message: fallback };
}

const fieldFallback: Record<AuthField, string> = {
  name: "Nome inválido.",
  email: "E-mail inválido.",
  password: "Senha inválida.",
};
