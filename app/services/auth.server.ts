import { type PublicUser, type UserRole } from "~/types/auth";
import { fetchFromBackend } from "~/utils/backend.server";

const SESSION_COOKIE_NAME = "mb_session";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 14; // 14 days

const SECURE_COOKIE = process.env.NODE_ENV === "production";

export function toPublicUser(user: any): PublicUser {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    name: user.name,
    role: (user.role as UserRole) ?? "user",
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    lastLoginAt: user.lastLoginAt,
  } satisfies PublicUser;
}

function buildCookie(token: string, maxAgeSeconds: number) {
  const segments = [
    `${SESSION_COOKIE_NAME}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAgeSeconds}`,
  ];

  if (SECURE_COOKIE) {
    segments.push("Secure");
  }

  return segments.join("; ");
}

function clearCookie() {
  return `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${
    SECURE_COOKIE ? "; Secure" : ""
  }`;
}

function parseCookieHeader(request: Request): string | null {
  const header = request.headers.get("Cookie");
  if (!header) {
    return null;
  }

  return (
    header
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${SESSION_COOKIE_NAME}=`))
      ?.slice(SESSION_COOKIE_NAME.length + 1) ?? null
  );
}

export type AuthSession = {
  user: PublicUser | null;
  token: string | null;
  headers: Record<string, string>;
};

export async function getCurrentSession(
  request: Request,
): Promise<AuthSession> {
  const token = parseCookieHeader(request);

  if (!token) {
    return { user: null, token: null, headers: {} };
  }

  try {
    const response = await fetchFromBackend<any>("/auth/me", {}, token);

    return {
      user: toPublicUser(response.user),
      token,
      headers: { "Set-Cookie": buildCookie(token, SESSION_DURATION_MS / 1000) },
    };
  } catch (_error) {
    return {
      user: null,
      token: null,
      headers: { "Set-Cookie": clearCookie() },
    };
  }
}

export async function createSession(token: string) {
  return {
    token,
    headers: { "Set-Cookie": buildCookie(token, SESSION_DURATION_MS / 1000) },
  };
}

export async function destroySessionByToken(token: string | null | undefined) {
  if (token) {
    try {
      await fetchFromBackend("/auth/logout", { method: "POST" }, token);
    } catch (_error) {
      // Ignore logout errors on backend
    }
  }

  return { headers: { "Set-Cookie": clearCookie() } };
}

export async function destroySessionFromRequest(request: Request) {
  const token = parseCookieHeader(request);
  return destroySessionByToken(token);
}

export async function getUserCount() {
  try {
    const result = await fetchFromBackend<{ userCount: number }>("/auth/status");
    return result.userCount;
  } catch (_e) {
    return 0;
  }
}

export async function createUser(
  input: any,
): Promise<PublicUser> {
  const user = await fetchFromBackend<any>("/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });

  return toPublicUser(user);
}

export async function updateUser(
  userId: number,
  input: any,
  token: string,
): Promise<PublicUser> {
  const user = await fetchFromBackend<any>(`/admin/users/${userId}`, {
    method: "PUT",
    body: JSON.stringify(input),
  }, token);

  return toPublicUser(user);
}

export async function updateUserPassword(userId: number, password: string, token: string) {
  await fetchFromBackend(`/admin/users/${userId}`, {
    method: "PUT",
    body: JSON.stringify({ password }),
  }, token);
}

export async function verifyLogin(
  identifier: string,
  password: string,
): Promise<{ user: PublicUser; token: string } | null> {
  try {
    const response = await fetchFromBackend<{ user: any; token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ identifier, password }),
    });

    return {
      user: toPublicUser(response.user),
      token: response.token,
    };
  } catch {
    return null;
  }
}

export async function requireUser(request: Request) {
  const { user, token, headers } = await getCurrentSession(request);
  if (!user || !token) {
    const url = new URL(request.url);
    const redirectTo = encodeURIComponent(url.pathname + url.search + url.hash);
    throw new Response(null, {
      status: 302,
      headers: {
        Location: `/auth/login?redirectTo=${redirectTo}`,
        ...(Object.keys(headers).length > 0 ? headers : {}),
      },
    });
  }

  return { user, token, headers };
}

export function requireAdmin(user: PublicUser) {
  if (user.role !== "admin") {
    throw new Response("Nicht erlaubt", { status: 403 });
  }
}

export async function listUsers(token: string): Promise<PublicUser[]> {
  const users = await fetchFromBackend<any[]>("/admin/users", {}, token);
  return users.map(toPublicUser);
}

export async function deleteUser(userId: number, token: string) {
  await fetchFromBackend(`/admin/users/${userId}`, { method: "DELETE" }, token);
}

export function mergeHeaders(...headerRecords: Array<Record<string, string>>) {
  const headers = new Headers();
  headerRecords
    .filter((record) => record && Object.keys(record).length > 0)
    .forEach((record) => {
      Object.entries(record).forEach(([key, value]) => {
        headers.set(key, value);
      });
    });
  return headers;
}

export function isPublicPath(pathname: string) {
  return ["/auth/login", "/auth/register"].includes(pathname);
}

export { USER_ROLES, type UserRole, type PublicUser } from "~/types/auth";
