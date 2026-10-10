"use client";

import { useActionState, useRef } from "react";
import { deletePostAction } from "@/app/actions/posts";
import type { DeletePostState } from "@/lib/post-schema";

const initialDeleteState: DeletePostState = {};

export function DeletePostButton({ id }: { id: number }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [state, formAction, pending] = useActionState(deletePostAction, initialDeleteState);

  return (
    <>
      <button type="button" className="btn" onClick={() => dialogRef.current?.showModal()}>
        Apagar
      </button>
      <dialog ref={dialogRef} className="modal">
        <div className="modal-box">
          <h2 className="text-lg font-semibold">Apagar post</h2>
          <p className="py-4">
            Essa ação remove o post, as respostas e as curtidas. Não dá para desfazer.
          </p>
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
              <input type="hidden" name="id" value={id} />
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
