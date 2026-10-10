"use client";

import { useActionState, useRef } from "react";
import { deleteReplyAction } from "@/app/actions/posts";
import type { DeleteReplyState } from "@/lib/post-schema";

const initialDeleteReplyState: DeleteReplyState = {};

export function DeleteReplyButton({ postId, replyId }: { postId: number; replyId: number }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [state, formAction, pending] = useActionState(deleteReplyAction, initialDeleteReplyState);

  return (
    <>
      <button type="button" className="btn" onClick={() => dialogRef.current?.showModal()}>
        Apagar
      </button>
      <dialog ref={dialogRef} className="modal">
        <div className="modal-box">
          <h3 className="text-lg font-semibold">Apagar resposta</h3>
          <p className="py-4">Essa ação remove a resposta. Não dá para desfazer.</p>
          {state.message ? (
            <div role="alert" className="alert alert-error">
              <span>{state.message}</span>
            </div>
          ) : null}
          <div className="modal-action">
            <form method="dialog">
              <button type="submit" className="btn">
                Cancelar
              </button>
            </form>
            <form action={formAction}>
              <input type="hidden" name="postId" value={postId} />
              <input type="hidden" name="replyId" value={replyId} />
              <button type="submit" className="btn" disabled={pending} aria-busy={pending}>
                {pending ? <span className="loading loading-spinner" /> : null}
                {pending ? "Apagando…" : "Apagar"}
              </button>
            </form>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button type="submit">Fechar</button>
        </form>
      </dialog>
    </>
  );
}
