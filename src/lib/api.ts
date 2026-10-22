import "server-only";

import axios, { isAxiosError } from "axios";
import { io } from "next/cache";
import { cookies, headers } from "next/headers";
import { AUTH_COOKIE_NAME } from "@/lib/auth";

export { AUTH_COOKIE_NAME };

const http = axios.create({
  headers: { Accept: "application/json" },
  maxBodyLength: Infinity,
  maxContentLength: Infinity,
});

export type ErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INTERNAL_ERROR";

export type ErrorDetail = {
  path: string;
  message: string;
};

export type Health = {
  status: "ok";
};

export type RegisterRequest = {
  name: string;
  email: string;
  password: string;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type CreatePostRequest = {
  title: string;
  content: string;
  premium?: boolean;
};

export type UpdatePostRequest = {
  title?: string;
  content?: string;
  premium?: boolean;
};

export type CreateReplyRequest = {
  content: string;
};

export type Author = {
  id: number;
  name: string;
};

export type User = {
  id: number;
  name: string;
  email: string;
  avatar: string | null;
};

export type Me = User & {
  premium: boolean;
};

export type CheckoutSession = {
  url: string;
};

export type AuthResponse = {
  token: string;
  user: User;
};

export type Post = {
  id: number;
  title: string;
  content: string;
  image: string | null;
  premium: boolean;
  createdAt: string;
  author: Author;
};

export type PostListItem = {
  id: number;
  title: string;
  content: string;
  image: string | null;
  premium: boolean;
  createdAt: string;
  likesCount: number;
  author: Author;
};

export type Reply = {
  id: number;
  content: string;
  createdAt: string;
  author: Author;
};

export type PostDetail = {
  id: number;
  title: string;
  content: string;
  image: string | null;
  premium: boolean;
  createdAt: string;
  likesCount: number;
  likedByMe: boolean;
  replies: Reply[];
  author: Author;
};

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type PostListResponse = {
  data: PostListItem[];
  meta: PaginationMeta;
};

export class ApiError extends Error {
  readonly status: number;
  readonly code: ErrorCode;
  readonly details?: ErrorDetail[];

  constructor(
    status: number,
    code: ErrorCode,
    message: string,
    details?: ErrorDetail[],
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

type AuthMode = "required" | "optional";

type RequestConfig = {
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  data?: unknown;
  params?: Record<string, number>;
  auth?: AuthMode;
};

const ERROR_CODES: readonly ErrorCode[] = [
  "VALIDATION_ERROR",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "INTERNAL_ERROR",
];

function backendUrl(): string {
  const url = process.env.BACKEND_URL;
  if (!url) {
    throw new Error("BACKEND_URL is not set");
  }
  return url.replace(/\/$/, "");
}

/** URL absoluta de um arquivo público (`/uploads/...`). */
export function mediaUrl(path: string | null): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${backendUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

function isErrorCode(value: unknown): value is ErrorCode {
  return (
    typeof value === "string" && ERROR_CODES.some((code) => code === value)
  );
}

function readDetails(value: unknown): ErrorDetail[] | undefined {
  if (!Array.isArray(value)) return undefined;

  const details = value.flatMap((item) => {
    if (
      !item ||
      typeof item !== "object" ||
      !("path" in item) ||
      !("message" in item) ||
      typeof item.path !== "string" ||
      typeof item.message !== "string"
    ) {
      return [];
    }
    return [{ path: item.path, message: item.message }];
  });

  return details.length > 0 ? details : undefined;
}

function toApiError(error: unknown): ApiError {
  if (!isAxiosError(error)) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return new ApiError(500, "INTERNAL_ERROR", message);
  }

  const status = error.response?.status ?? 500;
  const data = error.response?.data;

  if (data && typeof data === "object" && "error" in data) {
    const body = data.error;
    if (body && typeof body === "object") {
      const code = "code" in body && isErrorCode(body.code) ? body.code : "INTERNAL_ERROR";
      const message =
        "message" in body && typeof body.message === "string"
          ? body.message
          : "Internal server error";
      const details = "details" in body ? readDetails(body.details) : undefined;
      return new ApiError(status, code, message, details);
    }
  }

  if (!error.response) {
    return new ApiError(500, "INTERNAL_ERROR", "Internal server error");
  }

  return new ApiError(status, "INTERNAL_ERROR", "Internal server error");
}

async function readToken(): Promise<string | undefined> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    return token || undefined;
  } catch (error) {
    // Next.js 16 dev throws this while re-rendering a Server Action response.
    if (!isCookiesInvariant(error)) throw error;
    const headerStore = await headers();
    return tokenFromCookieHeader(headerStore.get("cookie"));
  }
}

function isCookiesInvariant(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.name === "InvariantError" &&
    error.message.includes("mutableCookies")
  );
}

