import { PostImageFormSkeleton } from "@/components/post-image-form";
import { PostFormSkeleton } from "@/components/post-form";

export default function EditPostLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="skeleton h-5 w-16" />
      <PostFormSkeleton />
      <PostImageFormSkeleton />
    </div>
  );
}
