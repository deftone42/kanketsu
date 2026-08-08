const HTML_ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&apos;": "'",
  "&nbsp;": " ",
  "&#039;": "'",
};

function decodeEntities(text: string): string {
  return text.replace(
    /&(?:amp|lt|gt|quot|apos|nbsp|#039);/g,
    (entity) => HTML_ENTITIES[entity] ?? entity,
  );
}

export function toPlainText(raw: string | null | undefined): string | null {
  if (raw == null) return null;

  const stripped = decodeEntities(raw.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();

  return stripped.length > 0 ? stripped : null;
}
