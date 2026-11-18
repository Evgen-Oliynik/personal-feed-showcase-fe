export const TOPICS_KEY = "pfs.topics";
export const MAX_TOPICS = 10;

const NAME = /^[a-z0-9][a-z0-9 .+#-]*$/;

/** Mirrors the backend's rule: expects an already trimmed, collapsed, lowercased name. */
export function isValidTopicName(name: string): boolean {
  return name.length >= 1 && name.length <= 40 && NAME.test(name);
}

function clean(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const names: string[] = [];
  for (const entry of value) {
    if (typeof entry !== "string") continue;
    const name = entry.trim().replace(/\s+/g, " ").toLowerCase();
    if (isValidTopicName(name) && !names.includes(name)) names.push(name);
    if (names.length === MAX_TOPICS) break;
  }
  return names;
}

export function readTopics(): string[] {
  try {
    const raw = window.localStorage.getItem(TOPICS_KEY);
    return raw === null ? [] : clean(JSON.parse(raw));
  } catch {
    return [];
  }
}

/** Returns false when the browser refused the write. */
export function writeTopics(names: string[]): boolean {
  try {
    window.localStorage.setItem(TOPICS_KEY, JSON.stringify(clean(names)));
    return true;
  } catch {
    return false;
  }
}
