import { Suspense } from "react";
import { PostList, PostListSkeleton } from "@/components/post-list";

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Posts</h1>
      <Suspense fallback={<PostListSkeleton />}>
        <PostList searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
