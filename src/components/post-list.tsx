import Link from "next/link";
import { ApiError, listPosts, mediaUrl, type PostListItem } from "@/lib/api";
import { formatDate, likesLabel, parsePage } from "@/lib/format";
import { Pagination } from "@/components/pagination";

export async function PostList({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { page: pageParam } = await searchParams;
  const page = parsePage(pageParam);

  if (page === null) {
    return (
      <div role="alert" className="alert alert-error">
        Página inválida.
      </div>
    );
  }

  let result;
  try {
    result = await listPosts(page);
  } catch (error) {
    if (error instanceof ApiError) {
      return (
        <div role="alert" className="alert alert-error">
          {error.status === 400 ? "Página inválida." : "Não foi possível carregar os posts."}
        </div>
      );
    }
    throw error;
  }

  if (result.meta.total === 0) {
    return <p>Nenhum post publicado ainda.</p>;
  }

  const outOfRange = result.meta.page > result.meta.totalPages;

  return (
    <div className="flex flex-col gap-6">
      {result.data.length === 0 ? (
        <p>Não há posts nesta página.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {result.data.map((post) => (
            <li key={post.id}>
              <PostCard post={post} />
            </li>
          ))}
        </ul>
      )}
      {outOfRange ? (
        <Link href="/" className="btn w-fit">
          Voltar para a primeira página
        </Link>
      ) : (
        <Pagination meta={result.meta} />
      )}
    </div>
  );
}

function PostCard({ post }: { post: PostListItem }) {
  const image = mediaUrl(post.image);

  return (
    <article className="card card-border">
      {image ? (
        <figure className="aspect-video">
          <img src={image} alt="" className="h-full w-full object-cover" />
        </figure>
      ) : null}
      <div className="card-body">
        <h2 className="card-title">
          <Link href={`/posts/${post.id}`} className="link link-hover">
            {post.title}
          </Link>
        </h2>
        <p className="line-clamp-3">{post.content}</p>
        <p className="text-sm text-base-content/70">
          {post.author.name} · {formatDate(post.createdAt)} · {likesLabel(post.likesCount)}
        </p>
      </div>
    </article>
  );
}

export function PostListSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index} className="card card-border">
          <div className="card-body gap-3">
            <div className="skeleton h-7 w-2/3" />
            <div className="skeleton skeleton-text h-4 w-full" />
            <div className="skeleton skeleton-text h-4 w-4/5" />
            <div className="skeleton h-4 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
