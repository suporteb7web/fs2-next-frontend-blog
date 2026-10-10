import { z } from "zod";

const title = z
  .string({ error: "Informe o título." })
  .trim()
  .min(1, { error: "Informe o título." })
  .max(200, { error: "O título pode ter no máximo 200 caracteres." });

const content = z
  .string({ error: "Informe o conteúdo." })
  .trim()
  .min(1, { error: "Informe o conteúdo." });

export const postSchema = z.object({
  title,
  content,
});

export type PostField = "title" | "content";

export type PostFormValues = {
  title: string;
  content: string;
};

export type PostFormState = {
  revision: number;
  values: PostFormValues;
  errors?: Partial<Record<PostField, string>>;
  message?: string;
};

const imageTypes = ["image/jpeg", "image/png", "image/webp"] as const;
const maxImageBytes = 5 * 1024 * 1024;

export const postImageSchema = z
  .instanceof(File, { error: "Selecione uma imagem." })
  .refine((file) => file.size > 0, { error: "Selecione uma imagem." })
  .refine((file) => imageTypes.some((type) => type === file.type), {
    error: "Use uma imagem JPEG, PNG ou WebP.",
  })
  .refine((file) => file.size <= maxImageBytes, {
    error: "A imagem pode ter no máximo 5 MB.",
  });

export type PostImageFormState = {
  revision: number;
  error?: string;
  message?: string;
  saved?: boolean;
  image?: string | null;
};

export type DeletePostState = {
  message?: string;
};

export type LikePostState = {
  message?: string;
};

const replyContent = z
  .string({ error: "Informe a resposta." })
  .trim()
  .min(1, { error: "Informe a resposta." });

export const replySchema = z.object({
  content: replyContent,
});

export type ReplyFormState = {
  revision: number;
  content: string;
  error?: string;
  message?: string;
};

export type DeleteReplyState = {
  message?: string;
};
