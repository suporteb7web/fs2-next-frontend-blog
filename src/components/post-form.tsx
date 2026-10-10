"use client";

import { useActionState } from "react";
import type { PostFormState, PostFormValues } from "@/lib/post-schema";

const emptyValues: PostFormValues = { title: "", content: "" };

export function PostForm({
  heading,
  action,
  submitLabel,
  pendingLabel,
  initialValues = emptyValues,
}: {
  heading: string;
  action: (state: PostFormState, formData: FormData) => Promise<PostFormState>;
  submitLabel: string;
  pendingLabel: string;
  initialValues?: PostFormValues;
}) {
  const [state, formAction, pending] = useActionState(action, {
    revision: 0,
    values: initialValues,
  });

  return (
    <div className="card card-border w-full">
      <form action={formAction} noValidate className="card-body">
        <h1 className="card-title text-2xl">{heading}</h1>
        {state.message ? (
          <div role="alert" className="alert alert-error">
            <span>{state.message}</span>
          </div>
        ) : null}
        <PostField
          id="title"
          name="title"
          label="Título"
          revision={state.revision}
          defaultValue={state.values.title}
          error={state.errors?.title}
        />
        <PostField
          id="content"
          name="content"
          label="Conteúdo"
          revision={state.revision}
          defaultValue={state.values.content}
          error={state.errors?.content}
          multiline
        />
        <button type="submit" className="btn mt-2 w-fit" disabled={pending} aria-busy={pending}>
          {pending ? <span className="loading loading-spinner" /> : null}
          {pending ? pendingLabel : submitLabel}
        </button>
      </form>
    </div>
  );
}

function PostField({
  id,
  name,
  label,
  revision,
  defaultValue,
  error,
  multiline = false,
}: {
  id: string;
  name: string;
  label: string;
  revision: number;
  defaultValue: string;
  error?: string;
  multiline?: boolean;
}) {
  const errorId = `${id}-error`;
  const labelId = `${id}-label`;
  const describedBy = error ? errorId : undefined;

  return (
    <fieldset className="fieldset">
      <legend id={labelId} className="fieldset-legend">
        {label}
      </legend>
      {multiline ? (
        <textarea
          key={`${id}-${revision}`}
          id={id}
          name={name}
          rows={8}
          defaultValue={defaultValue}
          aria-labelledby={labelId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className="textarea w-full"
        />
      ) : (
        <input
          key={`${id}-${revision}`}
          id={id}
          name={name}
          type="text"
          defaultValue={defaultValue}
          aria-labelledby={labelId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className="input w-full"
        />
      )}
      {error ? (
        <p id={errorId} className="label text-error">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

export function PostFormSkeleton() {
  return (
    <div className="card card-border w-full">
      <div className="card-body gap-4">
        <div className="skeleton h-8 w-40" />
        <div className="skeleton h-12 w-full" />
        <div className="skeleton h-40 w-full" />
        <div className="skeleton h-10 w-28" />
      </div>
    </div>
  );
}
