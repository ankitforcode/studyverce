export const POST_IT_SIZE = 200;
export const POST_IT_DEFAULT_SIZE = 200;
export const POST_IT_MIN_SIZE = 140;
export const POST_IT_MAX_SIZE = 360;
export const POST_IT_SIZE_STEP = 20;
export const POST_IT_FONT_MAX = 15;
export const POST_IT_FONT_MIN = 8;

export const POST_IT_COLOR_STYLES = {
  yellow: "text-[#323338]",
  mint: "text-[#323338]",
  pink: "text-[#323338]",
  sky: "text-[#323338]",
  lavender: "text-[#323338]",
} as const;

/** Miro-style pastel fills */
export const POST_IT_BG: Record<keyof typeof POST_IT_COLOR_STYLES, string> = {
  yellow: "#FFF476",
  sky: "#85C8FF",
  pink: "#FF9EBB",
  lavender: "#C5A3FF",
  mint: "#85E0A9",
};

export const POST_IT_COLOR_LABELS: Record<keyof typeof POST_IT_COLOR_STYLES, string> = {
  yellow: "Yellow",
  sky: "Blue",
  pink: "Pink",
  lavender: "Purple",
  mint: "Green",
};

export const POST_IT_SHADOW =
  "0 2px 6px rgba(0,0,0,0.16), 0 8px 20px rgba(0,0,0,0.2), 0 16px 40px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.06)";

export const POST_IT_SHADOW_HOVER =
  "0 4px 10px rgba(0,0,0,0.18), 0 12px 28px rgba(0,0,0,0.24), 0 20px 48px rgba(0,0,0,0.14), 0 0 0 1px rgba(0,0,0,0.08)";

export const POST_IT_SHADOW_ACTIVE =
  "0 6px 14px rgba(0,0,0,0.2), 0 16px 36px rgba(0,0,0,0.28), 0 24px 56px rgba(0,0,0,0.16)";
