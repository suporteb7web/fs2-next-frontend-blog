import { randomBytes } from "node:crypto";
import type { DefaultBodyType } from "msw";
import { http, HttpResponse } from "msw/http";
import type {
  AuthResponse,
  Author,
  CheckoutSession,
  ErrorCode,
  ErrorDetail,
  Health,
  Me,
  Post,
  PostDetail,
  PostListItem,
  PostListResponse,
  Reply,
  User,
} from "@/lib/api";
import {
  mockCheckoutUrl,
  mockEmailPrefix,
  mockInvalidCheckoutUrl,
  PAGE_SIZE,
  type MockPost,
  type MockReply,
  type MockUser,
} from "./data";
import { getMockStore } from "./store";

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function db() {
  return getMockStore();
}

type Ok<T> = { ok: true; value: T };
type MockResponse = HttpResponse<DefaultBodyType>;
type Err = { ok: false; response: MockResponse };
type Result<T> = Ok<T> | Err;

type Params = Record<string, string | readonly string[] | undefined>;

function checkoutResponse(user: MockUser): MockResponse {
  if (user.premium || hasEmailPrefix(user.email, mockEmailPrefix.checkoutConflict)) {
    return apiError(409, "CONFLICT", "User is already premium");
  }
  if (hasEmailPrefix(user.email, mockEmailPrefix.checkoutError)) {
    return apiError(500, "INTERNAL_ERROR", "Checkout failed");
  }
  if (hasEmailPrefix(user.email, mockEmailPrefix.checkoutInvalidUrl)) {
    const body: CheckoutSession = { url: mockInvalidCheckoutUrl };
    return HttpResponse.json(body);
  }

  const body: CheckoutSession = { url: mockCheckoutUrl };
  return HttpResponse.json(body);
}

function hasEmailPrefix(email: string, prefix: string): boolean {
  return email.slice(0, email.indexOf("@")).startsWith(prefix);
}

