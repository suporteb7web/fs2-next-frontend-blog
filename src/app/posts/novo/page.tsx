import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createPostAction } from "@/app/actions/posts";
import { PostForm, PostFormSkeleton } from "@/components/post-form";
import { ApiError, getMe } from "@/lib/api";

export const metadata: Metadata = {
  title: "Novo post",
};

export default function NewPostPage() {
  return (
    <div className="flex flex-col gap-6">
      <Link href="/" className="link link-hover w-fit">
        Voltar
      </Link>
      <Suspense fallback={<PostFormSkeleton />}>
        <NewPostForm />
      </Suspense>
    </div>
  );
}

async function NewPostForm() {
  let premium = false;

  try {
    const me = await getMe();
    premium = me.premium;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      redirect(`/login?next=${encodeURIComponent("/posts/novo")}`);
    }
    throw error;
  }

  return (
    <PostForm
      heading="Novo post"
      action={createPostAction}
      submitLabel="Publicar"
      pendingLabel="Publicando…"
      canMarkPremium={premium}
      initialValues={{ title: "", content: "", premium: false }}
    />
  );
}
