import { Music2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ScrollingTrackRibbonProps {
  trackName: string;
  artist: string | null;
  isPlaying: boolean;
  className?: string;
  compact?: boolean;
}

export function ScrollingTrackRibbon({
  trackName,
  artist,
  isPlaying,
  className,
  compact = false,
}: ScrollingTrackRibbonProps) {
  const label = artist ? `${trackName} · ${artist}` : trackName;
  const segments = Array.from({ length: 4 }, (_, i) => (
    <span
      key={i}
      className={cn(
        "flex shrink-0 items-center gap-3 pr-4",
        compact ? "gap-2 pr-3" : "gap-6 pr-6"
      )}
    >
      <Music2
        className={cn("shrink-0 text-primary", compact ? "h-3 w-3" : "h-3.5 w-3.5")}
        aria-hidden
      />
      <span className={cn("font-medium", compact ? "text-xs" : "text-sm")}>
        {trackName}
      </span>
      {artist && (
        <span
          className={cn(
            "text-muted-foreground",
            compact ? "text-xs" : "text-sm"
          )}
        >
          {artist}
        </span>
      )}
      <span className="text-primary/40" aria-hidden>
        ♪
      </span>
    </span>
  ));

  return (
    <div
      className={cn(
        "relative min-w-0 overflow-hidden rounded-full border",
        compact ? "px-2 py-1" : "px-3 py-1.5",
        isPlaying
          ? "border-primary/30 bg-primary/10"
          : "border-border/50 bg-muted/30",
        className
      )}
      title={label}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-y-0 left-0 z-10 bg-gradient-to-r to-transparent",
          isPlaying ? "w-6 from-primary/10" : "w-4 from-muted/30",
          compact && "w-4"
        )}
      />
      <div
        className={cn(
          "pointer-events-none absolute inset-y-0 right-0 z-10 bg-gradient-to-l to-transparent",
          isPlaying ? "w-6 from-primary/10" : "w-4 from-muted/30",
          compact && "w-4"
        )}
      />

      {isPlaying ? (
        <div className="track-marquee flex w-max">{segments}{segments}</div>
      ) : (
        <p className={cn("truncate", compact ? "text-xs" : "text-sm")}>
          <span className="font-medium">{trackName}</span>
          {artist && (
            <span className="text-muted-foreground"> · {artist}</span>
          )}
        </p>
      )}
    </div>
  );
}
