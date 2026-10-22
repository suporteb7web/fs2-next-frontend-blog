import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CheckoutForm } from "@/components/checkout-form";
import { ApiError, getMe, hasSession, type Me } from "@/lib/api";

export const metadata: Metadata = {
  title: "Premium",
};

export default function PremiumPage() {
  return (
    <Suspense fallback={<PremiumSkeleton />}>
      <PremiumContent />
    </Suspense>
  );
}

async function PremiumContent() {
  const me = await loadMe();

  return (
    <div className="card card-border w-full">
      <div className="card-body">
        <h1 className="card-title text-2xl">Premium</h1>
        {me === "invalid" ? (
          <div role="alert" className="alert alert-error">
            <span>Não foi possível carregar a conta com a sessão atual.</span>
          </div>
        ) : me?.premium ? (
          <p>Sua conta já é premium. O acesso não expira.</p>
        ) : (
          <>
            <p>O pagamento é único e o acesso não expira.</p>
            {me ? (
              <CheckoutForm />
            ) : (
              <Link href="/login?next=/premium" className="btn w-fit">
                Entrar para continuar
              </Link>
            )}
          </>
        )}
      </div>
    </div>
  );
}

async function loadMe(): Promise<Me | "invalid" | null> {
  if (!(await hasSession())) return null;

  try {
    return await getMe();
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return "invalid";
    throw error;
  }
}

function PremiumSkeleton() {
  return (
    <div className="card card-border w-full">
      <div className="card-body gap-4">
        <div className="skeleton h-8 w-32" />
        <div className="skeleton h-4 w-2/3" />
        <div className="skeleton h-10 w-40" />
      </div>
    </div>
  );
}
