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

/** Flat sticky-note fills */
export const POST_IT_BG: Record<keyof typeof POST_IT_COLOR_STYLES, string> = {
  yellow: "#FFF4A3",
  sky: "#A8D4FF",
  pink: "#FFB8D9",
  lavender: "#B1AFFF",
  mint: "#A8E6CF",
};

export const POST_IT_RADIUS = 0;

export const POST_IT_COLOR_LABELS: Record<keyof typeof POST_IT_COLOR_STYLES, string> = {
  yellow: "Yellow",
  sky: "Blue",
  pink: "Pink",
  lavender: "Purple",
  mint: "Green",
};

/** Soft lift along the bottom edge — no outline ring */
export const POST_IT_SHADOW = "0 3px 8px rgba(0, 0, 0, 0.1)";

export const POST_IT_SHADOW_HOVER = "0 5px 12px rgba(0, 0, 0, 0.12)";

export const POST_IT_SHADOW_ACTIVE = "0 8px 16px rgba(0, 0, 0, 0.14)";
