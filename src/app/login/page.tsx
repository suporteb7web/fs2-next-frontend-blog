import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthFormSkeleton, LoginForm } from "@/components/auth-form";
import { safeNextPath } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Entrar",
};

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <Suspense fallback={<AuthFormSkeleton />}>
      <LoginPageContent searchParams={searchParams} />
    </Suspense>
  );
}

async function LoginPageContent({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const next = Array.isArray(params.next) ? params.next[0] : params.next;
  return <LoginForm next={safeNextPath(next)} />;
}
