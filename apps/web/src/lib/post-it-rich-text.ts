const ALLOWED_TAG = /^(b|i|s|br)$/i;

const INVISIBLE_CHARS = /[\u200b\u200c\u200d\ufeff]/g;

/** Strip tags for plain-text length checks and font fitting. */
export function stripPostItHtml(html: string): string {
  if (!html) return "";
  if (!html.includes("<")) return html.replace(INVISIBLE_CHARS, "").trim();

  return html
    .replace(INVISIBLE_CHARS, "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(b|i|s|strong|em|strike|del)>/gi, "")
    .replace(/<(b|i|s|strong|em|strike|del)(\s[^>]*)?>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
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
      .replace(INVISIBLE_CHARS, "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return "";

  const el = node as HTMLElement;
  const tag = normalizeTagName(el.tagName);

  if (!tag) {
    const block = /^(div|p|li|h[1-6])$/i.test(el.tagName);
    const inner = Array.from(el.childNodes).map(serializeNode).join("");
    if (block) {
      if (!inner) return "<br>";
      const next = el.nextSibling;
      const needsBr =
        next &&
        next.nodeType === Node.ELEMENT_NODE &&
        /^(div|p|li|h[1-6])$/i.test((next as HTMLElement).tagName);
      return needsBr ? `${inner}<br>` : inner;
    }
    return inner;
  }

  if (tag === "br") return "<br>";

  const inner = Array.from(el.childNodes).map(serializeNode).join("");
  if (!inner) return "";
  return `<${tag}>${inner}</${tag}>`;
}

/** Client-side sanitize via DOM walk. */
export function sanitizePostItHtmlClient(raw: string): string {
  if (!raw) return "";
  const trimmed = raw.replace(INVISIBLE_CHARS, "").trim();
  if (!trimmed.includes("<")) return trimmed;

  const doc = new DOMParser().parseFromString(trimmed, "text/html");
  let out = Array.from(doc.body.childNodes).map(serializeNode).join("");
  out = out.replace(/(<br>)+$/i, "").trim();
  out = out.replace(/^(<br>)+/i, "").trim();

  const plain = stripPostItHtml(out);
  if (!plain) return "";

  if (!out.includes("<")) return plain;
  return out;
}

/** Server-safe sanitize (regex) — keep b, i, s, br only. */
export function sanitizePostItHtmlServer(raw: string): string {
  if (!raw) return "";
  let s = raw.replace(INVISIBLE_CHARS, "").trim();
  if (!s.includes("<")) return s;

  s = s.replace(/<script[\s\S]*?<\/script>/gi, "");
  s = s.replace(/<style[\s\S]*?<\/style>/gi, "");
  s = s.replace(/<\/?(strong)>/gi, (m) => m.replace(/strong/i, "b"));
  s = s.replace(/<\/?(em)>/gi, (m) => m.replace(/em/i, "i"));
  s = s.replace(/<\/?(strike|del)>/gi, (m) => m.replace(/strike|del/i, "s"));
  s = s.replace(/<\/(div|p|li|h[1-6])>/gi, "<br>");
  s = s.replace(/<(div|p|li|h[1-6])(\s[^>]*)?>/gi, "");
  s = s.replace(/<span(\s[^>]*)?>/gi, "");
  s = s.replace(/<\/span>/gi, "");
  s = s.replace(/<(b|i|s|br)(\s[^>]*)?>/gi, "<$1>");
  s = s.replace(/<\/(b|i|s|br)>/gi, "</$1>");
  s = s.replace(/<(?!\/?(?:b|i|s|br)\s*>)[^>]+>/gi, "");
  s = s.replace(/(<br>){3,}/gi, "<br><br>");
  s = s.replace(/^(<br>)+|(<br>)+$/gi, "");
  s = s.trim();

  if (!stripPostItHtml(s)) return "";
  if (!s.includes("<")) return stripPostItHtml(s);
  return s;
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
