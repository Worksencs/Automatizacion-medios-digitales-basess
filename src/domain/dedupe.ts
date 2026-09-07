import { createHash } from "node:crypto";

const STOP_WORDS = new Set(["el", "la", "los", "las", "de", "del", "en", "un", "una", "y", "a", "por", "para", "con"]);

export function normalizeTitle(title: string) {
  return title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((word) => word && !STOP_WORDS.has(word)).join(" ").trim();
}

export function makeDedupeKey(title: string, url?: string | null) {
  const normalizedUrl = url ? new URL(url).toString().replace(/\/$/, "") : "";
  return createHash("sha256").update(`${normalizeTitle(title)}|${normalizedUrl}`).digest("hex");
}

export function titleSimilarity(left: string, right: string) {
  const a = new Set(normalizeTitle(left).split(" ").filter(Boolean));
  const b = new Set(normalizeTitle(right).split(" ").filter(Boolean));
  if (!a.size || !b.size) return 0;
  const intersection = [...a].filter((token) => b.has(token)).length;
  return intersection / new Set([...a, ...b]).size;
}

export function areLikelyDuplicates(left: string, right: string, threshold = 0.72) { return titleSimilarity(left, right) >= threshold; }