export const handlers = [
  http.get("*/health", () => {
    const body: Health = { status: "ok" };
    return HttpResponse.json(body);
  }),

  http.post("*/api/auth/register", async ({ request }) => {
    const body = await readJson(request);
    if (!body.ok) return body.response;

    const name = readBoundedString(body.value, "name", { min: 1, max: 100 }, true);
    if (!name.ok) return name.response;
    const email = readEmail(body.value);
    if (!email.ok) return email.response;
    const password = readPassword(body.value);
    if (!password.ok) return password.response;

    if (db().users.some((user) => user.email === email.value)) {
      return apiError(409, "CONFLICT", "Email already registered");
    }

    const user: MockUser = {
      id: db().nextUserId++,
      name: name.value,
      email: email.value,
      password: password.value,
      avatar: null,
      premium: hasEmailPrefix(email.value, mockEmailPrefix.premium),
      token: createToken(),
    };
    db().users.push(user);
    return HttpResponse.json(toAuth(user), { status: 201 });
  }),

  http.post("*/api/auth/login", async ({ request }) => {
    const body = await readJson(request);
    if (!body.ok) return body.response;

    const email = readEmail(body.value);
    if (!email.ok) return email.response;
    const password = readPassword(body.value);
    if (!password.ok) return password.response;

    const user = db().users.find((item) => item.email === email.value);
    if (!user || user.password !== password.value) {
      return apiError(401, "UNAUTHORIZED", "Invalid email or password");
    }

    user.token = createToken();
    return HttpResponse.json(toAuth(user));
  }),

  http.get("*/api/me", ({ request }) => {
    const auth = session(request, "required");
    if (!auth.ok) return auth.response;
    return HttpResponse.json(toMe(auth.value));
  }),

  http.post("*/api/me/checkout", ({ request }) => {
    const auth = session(request, "required");
    if (!auth.ok) return auth.response;
    return checkoutResponse(auth.value);
  }),

  http.put("*/api/me/avatar", async ({ request }) => {
    const auth = session(request, "required");
    if (!auth.ok) return auth.response;

    const image = await readImage(request);
    if (!image.ok) return image.response;

    auth.value.avatar = `/uploads/avatars/${auth.value.id}.webp`;
    return HttpResponse.json(toUser(auth.value));
  }),

  http.get("*/api/posts", ({ request }) => {
    const auth = session(request, "optional");
    if (!auth.ok) return auth.response;

    const page = readPage(request);
    if (!page.ok) return page.response;

    const visible = db().posts
      .filter((post) => !post.premium || auth.value?.premium === true)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id);

    const total = visible.length;
    const totalPages = total === 0 ? 0 : Math.ceil(total / PAGE_SIZE);
    const start = (page.value - 1) * PAGE_SIZE;
    const body: PostListResponse = {
      data: visible.slice(start, start + PAGE_SIZE).map(toListItem),
      meta: { page: page.value, limit: PAGE_SIZE, total, totalPages },
    };
    return HttpResponse.json(body);
  }),

  http.post("*/api/posts", async ({ request }) => {
    const auth = session(request, "required");
    if (!auth.ok) return auth.response;

    const body = await readJson(request);
    if (!body.ok) return body.response;
    const input = readPostWrite(body.value, true);
    if (!input.ok) return input.response;

    if (input.value.premium === true && !auth.value.premium) {
      return apiError(403, "FORBIDDEN", "Only premium users can mark posts as premium");
    }
    if (input.value.title === undefined || input.value.content === undefined) {
      return apiError(400, "VALIDATION_ERROR", "Invalid request data");
    }

    const post: MockPost = {
      id: db().nextPostId++,
      title: input.value.title,
      content: input.value.content,
      image: null,
      premium: input.value.premium ?? false,
      createdAt: new Date().toISOString(),
      authorId: auth.value.id,
      likedBy: [],
      replies: [],
    };
    db().posts.push(post);
    return HttpResponse.json(toPost(post), { status: 201 });
  }),

  http.get("*/api/posts/:id", ({ request, params }) => {
    const auth = session(request, "optional");
    if (!auth.ok) return auth.response;

    const id = readParam(params, "id");
    if (!id.ok) return id.response;

    const post = visiblePost(id.value, auth.value);
    if (!post.ok) return post.response;
    return HttpResponse.json(toDetail(post.value, auth.value));
  }),

  http.put("*/api/posts/:id", async ({ request, params }) => {
    const auth = session(request, "required");
    if (!auth.ok) return auth.response;

    const id = readParam(params, "id");
    if (!id.ok) return id.response;

    const post = visiblePost(id.value, auth.value);
    if (!post.ok) return post.response;
    if (post.value.authorId !== auth.value.id) {
      return apiError(403, "FORBIDDEN", "You can only update your own posts");
    }

    const body = await readJson(request);
    if (!body.ok) return body.response;
    const unknown = unknownKeys(body.value, ["title", "content", "premium"]);
    if (unknown) return unknown;

    const input = readPostWrite(body.value, false);
    if (!input.ok) return input.response;
    if (
      input.value.title === undefined &&
      input.value.content === undefined &&
      input.value.premium === undefined
    ) {
      return apiError(
        400,
        "VALIDATION_ERROR",
        "At least one of title, content or premium must be provided",
      );
    }
    if (input.value.premium === true && !auth.value.premium) {
      return apiError(403, "FORBIDDEN", "Only premium users can mark posts as premium");
    }

    if (input.value.title !== undefined) post.value.title = input.value.title;
    if (input.value.content !== undefined) post.value.content = input.value.content;
    if (input.value.premium !== undefined) post.value.premium = input.value.premium;
    return HttpResponse.json(toPost(post.value));
  }),

  http.delete("*/api/posts/:id", ({ request, params }) => {
    const auth = session(request, "required");
    if (!auth.ok) return auth.response;

    const id = readParam(params, "id");
    if (!id.ok) return id.response;

    const post = visiblePost(id.value, auth.value);
    if (!post.ok) return post.response;
    if (post.value.authorId !== auth.value.id) {
      return apiError(403, "FORBIDDEN", "You can only delete your own posts");
    }

    const index = db().posts.findIndex((item) => item.id === post.value.id);
    if (index !== -1) db().posts.splice(index, 1);
    return noContent();
  }),

  http.put("*/api/posts/:id/image", async ({ request, params }) => {
    const auth = session(request, "required");
    if (!auth.ok) return auth.response;

    const id = readParam(params, "id");
    if (!id.ok) return id.response;

    const post = visiblePost(id.value, auth.value);
    if (!post.ok) return post.response;
    if (post.value.authorId !== auth.value.id) {
      return apiError(403, "FORBIDDEN", "You can only update your own posts");
    }

    const image = await readImage(request);
    if (!image.ok) return image.response;

    post.value.image = `/uploads/posts/${post.value.id}.webp`;
    return HttpResponse.json(toPost(post.value));
  }),

  http.post("*/api/posts/:id/likes", ({ request, params }) => {
    const auth = session(request, "required");
    if (!auth.ok) return auth.response;

    const id = readParam(params, "id");
    if (!id.ok) return id.response;

    const post = visiblePost(id.value, auth.value);
    if (!post.ok) return post.response;
    if (!post.value.likedBy.includes(auth.value.id)) {
      post.value.likedBy.push(auth.value.id);
    }
    return noContent();
  }),

  http.delete("*/api/posts/:id/likes", ({ request, params }) => {
    const auth = session(request, "required");
    if (!auth.ok) return auth.response;

    const id = readParam(params, "id");
    if (!id.ok) return id.response;

    const post = visiblePost(id.value, auth.value);
    if (!post.ok) return post.response;
    post.value.likedBy = post.value.likedBy.filter((userId) => userId !== auth.value.id);
    return noContent();
  }),

  http.post("*/api/posts/:id/replies", async ({ request, params }) => {
    const auth = session(request, "required");
    if (!auth.ok) return auth.response;

    const id = readParam(params, "id");
    if (!id.ok) return id.response;

    const post = visiblePost(id.value, auth.value);
    if (!post.ok) return post.response;

    const body = await readJson(request);
    if (!body.ok) return body.response;
    const unknown = unknownKeys(body.value, ["content"]);
    if (unknown) return unknown;

    const content = readBoundedString(body.value, "content", { min: 1 }, true);
    if (!content.ok) return content.response;

    const reply: MockReply = {
      id: db().nextReplyId++,
      content: content.value,
      createdAt: new Date().toISOString(),
      authorId: auth.value.id,
    };
    post.value.replies.push(reply);
    return HttpResponse.json(toReply(reply), { status: 201 });
  }),

  http.delete("*/api/posts/:id/replies/:replyId", ({ request, params }) => {
    const auth = session(request, "required");
    if (!auth.ok) return auth.response;

    const id = readParam(params, "id");
    if (!id.ok) return id.response;
    const replyId = readParam(params, "replyId");
    if (!replyId.ok) return replyId.response;

    const post = visiblePost(id.value, auth.value);
    if (!post.ok) return post.response;

    const reply = post.value.replies.find((item) => item.id === replyId.value);
    if (!reply) return apiError(404, "NOT_FOUND", "Reply not found");
    if (reply.authorId !== auth.value.id) {
      return apiError(403, "FORBIDDEN", "You can only delete your own replies");
    }

    post.value.replies = post.value.replies.filter((item) => item.id !== reply.id);
    return noContent();
  }),
];

