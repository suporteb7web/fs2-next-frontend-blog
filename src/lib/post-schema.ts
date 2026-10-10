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
