"use client";

import { useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { POST_IT_RICH_TEXT_CLASS, sanitizePostItHtml } from "@/lib/post-it-rich-text";

interface PostItRichTextFieldProps {
  value: string;
  onChange: (html: string) => void;
  onFocus?: (element: HTMLDivElement) => void;
  onBlur?: () => void;
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
  onBlur,
  onKeyDown,
  placeholder,
  className,
  itemId,
  field = "item",
}: PostItRichTextFieldProps) {
  const ref = useRef<HTMLDivElement>(null);
  const lastEmittedRef = useRef(value);
  const composingRef = useRef(false);

  const emitChange = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const html = sanitizePostItHtml(el.innerHTML);
    if (html === lastEmittedRef.current) return;
    lastEmittedRef.current = html;
    onChange(html);
  }, [onChange]);

  useEffect(() => {
    const el = ref.current;
    if (!el || document.activeElement === el || composingRef.current) return;
    const next = value || "";
    if (next === lastEmittedRef.current && el.innerHTML === next) return;
    lastEmittedRef.current = next;
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
      data-ph-mask
      data-field={field}
      data-item-id={itemId}
      data-placeholder={placeholder}
      onFocus={() => {
        const el = ref.current;
        if (el) onFocus?.(el);
      }}
      onBlur={() => {
        emitChange();
        onBlur?.();
      }}
      onInput={emitChange}
      onCompositionStart={() => {
        composingRef.current = true;
      }}
      onCompositionEnd={() => {
        composingRef.current = false;
        emitChange();
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
