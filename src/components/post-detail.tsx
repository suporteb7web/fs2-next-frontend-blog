import { notFound } from "next/navigation";
import { ApiError, getPost, mediaUrl, type Reply } from "@/lib/api";
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

  return (
    <article className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold">{post.title}</h1>
        <p className="text-sm text-base-content/70">
          {post.author.name} · {formatDate(post.createdAt)} · {likesLabel(post.likesCount)}
        </p>
      </header>
      {image ? <img src={image} alt="" className="w-full rounded-box" /> : null}
      <div className="whitespace-pre-wrap">{post.content}</div>
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
    </article>
  );
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
    </div>
  );
}
