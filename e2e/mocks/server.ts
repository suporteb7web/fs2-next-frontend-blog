import { setupServer } from "msw/node";
import { handlers } from "./handlers";

const RUNTIME_KEY = Symbol.for("next-frontend-blog.e2e.msw");

type MswRuntime = {
  listening: boolean;
  server: ReturnType<typeof setupServer>;
};

type GlobalWithRuntime = typeof globalThis & {
  [RUNTIME_KEY]?: MswRuntime;
};

export function listen(): void {
  const root = globalThis as GlobalWithRuntime;
  const runtime = (root[RUNTIME_KEY] ??= {
    listening: false,
    server: setupServer(...handlers),
  });
  if (runtime.listening) return;
  runtime.server.listen({ onUnhandledRequest: "bypass" });
  runtime.listening = true;
}
