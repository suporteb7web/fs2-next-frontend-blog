import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { updatePostAction } from "@/app/actions/posts";
import { PostForm } from "@/components/post-form";
import { PostImageForm } from "@/components/post-image-form";
import { ApiError, getMe, getPost, mediaUrl, type Me, type PostDetail } from "@/lib/api";
import { parsePostId } from "@/lib/format";

export const metadata: Metadata = {
  title: "Editar post",
};

export default async function EditPostPage({ params }: PageProps<"/posts/[id]/editar">) {
  const { id: rawId } = await params;
  const id = parsePostId(rawId);
  if (id === null) return <EditUnavailable />;

  const post = await loadOwnPost(id);
  if (post === null) return <EditUnavailable />;

  return (
    <div className="flex flex-col gap-6">
      <Link href={`/posts/${post.id}`} className="link link-hover w-fit">
        Voltar
      </Link>
      <PostForm
        key={`${post.title}\n${post.content}\n${post.premium}`}
        heading="Editar post"
        action={updatePostAction.bind(null, post.id)}
        submitLabel="Salvar"
        pendingLabel="Salvando…"
        canMarkPremium={post.viewerPremium}
        sendPremiumValue
        initialValues={{ title: post.title, content: post.content, premium: post.premium }}
      />
      <PostImageForm postId={post.id} image={mediaUrl(post.image)} />
    </div>
  );
}

async function loadOwnPost(id: number): Promise<(PostDetail & { viewerPremium: boolean }) | null> {
  const loginPath = `/login?next=${encodeURIComponent(`/posts/${id}/editar`)}`;
  let me: Me;
  let post: PostDetail;

  try {
    [me, post] = await Promise.all([getMe(), getPost(id)]);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      redirect(loginPath);
    }
    if (error instanceof ApiError && (error.status === 404 || error.status === 400)) {
      return null;
    }
    throw error;
  }

  if (me.id !== post.author.id) return null;
  return { ...post, viewerPremium: me.premium };
}

function EditUnavailable() {
  return (
    <div className="flex flex-col items-start gap-4">
      <h1 className="text-2xl font-semibold">Edição indisponível</h1>
      <p>Esse post não existe ou não é seu.</p>
      <Link href="/" className="btn">
        Voltar para o início
      </Link>
    </div>
  );
}
