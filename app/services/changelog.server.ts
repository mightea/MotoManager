import { createCookie } from "react-router";
import fs from "node:fs";
import path from "node:path";

const CHANGELOG_COOKIE_NAME = "moto_changelog_seen";
const COOKIE_DURATION = 31536000; // One year

export const changelogCookie = createCookie(CHANGELOG_COOKIE_NAME, {
  path: "/",
  sameSite: "lax",
  httpOnly: true,
  maxAge: COOKIE_DURATION,
});

export interface ChangelogEntry {
  version: string;
  content: string;
}

/**
 * Parses the latest entry from the CHANGELOG.md content.
 */
function parseLatestChangelog(content: string): ChangelogEntry | null {
  const sections = content.split(/^## /m);
  if (sections.length < 2) return null;
  
  const latest = sections[1];
  const lines = latest.split("\n");
  const titleLine = lines[0];
  const bodyLines = lines.slice(1);
  
  const versionMatch = titleLine.match(/\[(.*?)\]/);
  const version = versionMatch ? versionMatch[1] : titleLine.trim();
  
  return {
    version,
    content: bodyLines.join("\n").trim(),
  };
}

/**
 * Gets the latest changelog if it hasn't been seen by the user yet.
 */
export async function getNewChangelog(request: Request): Promise<ChangelogEntry | null> {
  const cookieHeader = request.headers.get("Cookie");
  const seenVersion = await changelogCookie.parse(cookieHeader);
  
  const currentVersion = process.env.APP_VERSION;
  
  if (seenVersion === currentVersion) {
    return null;
  }
  
  try {
    const changelogPath = path.join(process.cwd(), "CHANGELOG.md");
    if (!fs.existsSync(changelogPath)) {
      return null;
    }
    
    const content = fs.readFileSync(changelogPath, "utf-8");
    const latest = parseLatestChangelog(content);
    
    if (latest && latest.version === currentVersion) {
      return latest;
    }
    
    return null;
  } catch (error) {
    console.error("Failed to read changelog:", error);
    return null;
  }
}

/**
 * Serializes the cookie to mark a version as seen.
 */
export async function markChangelogSeen(version: string) {
  return await changelogCookie.serialize(version);
}
