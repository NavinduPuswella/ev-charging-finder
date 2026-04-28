export const MAX_DESCRIPTION_WORDS = 120;
export const DESCRIPTION_WORD_ERROR = `Description must be ${MAX_DESCRIPTION_WORDS} words or less.`;
export const DESCRIPTION_PLACEHOLDER =
    "Add station details such as opening hours, parking notes, nearby landmarks, facilities, or charging instructions.";

export function countWords(text: string | undefined | null): number {
    if (!text) return 0;
    const trimmed = String(text).trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).filter(Boolean).length;
}

export function sanitizeDescription(text: string | undefined | null): string {
    if (!text) return "";
    const stripped = String(text).replace(/<[^>]*>/g, "");

    const cleaned = stripped.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");

    const normalizedNewlines = cleaned.replace(/\r\n?/g, "\n").replace(/\n{3,}/g, "\n\n");

    const trimmedLines = normalizedNewlines
        .split("\n")
        .map((line) => line.replace(/[ \t]+/g, " ").trim())
        .join("\n")
        .trim();

    return trimmedLines;
}

export function validateDescription(text: string | undefined | null): string | null {
    if (text === undefined || text === null) return null;
    const sanitized = sanitizeDescription(text);
    if (!sanitized) return null;
    if (countWords(sanitized) > MAX_DESCRIPTION_WORDS) {
        return DESCRIPTION_WORD_ERROR;
    }
    return null;
}
