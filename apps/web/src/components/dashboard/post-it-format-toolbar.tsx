import { Bold, Italic, Strikethrough } from "lucide-react";
import type { PostItTextFormat } from "@/lib/post-it-rich-text";
import { PostItIconTooltip } from "@/components/dashboard/post-it-icon-tooltip";

interface PostItFormatActionsProps {
  onFormat: (format: PostItTextFormat) => void;
  iconBtnClass: string;
}

export function PostItFormatActions({
  onFormat,
  iconBtnClass,
}: PostItFormatActionsProps) {
  return (
    <>
      <PostItIconTooltip label="Bold selection">
        <button
          type="button"
          className={iconBtnClass}
          aria-label="Bold"
          onMouseDown={(e) => {
            e.preventDefault();
            onFormat("bold");
          }}
        >
          <Bold className="h-3.5 w-3.5" />
        </button>
      </PostItIconTooltip>
      <PostItIconTooltip label="Italic selection">
        <button
          type="button"
          className={iconBtnClass}
          aria-label="Italic"
          onMouseDown={(e) => {
            e.preventDefault();
            onFormat("italic");
          }}
        >
          <Italic className="h-3.5 w-3.5" />
        </button>
      </PostItIconTooltip>
      <PostItIconTooltip label="Strikethrough selection">
        <button
          type="button"
          className={iconBtnClass}
          aria-label="Strikethrough"
          onMouseDown={(e) => {
            e.preventDefault();
            onFormat("strike");
          }}
        >
          <Strikethrough className="h-3.5 w-3.5" />
        </button>
      </PostItIconTooltip>
    </>
  );
}
