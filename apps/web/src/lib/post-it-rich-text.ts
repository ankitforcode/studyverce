const ALLOWED_TAG = /^(b|i|s|br)$/i;

/** Strip tags for plain-text length checks and font fitting. */
export function stripPostItHtml(html: string): string {
  if (!html) return "";
  if (!html.includes("<")) return html;

  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(b|i|s|strong|em|strike|del)>/gi, "")
    .replace(/<(b|i|s|strong|em|strike|del)(\s[^>]*)?>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

export function isPostItHtmlEmpty(html: string): boolean {
  return stripPostItHtml(html).length === 0;
}

function normalizeTagName(tag: string): string | null {
  const lower = tag.toLowerCase();
  if (lower === "strong") return "b";
  if (lower === "em") return "i";
  if (lower === "strike" || lower === "del") return "s";
  if (ALLOWED_TAG.test(lower)) return lower;
  return null;
}

function serializeNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return (node.textContent ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return "";

  const el = node as HTMLElement;
  const tag = normalizeTagName(el.tagName);
  if (!tag) {
    return Array.from(el.childNodes).map(serializeNode).join("");
  }

  if (tag === "br") return "<br>";

  const inner = Array.from(el.childNodes).map(serializeNode).join("");
  if (!inner && tag !== "br") return "";
  return `<${tag}>${inner}</${tag}>`;
}

/** Client-side sanitize via DOM walk. */
export function sanitizePostItHtmlClient(raw: string): string {
  if (!raw) return "";
  if (!raw.includes("<")) return raw.trim();

  const doc = new DOMParser().parseFromString(raw, "text/html");
  const out = Array.from(doc.body.childNodes).map(serializeNode).join("");
  return out.trim();
}

/** Server-safe sanitize (regex) — keep b, i, s, br only. */
export function sanitizePostItHtmlServer(raw: string): string {
  if (!raw) return "";
  if (!raw.includes("<")) return raw.trim();

  let s = raw.replace(/<script[\s\S]*?<\/script>/gi, "");
  s = s.replace(/<style[\s\S]*?<\/style>/gi, "");
  s = s.replace(/<\/?(strong)>/gi, (m) => m.replace(/strong/i, "b"));
  s = s.replace(/<\/?(em)>/gi, (m) => m.replace(/em/i, "i"));
  s = s.replace(/<\/?(strike|del)>/gi, (m) => m.replace(/strike|del/i, "s"));
  s = s.replace(/<(b|i|s|br)(\s[^>]*)?>/gi, "<$1>");
  s = s.replace(/<\/(b|i|s|br)>/gi, "</$1>");
  s = s.replace(/<(?!\/?(?:b|i|s|br)\s*>)[^>]+>/gi, "");
  return s.trim();
}

export function sanitizePostItHtml(raw: string): string {
  if (typeof document !== "undefined") {
    return sanitizePostItHtmlClient(raw);
  }
  return sanitizePostItHtmlServer(raw);
}

export type PostItTextFormat = "bold" | "italic" | "strike";

const EXEC_COMMAND: Record<PostItTextFormat, string> = {
  bold: "bold",
  italic: "italic",
  strike: "strikeThrough",
};

export function applyPostItTextFormat(
  element: HTMLElement,
  format: PostItTextFormat
): string {
  element.focus();
  document.execCommand(EXEC_COMMAND[format], false);
  return sanitizePostItHtml(element.innerHTML);
}

export function sanitizePostItTitle(raw: string): string {
  return sanitizePostItHtml(raw);
}

export function sanitizePostItItems(items: { id: string; text: string; done: boolean }[]) {
  return items.map((item) => ({
    ...item,
    text: sanitizePostItHtml(item.text),
  }));
}

/** Match rendered note styles so edit and view modes look the same. */
export const POST_IT_RICH_TEXT_CLASS =
  "[&_b]:font-bold [&_i]:italic [&_s]:line-through";

/** Read every contenteditable field in the note before save. */
export function flushPostItEditorsFromNote(
  noteRoot: HTMLElement | null,
  draft: { title: string; items: { id: string; text: string; done: boolean }[] }
): { title: string; items: { id: string; text: string; done: boolean }[] } {
  if (!noteRoot) return draft;

  let title = draft.title;
  const titleEl = noteRoot.querySelector<HTMLDivElement>('[data-field="title"]');
  if (titleEl) {
    title = sanitizePostItHtml(titleEl.innerHTML);
  }

  const itemHtml = new Map<string, string>();
  noteRoot.querySelectorAll<HTMLDivElement>('[data-field="item"]').forEach((el) => {
    const id = el.dataset.itemId;
    if (id) itemHtml.set(id, sanitizePostItHtml(el.innerHTML));
  });

  const items = draft.items.map((item) => ({
    ...item,
    text: itemHtml.get(item.id) ?? item.text,
  }));

  return { title, items };
}
