import { type PublicUser, type UserRole } from "~/types/auth";
import { fetchFromBackend } from "~/utils/backend";

const STORAGE_KEY = "moto_auth_token";

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
  localStorage.setItem(STORAGE_KEY, token);
}

export function clearSessionToken() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

export async function getCurrentSession(): Promise<AuthSession> {
  const token = getSessionToken();

  if (!token) {
    return { user: null, token: null };
  }

  try {
    const response = await fetchFromBackend<any>("/auth/me", {}, token);

    return {
      user: toPublicUser(response.user),
      token,
    };
  } catch (error) {
    // If it's a redirect response (likely 401 from fetchFromBackend), let it bubble up or handle it
    if (error instanceof Response) {
      clearSessionToken();
      return { user: null, token: null };
    }

    // If we are offline or have a network error and no cache, don't clear the token
    // Just return no user for now, but keep the token for later
    return {
      user: null,
      token: null,
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

export async function createUser(input: any): Promise<PublicUser> {
  console.log(`[Auth Service] Calling /auth/register for: ${input.username}`);
  const user = await fetchFromBackend<any>("/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
  console.log(`[Auth Service] /auth/register response:`, user);

  return toPublicUser(user);
}

export async function updateUser(userId: number, input: any, token: string): Promise<PublicUser> {
  const user = await fetchFromBackend<any>(
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
    console.log(`[Auth Service] Calling /auth/login for: ${identifier}`);
    const response = await fetchFromBackend<{ user: any; token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ identifier, password }),
    });
    console.log(`[Auth Service] /auth/login successful for: ${identifier}`);

    return {
      user: toPublicUser(response.user),
      token: response.token,
    };
  } catch (error) {
    console.error(`[Auth Service] /auth/login failed for: ${identifier}`, error);
    return null;
  }
}

export async function requireUser(request: Request) {
  console.log(`[Auth Service] Checking requirement for user at: ${request.url}`);
  const { user, token } = await getCurrentSession();
  console.log(`[Auth Service] Current session status:`, user ? `Logged in as ${user.username}` : "Not logged in");

  if (!user || !token) {
    const url = new URL(request.url);
    const redirectTo = encodeURIComponent(url.pathname + url.search + url.hash);
    
    // In SPA mode, we can't easily set Location header on a response thrown from a client side function
    // and expect the browser to follow it. Instead, we can throw a redirect response which React Router handles.
    const { redirect } = await import("react-router");
    console.log(`[Auth Service] Redirecting to login, target: ${redirectTo}`);
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
  const response = await fetchFromBackend<{ users: any[] }>("/admin/users", {}, token);
  return response.users.map(toPublicUser);
}

export async function deleteUser(userId: number, token: string) {
  await fetchFromBackend(`/admin/users/${userId}`, { method: "DELETE" }, token);
}

export function isPublicPath(pathname: string) {
  return ["/auth/login", "/auth/register"].includes(pathname);
}

export { USER_ROLES, type UserRole, type PublicUser } from "~/types/auth";
