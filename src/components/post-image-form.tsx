"use client";

import { useActionState } from "react";
import { updatePostImageAction } from "@/app/actions/posts";
import type { PostImageFormState } from "@/lib/post-schema";

const initialState: PostImageFormState = { revision: 0 };

export function PostImageForm({ postId, image }: { postId: number; image: string | null }) {
  const [state, formAction, pending] = useActionState(
    updatePostImageAction.bind(null, postId),
    initialState,
  );
  const preview = state.image || image;
  const errorId = "post-image-error";
  const hintId = "post-image-hint";

  return (
    <div className="card card-border w-full">
      <form action={formAction} noValidate className="card-body">
        <h2 className="card-title text-xl">Imagem</h2>
        {preview ? (
          <img src={preview} alt="Imagem atual do post" className="w-full rounded-box" />
        ) : (
          <p className="text-base-content/70">Este post ainda não tem imagem.</p>
        )}
        {state.saved ? (
          <div role="alert" className="alert alert-success">
            <span>Imagem atualizada.</span>
          </div>
        ) : null}
        {state.message ? (
          <div role="alert" className="alert alert-error">
            <span>{state.message}</span>
          </div>
        ) : null}
        <fieldset className="fieldset">
          <legend id="post-image-label" className="fieldset-legend">
            Arquivo
          </legend>
          <input
            key={state.revision}
            id="post-image"
            name="image"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            aria-labelledby="post-image-label"
            aria-invalid={state.error ? true : undefined}
            aria-describedby={state.error ? errorId : hintId}
            className="file-input w-full"
          />
          <p id={hintId} className="label">
            JPEG, PNG ou WebP. No máximo 5 MB.
          </p>
          {state.error ? (
            <p id={errorId} className="label text-error">
              {state.error}
            </p>
          ) : null}
        </fieldset>
        <button type="submit" className="btn mt-2 w-fit" disabled={pending} aria-busy={pending}>
          {pending ? <span className="loading loading-spinner" /> : null}
          {pending ? "Enviando…" : "Enviar imagem"}
        </button>
      </form>
    </div>
  );
}

export function PostImageFormSkeleton() {
  return (
    <div className="card card-border w-full">
      <div className="card-body gap-4">
        <div className="skeleton h-7 w-24" />
        <div className="skeleton h-40 w-full" />
        <div className="skeleton h-10 w-full" />
        <div className="skeleton h-10 w-36" />
      </div>
    </div>
  );
}
