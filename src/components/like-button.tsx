"use client";

import { useActionState } from "react";
import { toggleLikeAction } from "@/app/actions/posts";
import type { LikePostState } from "@/lib/post-schema";

const initialLikeState: LikePostState = {};

export function LikeButton({ id, liked }: { id: number; liked: boolean }) {
  const [state, formAction, pending] = useActionState(toggleLikeAction, initialLikeState);
  const label = pending ? (liked ? "Descurtindo…" : "Curtindo…") : liked ? "Descurtir" : "Curtir";

  return (
    <form action={formAction} className="flex flex-col items-start gap-2">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="intent" value={liked ? "unlike" : "like"} />
      <button
        type="submit"
        className="btn w-fit"
        disabled={pending}
        aria-busy={pending}
        aria-pressed={liked}
      >
        {pending ? <span className="loading loading-spinner" /> : null}
        {label}
      </button>
      {state.message ? (
        <div role="alert" className="alert alert-error">
          <span>{state.message}</span>
        </div>
      ) : null}
    </form>
  );
}
