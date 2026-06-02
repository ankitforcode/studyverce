"use client";

import { useEffect, useRef } from "react";
import { Music2, Pause, Play, Volume2 } from "lucide-react";
import type { RoomMusicState } from "@studyverse/shared";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { isEmbedProvider } from "@/lib/music/providers";

interface RoomMusicPlayerProps {
  music: RoomMusicState;
  isOwner: boolean;
  onTogglePlay: (isPlaying: boolean) => void;
  onOpenPicker: () => void;
  className?: string;
}

function ScrollingTrackRibbon({
  trackName,
  artist,
  isPlaying,
}: {
  trackName: string;
  artist: string | null;
  isPlaying: boolean;
}) {
  const label = artist ? `${trackName} · ${artist}` : trackName;
  const segments = Array.from({ length: 4 }, (_, i) => (
    <span key={i} className="flex shrink-0 items-center gap-6 pr-6">
      <Music2 className="h-3.5 w-3.5 text-primary" aria-hidden />
      <span className="text-sm font-medium">{trackName}</span>
      {artist && <span className="text-sm text-muted-foreground">{artist}</span>}
      <span className="text-primary/40" aria-hidden>
        ♪
      </span>
    </span>
  ));

  return (
    <div
      className={cn(
        "relative min-w-0 flex-1 overflow-hidden rounded-full border px-3 py-1.5",
        isPlaying
          ? "border-primary/30 bg-primary/10"
          : "border-border/50 bg-muted/30"
      )}
    >
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-primary/10 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-primary/10 to-transparent" />

      {isPlaying ? (
        <div className="track-marquee flex w-max">
          {segments}
          {segments}
        </div>
      ) : (
        <p className="truncate text-sm" title={label}>
          <span className="font-medium">{trackName}</span>
          {artist && <span className="text-muted-foreground"> · {artist}</span>}
        </p>
      )}
    </div>
  );
}

export function RoomMusicPlayer({
  music,
  isOwner,
  onTogglePlay,
  onOpenPicker,
  className,
}: RoomMusicPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const usesEmbed = isEmbedProvider(music.provider);

  useEffect(() => {
    if (usesEmbed) return;

    const audio = audioRef.current;
    if (!audio) return;

    if (!music.audioUrl) {
      audio.pause();
      audio.removeAttribute("src");
      return;
    }

    if (audio.src !== music.audioUrl) {
      audio.src = music.audioUrl;
      audio.load();
    }

    if (music.isPlaying) {
      void audio.play().catch(() => {
        /* autoplay may be blocked until user interaction */
      });
    } else {
      audio.pause();
    }
  }, [music.audioUrl, music.isPlaying, usesEmbed]);

  const hasTrack =
    !!music.trackId && (!!music.audioUrl || !!music.embedUrl);

  return (
    <div className={cn("flex items-center gap-3 px-4 py-2", className)}>
      {!usesEmbed && <audio ref={audioRef} loop preload="none" className="hidden" />}

      {usesEmbed && music.embedUrl && music.isPlaying && (
        <iframe
          key={music.embedUrl}
          src={music.embedUrl}
          title={music.trackName ?? "Room music"}
          className="pointer-events-none fixed -left-[9999px] top-0 h-px w-px opacity-0"
          allow="autoplay; encrypted-media"
        />
      )}

      <Button variant="outline" size="sm" className="shrink-0 gap-2" onClick={onOpenPicker}>
        <Music2 className="h-4 w-4" />
        Music
      </Button>

      {hasTrack ? (
        <>
          <ScrollingTrackRibbon
            trackName={music.trackName ?? "Unknown track"}
            artist={music.artist}
            isPlaying={music.isPlaying}
          />

          {isOwner && (
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={() => onTogglePlay(!music.isPlaying)}
              aria-label={music.isPlaying ? "Pause music" : "Play music"}
            >
              {music.isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
          )}

          {!usesEmbed && (
            <>
              <Volume2 className="hidden h-4 w-4 shrink-0 text-muted-foreground sm:block" />
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                defaultValue={0.7}
                className="hidden w-20 accent-primary sm:block"
                onChange={(e) => {
                  if (audioRef.current) {
                    audioRef.current.volume = Number(e.target.value);
                  }
                }}
                aria-label="Volume"
              />
            </>
          )}
        </>
      ) : (
        <p className="text-sm text-muted-foreground">No music playing</p>
      )}
    </div>
  );
}
