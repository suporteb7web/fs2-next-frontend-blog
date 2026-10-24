import { seedPosts, seedUsers, type MockPost, type MockUser } from "./data";

export type MockStore = {
  users: MockUser[];
  posts: MockPost[];
  nextUserId: number;
  nextPostId: number;
  nextReplyId: number;
};

const STORE_KEY = Symbol.for("next-frontend-blog.e2e.mock");

type GlobalWithStore = typeof globalThis & {
  [STORE_KEY]?: MockStore;
};

export function getMockStore(): MockStore {
  const root = globalThis as GlobalWithStore;
  const current = root[STORE_KEY];
  if (current) return current;

  const users = structuredClone(seedUsers);
  const posts = structuredClone(seedPosts);
  const store: MockStore = {
    users,
    posts,
    nextUserId: maxId(users.map((user) => user.id)) + 1,
    nextPostId: maxId(posts.map((post) => post.id)) + 1,
    nextReplyId: maxId(posts.flatMap((post) => post.replies.map((reply) => reply.id))) + 1,
  };
  root[STORE_KEY] = store;
  return store;
}

function maxId(ids: number[]): number {
  return ids.reduce((max, id) => Math.max(max, id), 0);
}
