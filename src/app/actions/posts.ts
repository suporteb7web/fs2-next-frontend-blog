"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ZodError } from "zod";
import {
  ApiError,
  createPost,
  createReply,
  deletePost,
  deleteReply,
  likePost,
  mediaUrl,
  unlikePost,
  updatePost,
  updatePostImage,
} from "@/lib/api";
import { parsePostId } from "@/lib/format";
import {
  postImageSchema,
  postSchema,
  replySchema,
  type DeletePostState,
  type DeleteReplyState,
  type LikePostState,
  type PostField,
  type PostFormState,
  type PostImageFormState,
  type ReplyFormState,
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
    post = await createPost(createBody(parsed.data, formData));
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
    await updatePost(id, updateBody(parsed.data, formData));
  } catch (error) {
    return { revision, values, ...postFailure(error, next, updateFallback) };
  }

  refreshPostViews(id);
  redirect(`/posts/${id}`);
}

export async function updatePostImageAction(
  id: number,
  state: PostImageFormState,
  formData: FormData,
): Promise<PostImageFormState> {
  const revision = state.revision + 1;
  const next = `/posts/${id}/editar`;

  if (!isPostId(id)) {
    return { revision, message: missingPost };
  }

  const parsed = postImageSchema.safeParse(formData.get("image"));
  if (!parsed.success) {
    return { revision, error: parsed.error.issues[0]?.message ?? imageInvalid };
  }

  let post;
  try {
    post = await updatePostImage(id, parsed.data);
  } catch (error) {
    return { revision, ...imageFailure(error, next) };
  }

  refreshPostViews(id);
  return { revision, saved: true, image: mediaUrl(post.image) };
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

export async function toggleLikeAction(
  _state: LikePostState,
  formData: FormData,
): Promise<LikePostState> {
  const id = parsePostId(textField(formData, "id"));
  if (id === null) return { message: missingPost };

  const intent = formData.get("intent");
  if (intent !== "like" && intent !== "unlike") {
    return { message: likeFallback };
  }

  const next = `/posts/${id}`;

  try {
    if (intent === "like") {
      await likePost(id);
    } else {
      await unlikePost(id);
    }
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      redirect(`/login?next=${encodeURIComponent(next)}`);
    }
    if (error instanceof ApiError && (error.status === 404 || error.status === 400)) {
      return { message: missingPost };
    }
    return { message: likeFallback };
  }

  revalidatePath("/");
  revalidatePath(next);
  return {};
}

export async function createReplyAction(
  state: ReplyFormState,
  formData: FormData,
): Promise<ReplyFormState> {
  const revision = state.revision + 1;
  const content = textField(formData, "content");
  const id = parsePostId(textField(formData, "postId"));

  if (id === null) {
    return { revision, content, message: missingPost };
  }

  const parsed = replySchema.safeParse({ content });
  if (!parsed.success) {
    return {
      revision,
      content,
      error: parsed.error.issues[0]?.message ?? replyInvalid,
    };
  }

  const next = `/posts/${id}`;

  try {
    await createReply(id, parsed.data);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      redirect(`/login?next=${encodeURIComponent(next)}`);
    }
    if (error instanceof ApiError && error.status === 404) {
      return { revision, content, message: missingPost };
    }
    if (error instanceof ApiError && error.status === 400) {
      return replyValidationFailure(revision, content, error);
    }
    return { revision, content, message: replyFallback };
  }

  revalidatePath(next);
  return { revision, content: "" };
}

export async function deleteReplyAction(
  _state: DeleteReplyState,
  formData: FormData,
): Promise<DeleteReplyState> {
  const id = parsePostId(textField(formData, "postId"));
  const replyId = parsePostId(textField(formData, "replyId"));

  if (id === null) return { message: missingPost };
  if (replyId === null) return { message: missingReply };

  try {
    await deleteReply(id, replyId);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      redirect(`/login?next=${encodeURIComponent(`/posts/${id}`)}`);
    }
    if (error instanceof ApiError && error.status === 403) {
      return { message: "Você só pode apagar as suas respostas." };
    }
    if (error instanceof ApiError && (error.status === 404 || error.status === 400)) {
      return { message: missingReply };
    }
    return { message: replyDeleteFallback };
  }

  revalidatePath(`/posts/${id}`);
  return {};
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
    premium: formData.get("premium") === "true",
  };
}

function createBody(
  values: { title: string; content: string },
  formData: FormData,
): { title: string; content: string; premium?: boolean } {
  if (formData.get("premium") !== "true") return values;
  return { ...values, premium: true };
}

function updateBody(
  values: { title: string; content: string },
  formData: FormData,
): { title: string; content: string; premium?: boolean } {
  if (formData.get("includePremium") !== "1") return values;
  return { ...values, premium: formData.get("premium") === "true" };
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
    if (error.message === "Only premium users can mark posts as premium") {
      return { message: "Só uma conta premium pode marcar um post como premium." };
    }
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

function imageFailure(
  error: unknown,
  loginNext: string,
): Pick<PostImageFormState, "message" | "error"> {
  if (!(error instanceof ApiError)) return { message: imageFallback };

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
    for (const detail of error.details) {
      const field = detail.path.split(".").at(-1);
      if (field === "id") return { message: missingPost };
      if (field === "image") {
        return { error: imageApiMessages[detail.message] ?? imageInvalid };
      }
    }
  }

  return { message: imageFallback };
}

function replyValidationFailure(
  revision: number,
  content: string,
  error: ApiError,
): ReplyFormState {
  const paths = error.details?.map((detail) => detail.path.split(".").at(-1)) ?? [];
  if (paths.includes("id") && !paths.includes("content")) {
    return { revision, content, message: missingPost };
  }
  if (error.code === "VALIDATION_ERROR") {
    return { revision, content, error: replyInvalid };
  }
  return { revision, content, message: missingPost };
}

function isPostId(id: number): boolean {
  return Number.isSafeInteger(id) && id > 0;
}

const createFallback = "Não foi possível publicar o post. Tente de novo.";
const updateFallback = "Não foi possível salvar o post. Tente de novo.";
const imageFallback = "Não foi possível enviar a imagem. Tente de novo.";
const imageInvalid = "A imagem não pôde ser lida.";

const imageApiMessages: Record<string, string> = {
  "Image file is required": "Selecione uma imagem.",
  "File type must be jpeg, png or webp": "Use uma imagem JPEG, PNG ou WebP.",
  "Invalid image": imageInvalid,
  "File too large": "A imagem pode ter no máximo 5 MB.",
};
const likeFallback = "Não foi possível atualizar a curtida. Tente de novo.";
const replyFallback = "Não foi possível publicar a resposta. Tente de novo.";
const replyDeleteFallback = "Não foi possível apagar a resposta. Tente de novo.";
const replyInvalid = "Resposta inválida.";
const missingPost = "Este post não existe mais.";
const missingReply = "Essa resposta não existe mais.";

const fieldFallback: Record<PostField, string> = {
  title: "Título inválido.",
  content: "Conteúdo inválido.",
};
