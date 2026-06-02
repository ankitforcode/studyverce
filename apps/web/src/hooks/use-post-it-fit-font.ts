"use client";

import { useLayoutEffect, useState, type RefObject } from "react";
import {
  POST_IT_FONT_MAX,
  POST_IT_FONT_MIN,
} from "@/lib/post-it-utils";

interface UsePostItFitFontOptions {
  min?: number;
  max?: number;
  enabled?: boolean;
}

export function usePostItFitFont(
  containerRef: RefObject<HTMLElement | null>,
  deps: unknown[],
  options?: UsePostItFitFontOptions
) {
  const min = options?.min ?? POST_IT_FONT_MIN;
  const max = options?.max ?? POST_IT_FONT_MAX;
  const enabled = options?.enabled ?? true;
  const [fontSize, setFontSize] = useState(max);

  useLayoutEffect(() => {
    if (!enabled) {
      setFontSize(max);
      return;
    }

    const el = containerRef.current;
    if (!el) return;

    const measure = () => {
      let size = max;
      el.style.fontSize = `${size}px`;

      while (size > min && el.scrollHeight > el.clientHeight + 1) {
        size -= 0.5;
        el.style.fontSize = `${size}px`;
      }

      setFontSize(size);
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(el);

    return () => observer.disconnect();
  }, [containerRef, enabled, min, max, ...deps]);

  return fontSize;
}
