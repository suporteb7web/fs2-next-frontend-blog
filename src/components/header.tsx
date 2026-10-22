import Link from "next/link";
import { Suspense } from "react";
import { logout } from "@/app/actions/auth";
import { ApiError, getMe, hasSession, type Me } from "@/lib/api";

export function Header() {
  return (
    <header className="bg-base-200">
      <div className="navbar mx-auto w-full max-w-3xl px-4 sm:px-6">
        <div className="navbar-start w-auto">
          <Link href="/" className="text-xl font-semibold">
            Fullstack Blog
          </Link>
        </div>
        <div className="navbar-end ml-auto w-auto gap-2">
          <Suspense fallback={<HeaderActionsFallback />}>
            <HeaderActions />
          </Suspense>
        </div>
      </div>
    </header>
  );
}

async function HeaderActions() {
  const me = await loadMe();

  if (me) {
    return (
      <>
        <PremiumAccess premium={me.premium} />
        <Link href="/posts/novo" className="btn">
          Criar post
        </Link>
        <form action={logout} className="contents">
          <button type="submit" className="btn">
            Sair
          </button>
        </form>
      </>
    );
  }

  return (
    <>
      <Link href="/premium" className="btn">
        Premium
      </Link>
      <Link href="/login" className="btn">
        Login
      </Link>
      <Link href="/cadastro" className="btn">
        Cadastro
      </Link>
    </>
  );
}

function PremiumAccess({ premium }: { premium: boolean }) {
  if (premium) return <span className="badge">Premium</span>;

  return (
    <Link href="/premium" className="btn">
      Premium
    </Link>
  );
}

async function loadMe(): Promise<Me | null> {
  if (!(await hasSession())) return null;

  try {
    return await getMe();
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
}

function HeaderActionsFallback() {
  return (
    <>
      <div className="skeleton h-10 w-24" />
      <div className="skeleton h-10 w-24" />
      <div className="skeleton h-10 w-24" />
    </>
  );
}
