"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction, registerAction } from "@/app/actions/auth";
import type { AuthFormState } from "@/lib/auth-schema";

const initialAuthFormState: AuthFormState = {
  revision: 0,
  values: { name: "", email: "" },
};

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(loginAction, initialAuthFormState);

  return (
    <AuthForm
      title="Entrar"
      action={action}
      state={state}
      pending={pending}
      pendingLabel="Entrando…"
      submitLabel="Entrar"
      next={next}
      passwordAutoComplete="current-password"
      footer={{
        text: "Não tem conta?",
        href: authHref("/cadastro", next),
        label: "Cadastre-se",
      }}
    />
  );
}

export function RegisterForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(registerAction, initialAuthFormState);

  return (
    <AuthForm
      title="Criar conta"
      action={action}
      state={state}
      pending={pending}
      pendingLabel="Cadastrando…"
      submitLabel="Cadastrar"
      next={next}
      passwordAutoComplete="new-password"
      includeName
      footer={{
        text: "Já tem conta?",
        href: authHref("/login", next),
        label: "Entrar",
      }}
    />
  );
}

function AuthForm({
  title,
  action,
  state,
  pending,
  pendingLabel,
  submitLabel,
  next,
  passwordAutoComplete,
  includeName = false,
  footer,
}: {
  title: string;
  action: (payload: FormData) => void;
  state: AuthFormState;
  pending: boolean;
  pendingLabel: string;
  submitLabel: string;
  next: string;
  passwordAutoComplete: "current-password" | "new-password";
  includeName?: boolean;
  footer: { text: string; href: string; label: string };
}) {
  return (
    <div className="card card-border mx-auto w-full max-w-md">
      <form action={action} noValidate className="card-body">
        <h1 className="card-title text-2xl">{title}</h1>
        <input type="hidden" name="next" value={next} />
        {state.message ? (
          <div role="alert" className="alert alert-error">
            <span>{state.message}</span>
          </div>
        ) : null}
        {includeName ? (
          <AuthField
            id="name"
            name="name"
            label="Nome"
            type="text"
            autoComplete="name"
            revision={state.revision}
            defaultValue={state.values.name}
            error={state.errors?.name}
          />
        ) : null}
        <AuthField
          id="email"
          name="email"
          label="E-mail"
          type="email"
          autoComplete="email"
          revision={state.revision}
          defaultValue={state.values.email}
          error={state.errors?.email}
        />
        <AuthField
          id="password"
          name="password"
          label="Senha"
          type="password"
          autoComplete={passwordAutoComplete}
          revision={state.revision}
          defaultValue=""
          error={state.errors?.password}
        />
        <button type="submit" className="btn mt-2" disabled={pending} aria-busy={pending}>
          {pending ? <span className="loading loading-spinner" /> : null}
          {pending ? pendingLabel : submitLabel}
        </button>
        <p className="text-sm">
          {footer.text}{" "}
          <Link href={footer.href} className="link link-hover">
            {footer.label}
          </Link>
        </p>
      </form>
    </div>
  );
}

function AuthField({
  id,
  name,
  label,
  type,
  autoComplete,
  revision,
  defaultValue,
  error,
}: {
  id: string;
  name: string;
  label: string;
  type: "text" | "email" | "password";
  autoComplete: string;
  revision: number;
  defaultValue: string;
  error?: string;
}) {
  const errorId = `${id}-error`;
  const labelId = `${id}-label`;

  return (
    <fieldset className="fieldset">
      <legend id={labelId} className="fieldset-legend">
        {label}
      </legend>
      <input
        key={`${id}-${revision}`}
        id={id}
        name={name}
        type={type}
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        aria-labelledby={labelId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className="input w-full"
      />
      {error ? (
        <p id={errorId} className="label text-error">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

function authHref(path: "/login" | "/cadastro", next: string): string {
  if (next === "/") return path;
  return `${path}?next=${encodeURIComponent(next)}`;
}

export function AuthFormSkeleton() {
  return (
    <div className="card card-border mx-auto w-full max-w-md">
      <div className="card-body gap-4">
        <div className="skeleton h-8 w-40" />
        <div className="skeleton h-12 w-full" />
        <div className="skeleton h-12 w-full" />
        <div className="skeleton h-10 w-full" />
      </div>
    </div>
  );
}
