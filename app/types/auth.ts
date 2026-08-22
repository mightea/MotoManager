export const USER_ROLES = ["admin", "user"] as const;

export type UserRole = (typeof USER_ROLES)[number];

export type PublicUser = {
  id: number;
  email: string;
  username: string;
  name: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string | null;
  /** Last iOS app version/build seen by the backend; null for webapp-only users. */
  appVersion?: string | null;
  appBuild?: number | null;
};
