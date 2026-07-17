import { z } from "zod";
import { type PublicUser, type UserRole } from "~/types/auth";
import { fetchFromBackend } from "~/utils/backend";
import { cachedFetch, clearRequestCache } from "~/utils/request-cache";

const STORAGE_KEY = "moto_auth_token";
const SESSION_TTL_MS = 60_000;

// Lenient runtime validation of the auth boundary: require only the essential
// identity fields (so a valid-but-evolving backend response isn't rejected),
// tolerate extra fields, and catch gross drift (e.g. an HTML error page decoded
// as JSON, or a missing token).
const authUserSchema = z
  .object({
    id: z.number(),
    username: z.string(),
    email: z.string(),
    name: z.string().nullish(),
    role: z.string().nullish(),
    createdAt: z.string().nullish(),
    updatedAt: z.string().nullish(),
    lastLoginAt: z.string().nullish(),
  })
  .passthrough();

const meResponseSchema = z.object({ user: authUserSchema }).passthrough();
const loginResponseSchema = z
  .object({ user: authUserSchema, token: z.string().min(1) })
  .passthrough();

/** Raw user shape as the backend returns it (lenient — see `authUserSchema`). */
type AuthUser = z.infer<typeof authUserSchema>;

export function toPublicUser(user: AuthUser): PublicUser {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    name: user.name as string,
    role: (user.role as UserRole) ?? "user",
    createdAt: user.createdAt as string,
    updatedAt: user.updatedAt as string,
    lastLoginAt: user.lastLoginAt,
  } satisfies PublicUser;
}

export type AuthSession = {
  user: PublicUser | null;
  token: string | null;
};

export function getSessionToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEY);
}

export function setSessionToken(token: string) {
  if (typeof window === "undefined") return;
  // The user (or their permissions) may have changed — drop all cached responses.
  clearRequestCache();
  localStorage.setItem(STORAGE_KEY, token);
}

export function clearSessionToken() {
  if (typeof window === "undefined") return;
  clearRequestCache();
  localStorage.removeItem(STORAGE_KEY);
}

export async function getCurrentSession(): Promise<AuthSession> {
  const token = getSessionToken();

  if (!token) {
    return { user: null, token: null };
  }

  try {
    const response = await cachedFetch(`session:${token}`, SESSION_TTL_MS, () =>
      fetchFromBackend<unknown>("/auth/me", {}, token),
    );

    const parsed = meResponseSchema.safeParse(response);
    if (!parsed.success) {
      console.error("[Auth Service] /auth/me response failed validation", parsed.error);
      return { user: null, token };
    }

    return {
      user: toPublicUser(parsed.data.user),
      token,
    };
  } catch (error) {
    // If it's a redirect response (likely 401 from fetchFromBackend), let it bubble up or handle it
    if (error instanceof Response) {
      clearSessionToken();
      return { user: null, token: null };
    }

    // Offline / network / 5xx (not a 401): the session may still be valid, so
    // keep the token (it's also left in storage) rather than reporting it gone.
    // The caller still can't render authed content without a user, but the token
    // is preserved so the session resumes once the backend is reachable again.
    return {
      user: null,
      token,
    };
  }
}

export async function createSession(token: string) {
  setSessionToken(token);
  return {
    token,
  };
}

export async function destroySessionByToken(token: string | null | undefined) {
  const activeToken = token || getSessionToken();
  if (activeToken) {
    try {
      await fetchFromBackend("/auth/logout", { method: "POST" }, activeToken);
    } catch {
      // Ignore logout errors on backend
    }
  }

  clearSessionToken();
  return {};
}

export async function destroySessionFromRequest(_request: Request) {
  return destroySessionByToken(undefined);
}

export async function getUserCount() {
  try {
    const result = await fetchFromBackend<{ userCount: number }>("/auth/status");
    return result.userCount;
  } catch {
    return 0;
  }
}

export type CreateUserInput = {
  email: string;
  username: string;
  name: string;
  password: string;
  role?: UserRole;
};

export async function createUser(input: CreateUserInput): Promise<PublicUser> {
  const user = await fetchFromBackend<AuthUser>("/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });

  return toPublicUser(user);
}

export async function updateUser(userId: number, input: Partial<CreateUserInput>, token: string): Promise<PublicUser> {
  const user = await fetchFromBackend<AuthUser>(
    `/admin/users/${userId}`,
    {
      method: "PUT",
      body: JSON.stringify(input),
    },
    token,
  );

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
    const response = await fetchFromBackend<{ user: AuthUser; token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ identifier, password }),
    });

    const parsed = loginResponseSchema.safeParse(response);
    if (!parsed.success) {
      // 200 OK but a malformed body — a server problem, not bad credentials.
      console.error("[Auth Service] /auth/login response failed validation", parsed.error);
      throw new Error("Malformed login response");
    }

    return {
      user: toPublicUser(parsed.data.user),
      token: parsed.data.token,
    };
  } catch (error) {
    // A 401 means bad credentials: fetchFromBackend converts 401 into a redirect
    // Response, so treat that (and only that) as an auth failure. Any other error
    // (network / 5xx / timeout) is a transport problem and must NOT be reported as
    // "wrong password" — re-throw so the caller can show a distinct message.
    if (error instanceof Response) {
      return null;
    }
    console.error(`[Auth Service] /auth/login failed for: ${identifier}`, error);
    throw error;
  }
}

export async function requireUser(request: Request) {
  const { user, token } = await getCurrentSession();

  if (!user || !token) {
    const url = new URL(request.url);
    // Under React Router 7's v8_passThroughRequests flag the loader request can
    // carry a trailing `.data` (or `/_.data`) suffix that we don't want to feed
    // back into the redirectTo — the user expects to land on the visual route.
    const pathname = url.pathname.replace(/(?:\.data|\/_\.data)$/, "") || "/";
    const redirectTo = encodeURIComponent(pathname + url.search + url.hash);

    // In SPA mode, we can't easily set Location header on a response thrown from a client side function
    // and expect the browser to follow it. Instead, we can throw a redirect response which React Router handles.
    const { redirect } = await import("react-router");
    throw redirect(`/auth/login?redirectTo=${redirectTo}`);
  }

  return { user, token };
}

export function requireAdmin(user: PublicUser) {
  if (user.role !== "admin") {
    // For client-side forbidden, we might want to redirect to a 403 page or home
    throw new Response("Nicht erlaubt", { status: 403 });
  }
}

export async function listUsers(token: string): Promise<PublicUser[]> {
  const response = await fetchFromBackend<{ users: AuthUser[] }>("/admin/users", {}, token);
  return response.users.map(toPublicUser);
}

export async function deleteUser(userId: number, token: string) {
  await fetchFromBackend(`/admin/users/${userId}`, { method: "DELETE" }, token);
}

export function isPublicPath(pathname: string) {
  return ["/auth/login", "/auth/register"].includes(pathname);
}

export { USER_ROLES, type UserRole, type PublicUser } from "~/types/auth";
