import { cn } from "@/lib/utils";
import {
  POST_IT_RICH_TEXT_CLASS,
  sanitizePostItHtml,
  stripPostItHtml,
} from "@/lib/post-it-rich-text";

interface PostItRichTextViewProps {
  html: string;
  className?: string;
  /** Whole-line strike (e.g. task done), in addition to inline &lt;s&gt; tags. */
  lineThrough?: boolean;
}

export function PostItRichTextView({
  html,
  className,
  lineThrough = false,
}: PostItRichTextViewProps) {
  const safe = sanitizePostItHtml(html);
  const plain = stripPostItHtml(safe);

  if (!plain) return null;

  if (!safe.includes("<")) {
    return (
      <span className={cn(className, lineThrough && "line-through")}>{plain}</span>
    );
  }

  return (
    <span
      className={cn(
        className,
        lineThrough && "opacity-80 line-through",
        POST_IT_RICH_TEXT_CLASS
      )}
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  );
}
