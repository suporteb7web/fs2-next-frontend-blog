import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthFormSkeleton, RegisterForm } from "@/components/auth-form";
import { safeNextPath } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Cadastro",
};

export default function RegisterPage({ searchParams }: PageProps<"/cadastro">) {
  return (
    <Suspense fallback={<AuthFormSkeleton />}>
      <RegisterPageContent searchParams={searchParams} />
    </Suspense>
  );
}

async function RegisterPageContent({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const next = Array.isArray(params.next) ? params.next[0] : params.next;
  return <RegisterForm next={safeNextPath(next)} />;
}
