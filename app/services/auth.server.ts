import { randomBytes, timingSafeEqual, scrypt as nodeScrypt } from "node:crypto";
import { promisify } from "node:util";
import { eq, sql } from "drizzle-orm";
import { getDb } from "~/db";
import {
  sessions,
  users,
  motorcycles,
  locations,
  type Session,
  type User,
  type NewUser,
  type NewSession,
} from "~/db/schema";
import {
  USER_ROLES,
  type PublicUser,
  type UserRole,
} from "~/types/auth";

const scrypt = promisify(nodeScrypt);

const SESSION_COOKIE_NAME = "mb_session";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 14; // 14 days

const SECURE_COOKIE = process.env.NODE_ENV === "production";

export function toPublicUser(user: User): PublicUser {
  const { passwordHash: _passwordHash, ...rest } = user;
  return {
    ...rest,
    username: rest.username,
    role: (rest.role as UserRole) ?? "user",
  } satisfies PublicUser;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${derivedKey.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  hashed: string
): Promise<boolean> {
  const [salt, key] = hashed.split(":");
  if (!salt || !key) {
    return false;
  }

  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  const keyBuffer = Buffer.from(key, "hex");

  if (derivedKey.length !== keyBuffer.length) {
    return false;
  }

  return timingSafeEqual(derivedKey, keyBuffer);
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

  return header
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE_NAME}=`))
    ?.slice(SESSION_COOKIE_NAME.length + 1) ?? null;
}

export type AuthSession = {
  user: User | null;
  session: Session | null;
  headers: Record<string, string>;
};

export async function getCurrentSession(request: Request): Promise<AuthSession> {
  const token = parseCookieHeader(request);

  if (!token) {
    return { user: null, session: null, headers: {} };
  }

  const db = await getDb();

  const session = await db.query.sessions.findFirst({
    where: eq(sessions.token, token),
  });

  if (!session) {
    return {
      user: null,
      session: null,
      headers: { "Set-Cookie": clearCookie() },
    };
  }

  const expiresAt = new Date(session.expiresAt);
  if (Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date()) {
    await db.delete(sessions).where(eq(sessions.id, session.id));
    return {
      user: null,
      session: null,
      headers: { "Set-Cookie": clearCookie() },
    };
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.userId),
  });

  if (!user) {
    await db.delete(sessions).where(eq(sessions.id, session.id));
    return {
      user: null,
      session: null,
      headers: { "Set-Cookie": clearCookie() },
    };
  }

  const renewedExpiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();
  await db
    .update(sessions)
    .set({ expiresAt: renewedExpiresAt })
    .where(eq(sessions.id, session.id));

  return {
    user,
    session: { ...session, expiresAt: renewedExpiresAt },
    headers: { "Set-Cookie": buildCookie(token, SESSION_DURATION_MS / 1000) },
  };
}

export async function createSession(userId: number) {
  const db = await getDb();
  const token = randomBytes(40).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();

  const newSession: NewSession = {
    token,
    userId,
    expiresAt,
  };

  await db.insert(sessions).values(newSession);

  return {
    token,
    headers: { "Set-Cookie": buildCookie(token, SESSION_DURATION_MS / 1000) },
  };
}

export async function destroySessionByToken(token: string | null | undefined) {
  if (!token) {
    return { headers: { "Set-Cookie": clearCookie() } };
  }

  const db = await getDb();
  await db.delete(sessions).where(eq(sessions.token, token));

  return { headers: { "Set-Cookie": clearCookie() } };
}

export async function destroySessionFromRequest(request: Request) {
  const token = parseCookieHeader(request);
  return destroySessionByToken(token);
}

export async function findUserByEmail(email: string) {
  const db = await getDb();
  const normalized = normalizeEmail(email);
  return db.query.users.findFirst({ where: eq(users.email, normalized) });
}

export async function findUserByUsername(username: string) {
  const db = await getDb();
  const normalized = normalizeUsername(username);
  return db.query.users.findFirst({ where: eq(users.username, normalized) });
}

export async function getUserCount() {
  const db = await getDb();
  const [result] = await db.select({ count: sql<number>`count(*)` }).from(users);

  return result?.count ?? 0;
}

export async function createUser(
  input: Pick<NewUser, "email" | "name" | "username"> & {
    password: string;
    role?: UserRole;
  }
): Promise<PublicUser> {
  const db = await getDb();

  const normalizedEmail = normalizeEmail(input.email);
  const existing = await findUserByEmail(normalizedEmail);
  if (existing) {
    throw new Error("Es existiert bereits ein Benutzer mit dieser E-Mail-Adresse.");
  }

  const normalizedUsername = normalizeUsername(input.username);
  const existingByUsername = await findUserByUsername(normalizedUsername);
  if (existingByUsername) {
    throw new Error("Benutzername ist bereits vergeben.");
  }

  const passwordHash = await hashPassword(input.password);

  const role: UserRole = input.role ?? "user";

  const [inserted] = await db
    .insert(users)
    .values({
      email: normalizedEmail,
      username: normalizedUsername,
      name: input.name.trim(),
      passwordHash,
      role,
    })
    .returning();

  return toPublicUser(inserted);
}

export async function updateUserPassword(userId: number, password: string) {
  const db = await getDb();
  const passwordHash = await hashPassword(password);

  await db
    .update(users)
    .set({
      passwordHash,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(users.id, userId));
}

export async function verifyLogin(
  identifier: string,
  password: string
): Promise<User | null> {
  const normalized = identifier.trim().toLowerCase();

  let user = await findUserByEmail(normalized);

  if (!user) {
    user = await findUserByUsername(normalized);
  }

  if (!user) {
    return null;
  }

  const match = await verifyPassword(password, user.passwordHash);
  return match ? user : null;
}

export async function requireUser(request: Request) {
  const { user, headers } = await getCurrentSession(request);
  if (!user) {
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

  return { user, headers };
}

export function requireAdmin(user: User) {
  if (user.role !== "admin") {
    throw new Response("Nicht erlaubt", { status: 403 });
  }
}

export async function updateUserRole(userId: number, role: UserRole) {
  const db = await getDb();
  const [updated] = await db
    .update(users)
    .set({
      role,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(users.id, userId))
    .returning();

  if (!updated) {
    throw new Response("Benutzer nicht gefunden", { status: 404 });
  }

  return toPublicUser(updated);
}

export async function deleteUser(userId: number) {
  const db = await getDb();
  await db.delete(users).where(eq(users.id, userId));
}

export async function listUsers(): Promise<PublicUser[]> {
  const db = await getDb();
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      username: users.username,
      name: users.name,
      role: users.role,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .orderBy(users.name);

  return rows.map((row) => ({
    ...row,
    role: (row.role as UserRole) ?? "user",
  }));
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

export async function adoptOrphanedRecords(ownerUserId: number) {
  const db = await getDb();

  const placeholder = await db.query.users.findFirst({
    where: eq(users.username, "system"),
  });

  if (!placeholder) {
    return;
  }

  await db
    .update(motorcycles)
    .set({ userId: ownerUserId })
    .where(eq(motorcycles.userId, placeholder.id));

  await db
    .update(locations)
    .set({ userId: ownerUserId })
    .where(eq(locations.userId, placeholder.id));
}
