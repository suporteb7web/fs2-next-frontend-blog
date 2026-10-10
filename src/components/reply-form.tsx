"use client";

import { useActionState } from "react";
import { createReplyAction } from "@/app/actions/posts";
import type { ReplyFormState } from "@/lib/post-schema";

const initialReplyState: ReplyFormState = { revision: 0, content: "" };

export function ReplyForm({ postId, disabled = false }: { postId: number; disabled?: boolean }) {
  const [state, formAction, pending] = useActionState(createReplyAction, initialReplyState);
  const errorId = "reply-error";
  const loginNoticeId = "reply-login-notice";
  const busy = pending && !disabled;
  const describedBy = disabled ? loginNoticeId : state.error ? errorId : undefined;

  return (
    <div className="flex flex-col gap-3">
      {disabled ? <p id={loginNoticeId}>Para responder, você precisa estar logado.</p> : null}
      <form
        action={formAction}
        noValidate
        className={disabled ? "flex flex-col gap-3 opacity-50" : "flex flex-col gap-3"}
      >
        <input type="hidden" name="postId" value={postId} />
        <fieldset className="fieldset" disabled={disabled}>
          <legend id="reply-label" className="fieldset-legend">
            Resposta
          </legend>
          <textarea
            key={state.revision}
            id="reply-content"
            name="content"
            rows={4}
            defaultValue={state.content}
            aria-labelledby="reply-label"
            aria-invalid={state.error ? true : undefined}
            aria-describedby={describedBy}
            className="textarea w-full"
          />
          {state.error ? (
            <p id={errorId} className="label text-error">
              {state.error}
            </p>
          ) : null}
        </fieldset>
        {state.message ? (
          <div role="alert" className="alert alert-error">
            <span>{state.message}</span>
          </div>
        ) : null}
        <button type="submit" className="btn w-fit" disabled={disabled || pending} aria-busy={busy}>
          {busy ? <span className="loading loading-spinner" /> : null}
          {busy ? "Publicando…" : "Responder"}
        </button>
      </form>
    </div>
  );
}
