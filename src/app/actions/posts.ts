"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ZodError } from "zod";
import { ApiError, createPost, deletePost, updatePost } from "@/lib/api";
import { parsePostId } from "@/lib/format";
import {
  postSchema,
  type DeletePostState,
  type PostField,
  type PostFormState,
} from "@/lib/post-schema";

export async function createPostAction(
  state: PostFormState,
  formData: FormData,
): Promise<PostFormState> {
  const revision = state.revision + 1;
  const values = readValues(formData);
  const parsed = postSchema.safeParse(values);

  if (!parsed.success) {
    return { revision, values, errors: fieldErrors(parsed.error) };
  }

  let post;
  try {
    post = await createPost(parsed.data);
  } catch (error) {
    return { revision, values, ...postFailure(error, "/posts/novo", createFallback) };
  }

  refreshPostViews(post.id);
  redirect(`/posts/${post.id}`);
}

export async function updatePostAction(
  id: number,
  state: PostFormState,
  formData: FormData,
): Promise<PostFormState> {
  const revision = state.revision + 1;
  const values = readValues(formData);
  const next = `/posts/${id}/editar`;

  if (!isPostId(id)) {
    return { revision, values, message: missingPost };
  }

  const parsed = postSchema.safeParse(values);
  if (!parsed.success) {
    return { revision, values, errors: fieldErrors(parsed.error) };
  }

  try {
    await updatePost(id, parsed.data);
  } catch (error) {
    return { revision, values, ...postFailure(error, next, updateFallback) };
  }

  refreshPostViews(id);
  redirect(`/posts/${id}`);
}

export async function deletePostAction(
  _state: DeletePostState,
  formData: FormData,
): Promise<DeletePostState> {
  const id = parsePostId(textField(formData, "id"));
  if (id === null) return { message: missingPost };

  try {
    await deletePost(id);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      redirect(`/login?next=${encodeURIComponent(`/posts/${id}`)}`);
    }
    if (error instanceof ApiError && error.status === 403) {
      return { message: "Você não pode apagar este post." };
    }
    if (error instanceof ApiError && (error.status === 404 || error.status === 400)) {
      return { message: missingPost };
    }
    return { message: "Não foi possível apagar o post. Tente de novo." };
  }

  refreshPostViews(id);
  redirect("/");
}

function refreshPostViews(id: number) {
  revalidatePath("/");
  revalidatePath(`/posts/${id}`);
  revalidatePath(`/posts/${id}/editar`);
}

function readValues(formData: FormData): PostFormState["values"] {
  return {
    title: textField(formData, "title"),
    content: textField(formData, "content"),
  };
}

function textField(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function fieldErrors(error: ZodError): PostFormState["errors"] {
  const errors: NonNullable<PostFormState["errors"]> = {};

  for (const issue of error.issues) {
    const field = issue.path[0];
    if (field === "title" || field === "content") {
      errors[field] ??= issue.message;
    }
  }

  return errors;
}

function postFailure(
  error: unknown,
  loginNext: string,
  fallback: string,
): Pick<PostFormState, "message" | "errors"> {
  if (!(error instanceof ApiError)) return { message: fallback };

  if (error.status === 401) {
    redirect(`/login?next=${encodeURIComponent(loginNext)}`);
  }

  if (error.status === 403) {
    return { message: "Você não pode editar este post." };
  }

  if (error.status === 404) {
    return { message: missingPost };
  }

  if (error.code === "VALIDATION_ERROR" && error.details) {
    const errors: Partial<Record<PostField, string>> = {};
    for (const detail of error.details) {
      const field = detail.path.split(".").at(-1);
      if (field === "title" || field === "content") {
        errors[field] ??= fieldFallback[field];
      }
    }
    if (Object.keys(errors).length > 0) return { errors };
  }

  return { message: fallback };
}

function isPostId(id: number): boolean {
  return Number.isSafeInteger(id) && id > 0;
}

const createFallback = "Não foi possível publicar o post. Tente de novo.";
const updateFallback = "Não foi possível salvar o post. Tente de novo.";
const missingPost = "Este post não existe mais.";

const fieldFallback: Record<PostField, string> = {
  title: "Título inválido.",
  content: "Conteúdo inválido.",
};
