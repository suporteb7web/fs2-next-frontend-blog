import Link from "next/link";
import { Suspense } from "react";
import { PostDetail, PostDetailSkeleton } from "@/components/post-detail";

export default function PostPage({ params }: PageProps<"/posts/[id]">) {
  return (
    <div className="flex flex-col gap-6">
      <Link href="/" className="link link-hover w-fit">
        Voltar
      </Link>
      <Suspense fallback={<PostDetailSkeleton />}>
        <PostDetail params={params} />
      </Suspense>
    </div>
  );
}