function createToken(): string {
  return randomBytes(32).toString("hex");
}

function ok<T>(value: T): Ok<T> {
  return { ok: true, value };
}

function err(response: MockResponse): Err {
  return { ok: false, response };
}

function apiError(
  status: number,
  code: ErrorCode,
  message: string,
  details?: ErrorDetail[],
): MockResponse {
  return HttpResponse.json(
    { error: details ? { code, message, details } : { code, message } },
    { status },
  );
}

function validation(details: ErrorDetail[], message = "Invalid request data"): MockResponse {
  return apiError(400, "VALIDATION_ERROR", message, details);
}

function noContent(): MockResponse {
  return new HttpResponse(null, { status: 204 });
}

function session(request: Request, mode: "required"): Result<MockUser>;
function session(request: Request, mode: "optional"): Result<MockUser | null>;
function session(request: Request, mode: "required" | "optional"): Result<MockUser | null> {
  const header = request.headers.get("authorization");
  if (!header) {
    return mode === "required" ? err(apiError(401, "UNAUTHORIZED", "Unauthorized")) : ok(null);
  }

  const match = /^Bearer\s+(\S+)$/i.exec(header.trim());
  const user = match ? db().users.find((item) => item.token === match[1]) : undefined;
  if (!user) return err(apiError(401, "UNAUTHORIZED", "Unauthorized"));
  return ok(user);
}

function readParam(params: Params, key: string): Result<number> {
  const raw = params[key];
  if (typeof raw !== "string" || !/^[1-9]\d*$/.test(raw)) {
    return err(validation([{ path: key, message: "Invalid id" }]));
  }

  const id = Number(raw);
  if (!Number.isSafeInteger(id)) {
    return err(validation([{ path: key, message: "Invalid id" }]));
  }
  return ok(id);
}

function readPage(request: Request): Result<number> {
  const raw = new URL(request.url).searchParams.get("page");
  if (raw === null || raw === "") return ok(1);
  if (!/^[1-9]\d*$/.test(raw)) {
    return err(validation([{ path: "page", message: "Invalid page" }]));
  }

  const page = Number(raw);
  if (!Number.isSafeInteger(page)) {
    return err(validation([{ path: "page", message: "Invalid page" }]));
  }
  return ok(page);
}

async function readJson(request: Request): Promise<Result<Record<string, unknown>>> {
  try {
    const value: unknown = await request.json();
    if (!isRecord(value)) {
      return err(validation([{ path: "", message: "Expected object" }]));
    }
    return ok(value);
  } catch {
    return err(validation([{ path: "", message: "Invalid JSON" }]));
  }
}

