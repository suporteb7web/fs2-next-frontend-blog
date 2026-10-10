/** Cookie httpOnly com o token de sessão (hex) devolvido no cadastro e no login. */
export const AUTH_COOKIE_NAME = "token";

const GUEST_PATHS = new Set(["/login", "/cadastro"]);

export function isGuestPath(pathname: string): boolean {
  return GUEST_PATHS.has(pathname);
}

export function isProtectedPath(pathname: string): boolean {
  return pathname === "/posts/novo" || pathname.startsWith("/posts/novo/");
}

/** Caminho interno para o redirect pós-login. Descarta URLs externas e as próprias telas de auth. */
export function safeNextPath(value: unknown): string {
  if (typeof value !== "string" || value.length === 0 || value.length > 2048) {
    return "/";
  }

  let decoded: string;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return "/";
  }

  if (!isLocalPath(value) || !isLocalPath(decoded)) return "/";

  const pathname = value.split("?")[0] ?? value;
  if (isGuestPath(pathname)) return "/";

  return value;
}

function isLocalPath(value: string): boolean {
  return (
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.startsWith("/\\") &&
    !value.includes("\\") &&
    !value.includes("://") &&
    !/[\u0000-\u001F\u007F]/.test(value)
  );
}
