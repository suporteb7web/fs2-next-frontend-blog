"use server";

import { redirect } from "next/navigation";
import { ApiError, createCheckout } from "@/lib/api";

export type CheckoutState = {
  message?: string;
};

export async function checkoutAction(
  _state: CheckoutState,
  _formData: FormData,
): Promise<CheckoutState> {
  let url: string;

  try {
    const session = await createCheckout();
    url = session.url;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      redirect(`/login?next=${encodeURIComponent("/premium")}`);
    }
    if (error instanceof ApiError && error.status === 409) {
      return { message: "Sua conta já é premium." };
    }
    return { message: "Não foi possível iniciar o pagamento. Tente de novo." };
  }

  if (!isCheckoutUrl(url)) {
    return { message: "Não foi possível iniciar o pagamento. Tente de novo." };
  }

  redirect(url);
}

function isCheckoutUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}