function readBoundedString(
  body: Record<string, unknown>,
  key: string,
  bounds: { min: number; max?: number },
  required: true,
): Result<string>;
function readBoundedString(
  body: Record<string, unknown>,
  key: string,
  bounds: { min: number; max?: number },
  required: false,
): Result<string | undefined>;
function readBoundedString(
  body: Record<string, unknown>,
  key: string,
  bounds: { min: number; max?: number },
  required: boolean,
): Result<string | undefined> {
  if (!Object.hasOwn(body, key)) {
    return required
      ? err(validation([{ path: key, message: "Required" }]))
      : ok(undefined);
  }

  const raw = body[key];
  if (typeof raw !== "string") {
    return err(validation([{ path: key, message: "Expected string" }]));
  }

  const value = raw.trim();
  if (value.length < bounds.min || (bounds.max !== undefined && value.length > bounds.max)) {
    return err(validation([{ path: key, message: "Invalid length" }]));
  }
  return ok(value);
}

function readEmail(body: Record<string, unknown>): Result<string> {
  if (typeof body.email !== "string") {
    return err(validation([{ path: "email", message: "Invalid email address" }]));
  }

  const email = body.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return err(validation([{ path: "email", message: "Invalid email address" }]));
  }
  return ok(email);
}

function readPassword(body: Record<string, unknown>): Result<string> {
  if (typeof body.password !== "string" || body.password.length < 6) {
    return err(
      validation([
        {
          path: "password",
          message: "Too small: expected string to have >=6 characters",
        },
      ]),
    );
  }
  return ok(body.password);
}

type PostWrite = {
  title?: string;
  content?: string;
  premium?: boolean;
};

function readPostWrite(body: Record<string, unknown>, creating: boolean): Result<PostWrite> {
  const title = creating
    ? readBoundedString(body, "title", { min: 1, max: 200 }, true)
    : readBoundedString(body, "title", { min: 1, max: 200 }, false);
  if (!title.ok) return title;
  const content = creating
    ? readBoundedString(body, "content", { min: 1 }, true)
    : readBoundedString(body, "content", { min: 1 }, false);
  if (!content.ok) return content;

  let premium: boolean | undefined;
  if (Object.hasOwn(body, "premium")) {
    if (typeof body.premium !== "boolean") {
      return err(validation([{ path: "premium", message: "Expected boolean" }]));
    }
    premium = body.premium;
  }

  return ok({
    title: title.value,
    content: content.value,
    premium,
  });
}

function unknownKeys(body: Record<string, unknown>, allowed: string[]): MockResponse | null {
  const details = Object.keys(body)
    .filter((key) => !allowed.includes(key))
    .map((path) => ({ path, message: "Unrecognized key" }));
  return details.length > 0 ? validation(details) : null;
}

async function readImage(request: Request): Promise<Result<File>> {
  let body: FormData;
  try {
    body = await request.formData();
  } catch {
    return err(imageError("Image file is required", "Image file is required"));
  }

  const image = body.get("image");
  if (!(image instanceof File) || image.size === 0) {
    return err(imageError("Image file is required", "Image file is required"));
  }
  if (!IMAGE_TYPES.has(image.type)) {
    return err(imageError("Invalid file type", "File type must be jpeg, png or webp"));
  }
  if (image.size > MAX_IMAGE_BYTES) {
    return err(imageError("Invalid image", "File is too large"));
  }
  return ok(image);
}

function imageError(message: string, detail: string): MockResponse {
  return validation([{ path: "image", message: detail }], message);
}

function visiblePost(id: number, user: MockUser | null): Result<MockPost> {
  const post = db().posts.find((item) => item.id === id);
  if (!post || (post.premium && user?.premium !== true)) {
    return err(apiError(404, "NOT_FOUND", "Post not found"));
  }
  return ok(post);
}

function toAuth(user: MockUser): AuthResponse {
  return { token: user.token, user: toUser(user) };
}

function toUser(user: MockUser): User {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
  };
}

function toMe(user: MockUser): Me {
  return { ...toUser(user), premium: user.premium };
}

function toAuthor(userId: number): Author {
  const user = db().users.find((item) => item.id === userId);
  if (!user) throw new Error(`Mock sem autor ${userId}`);
  return { id: user.id, name: user.name };
}

function toPost(post: MockPost): Post {
  return {
    id: post.id,
    title: post.title,
    content: post.content,
    image: post.image,
    premium: post.premium,
    createdAt: post.createdAt,
    author: toAuthor(post.authorId),
  };
}

function toListItem(post: MockPost): PostListItem {
  return {
    ...toPost(post),
    likesCount: post.likedBy.length,
  };
}

function toDetail(post: MockPost, user: MockUser | null): PostDetail {
  const replies = [...post.replies].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return {
    ...toListItem(post),
    likedByMe: user !== null && post.likedBy.includes(user.id),
    replies: replies.map(toReply),
  };
}

function toReply(reply: MockReply): Reply {
  return {
    id: reply.id,
    content: reply.content,
    createdAt: reply.createdAt,
    author: toAuthor(reply.authorId),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
