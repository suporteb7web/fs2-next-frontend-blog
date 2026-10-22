"use client";

import { useActionState } from "react";
import { checkoutAction, type CheckoutState } from "@/app/actions/premium";

const initialState: CheckoutState = {};

export function CheckoutForm() {
  const [state, formAction, pending] = useActionState(checkoutAction, initialState);

  return (
    <form action={formAction}>
      {state.message ? (
        <div role="alert" className="alert alert-error mb-4">
          <span>{state.message}</span>
        </div>
      ) : null}
      <button type="submit" className="btn w-fit" disabled={pending} aria-busy={pending}>
        {pending ? <span className="loading loading-spinner" /> : null}
        {pending ? "Abrindo pagamento…" : "Tornar-se premium"}
      </button>
    </form>
  );
}
