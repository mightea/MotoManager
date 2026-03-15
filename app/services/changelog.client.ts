export interface ChangelogEntry {
  version: string;
  content: string;
}

const STORAGE_KEY = "moto_changelog_seen";

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
export async function getNewChangelog(): Promise<ChangelogEntry | null> {
  if (typeof window === "undefined") return null;
  
  const seenVersion = localStorage.getItem(STORAGE_KEY);
  
  try {
    const response = await fetch("/CHANGELOG.md");
    if (!response.ok) return null;
    
    const content = await response.text();
    const latest = parseLatestChangelog(content);
    
    if (latest && latest.version !== seenVersion) {
      return latest;
    }
    
    return null;
  } catch (error) {
    console.error("Failed to read changelog:", error);
    return null;
  }
}

/**
 * Marks a version as seen.
 */
export function markChangelogSeen(version: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, version);
}
