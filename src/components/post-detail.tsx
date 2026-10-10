import Link from "next/link";
import { notFound } from "next/navigation";
import { DeletePostButton } from "@/components/delete-post-button";
import { LikeButton } from "@/components/like-button";
import { ApiError, getMe, getPost, hasSession, mediaUrl, type Reply } from "@/lib/api";
import { formatDate, likesLabel, parsePostId } from "@/lib/format";

export async function PostDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params;
  const id = parsePostId(rawId);
  if (id === null) notFound();

  let post;
  try {
    post = await getPost(id);
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 400)) {
      notFound();
    }
    if (error instanceof ApiError) {
      return (
        <div role="alert" className="alert alert-error">
          {error.status === 401
            ? "Não foi possível abrir o post com a sessão atual."
            : "Não foi possível carregar este post."}
        </div>
      );
    }
    throw error;
  }

  const image = mediaUrl(post.image);
  const loggedIn = await hasSession();
  const isOwner = await isPostOwner(post.author.id, loggedIn);

  return (
    <article className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <h1 className="text-3xl font-semibold">{post.title}</h1>
          {isOwner ? (
            <div className="flex shrink-0 flex-wrap gap-2">
              <Link href={`/posts/${post.id}/editar`} className="btn">
                Editar
              </Link>
              <DeletePostButton id={post.id} />
            </div>
          ) : null}
        </div>
        <p className="text-sm text-base-content/70">
          {post.author.name} · {formatDate(post.createdAt)} · {likesLabel(post.likesCount)}
        </p>
      </header>
      {image ? <img src={image} alt="" className="w-full rounded-box" /> : null}
      <div className="whitespace-pre-wrap">{post.content}</div>
      <div className="border border-t opacity-10"></div>
      <div className="flex flex-col gap-6">
        {loggedIn ? <LikeButton id={post.id} liked={post.likedByMe} /> : null}
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Respostas</h2>
          {post.replies.length === 0 ? (
            <p className="text-base-content/70">Nenhuma resposta ainda.</p>
          ) : (
            <ul className="list">
              {post.replies.map((reply) => (
                <ReplyItem key={reply.id} reply={reply} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </article>
  );
}

async function isPostOwner(authorId: number, loggedIn: boolean): Promise<boolean> {
  if (!loggedIn) return false;

  try {
    const me = await getMe();
    return me.id === authorId;
  } catch (error) {
    if (error instanceof ApiError) return false;
    throw error;
  }
}

function ReplyItem({ reply }: { reply: Reply }) {
  return (
    <li className="list-row">
      <div className="list-col-grow">
        <p className="text-sm text-base-content/70">
          {reply.author.name} · {formatDate(reply.createdAt)}
        </p>
        <p className="whitespace-pre-wrap">{reply.content}</p>
      </div>
    </li>
  );
}

export function PostDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="skeleton h-9 w-2/3" />
      <div className="skeleton h-4 w-1/2" />
      <div className="flex flex-col gap-2">
        <div className="skeleton skeleton-text h-4 w-full" />
        <div className="skeleton skeleton-text h-4 w-full" />
        <div className="skeleton skeleton-text h-4 w-3/4" />
      </div>
      <div className="divider" />
      <div className="skeleton h-6 w-28" />
    </div>
  );
}