function tokenFromCookieHeader(cookieHeader: string | null): string | undefined {
  if (!cookieHeader) return undefined;

  for (const part of cookieHeader.split(";")) {
    const separator = part.indexOf("=");
    if (separator === -1) continue;
    const name = part.slice(0, separator).trim();
    if (name !== AUTH_COOKIE_NAME) continue;
    const value = part.slice(separator + 1).trim();
    if (!value) return undefined;
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }

  return undefined;
}

export async function hasSession(): Promise<boolean> {
  return (await readToken()) !== undefined;
}

async function request<T>(config: RequestConfig): Promise<T> {
  await io();

  const headers: Record<string, string> = {};

  if (config.auth) {
    const token = await readToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    } else if (config.auth === "required") {
      throw new ApiError(401, "UNAUTHORIZED", "Unauthorized");
    }
  }

  if (config.data !== undefined && !(config.data instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  try {
    const response = await http.request<T>({
      baseURL: backendUrl(),
      url: config.path,
      method: config.method,
      data: config.data,
      params: config.params,
      headers,
    });
    return response.data;
  } catch (error) {
    throw toApiError(error);
  }
}

function imageBody(image: File): FormData {
  const body = new FormData();
  body.append("image", image);
  return body;
}

export function getHealth(): Promise<Health> {
  return request<Health>({ method: "GET", path: "/health" });
}

export function register(input: RegisterRequest): Promise<AuthResponse> {
  return request<AuthResponse>({
    method: "POST",
    path: "/api/auth/register",
    data: input,
  });
}

export function login(input: LoginRequest): Promise<AuthResponse> {
  return request<AuthResponse>({
    method: "POST",
    path: "/api/auth/login",
    data: input,
  });
}

export function getMe(): Promise<Me> {
  return request<Me>({ method: "GET", path: "/api/me", auth: "required" });
}

export function createCheckout(): Promise<CheckoutSession> {
  return request<CheckoutSession>({
    method: "POST",
    path: "/api/me/checkout",
    auth: "required",
  });
}

export function updateAvatar(image: File): Promise<User> {
  return request<User>({
    method: "PUT",
    path: "/api/me/avatar",
    data: imageBody(image),
    auth: "required",
  });
}

export function listPosts(page?: number): Promise<PostListResponse> {
  return request<PostListResponse>({
    method: "GET",
    path: "/api/posts",
    params: page === undefined ? undefined : { page },
    auth: "optional",
  });
}

export function createPost(input: CreatePostRequest): Promise<Post> {
  return request<Post>({
    method: "POST",
    path: "/api/posts",
    data: input,
    auth: "required",
  });
}

export function getPost(id: number): Promise<PostDetail> {
  return request<PostDetail>({
    method: "GET",
    path: `/api/posts/${id}`,
    auth: "optional",
  });
}

export function updatePost(id: number, input: UpdatePostRequest): Promise<Post> {
  return request<Post>({
    method: "PUT",
    path: `/api/posts/${id}`,
    data: input,
    auth: "required",
  });
}

export function deletePost(id: number): Promise<void> {
  return request<void>({
    method: "DELETE",
    path: `/api/posts/${id}`,
    auth: "required",
  });
}

export function updatePostImage(id: number, image: File): Promise<Post> {
  return request<Post>({
    method: "PUT",
    path: `/api/posts/${id}/image`,
    data: imageBody(image),
    auth: "required",
  });
}

export function likePost(id: number): Promise<void> {
  return request<void>({
    method: "POST",
    path: `/api/posts/${id}/likes`,
    auth: "required",
  });
}

export function unlikePost(id: number): Promise<void> {
  return request<void>({
    method: "DELETE",
    path: `/api/posts/${id}/likes`,
    auth: "required",
  });
}

export function createReply(id: number, input: CreateReplyRequest): Promise<Reply> {
  return request<Reply>({
    method: "POST",
    path: `/api/posts/${id}/replies`,
    data: input,
    auth: "required",
  });
}

export function deleteReply(id: number, replyId: number): Promise<void> {
  return request<void>({
    method: "DELETE",
    path: `/api/posts/${id}/replies/${replyId}`,
    auth: "required",
  });
}
