import type { Metadata } from "next";
import Link from "next/link";
import { createPostAction } from "@/app/actions/posts";
import { PostForm } from "@/components/post-form";

export const metadata: Metadata = {
  title: "Novo post",
};

export default function NewPostPage() {
  return (
    <div className="flex flex-col gap-6">
      <Link href="/" className="link link-hover w-fit">
        Voltar
      </Link>
      <PostForm
        heading="Novo post"
        action={createPostAction}
        submitLabel="Publicar"
        pendingLabel="Publicando…"
        initialValues={{ title: "", content: "" }}
      />
    </div>
  );
}
