"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { POST_IT_RICH_TEXT_CLASS, sanitizePostItHtml } from "@/lib/post-it-rich-text";

interface PostItRichTextFieldProps {
  value: string;
  onChange: (html: string) => void;
  onFocus?: (element: HTMLDivElement) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  placeholder?: string;
  className?: string;
  itemId?: string;
  field?: "title" | "item";
}

export function PostItRichTextField({
  value,
  onChange,
  onFocus,
  onKeyDown,
  placeholder,
  className,
  itemId,
  field = "item",
}: PostItRichTextFieldProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || document.activeElement === el) return;
    const next = value || "";
    if (el.innerHTML !== next) {
      el.innerHTML = next;
    }
  }, [value]);

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-multiline={field === "item"}
      data-no-drag
      data-field={field}
      data-item-id={itemId}
      data-placeholder={placeholder}
      onFocus={() => {
        const el = ref.current;
        if (el) onFocus?.(el);
      }}
      onInput={() => {
        const el = ref.current;
        if (!el) return;
        onChange(sanitizePostItHtml(el.innerHTML));
      }}
      onKeyDown={onKeyDown}
      className={cn(
        "min-w-0 outline-none empty:before:text-[#323338]/40 empty:before:content-[attr(data-placeholder)]",
        POST_IT_RICH_TEXT_CLASS,
        className
      )}
    />
  );
}
