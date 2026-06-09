"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw, Volume2, VolumeX, Music2 } from "lucide-react";
import type { RoomMusicState } from "@studyverce/shared";
import { Button } from "@/components/ui/button";
import { ROOM_HEADER_SECONDARY_TEXT } from "@/lib/room-ui";
import { cn } from "@/lib/utils";
import { ScrollingTrackRibbon } from "@/components/room/scrolling-track-ribbon";
import { isEmbedProvider } from "@/lib/music/providers";
import {
  postEmbedCommand,
  postEmbedVolume,
  resolveEmbedSrc,
  supportsEmbedTransport,
} from "@/lib/music/embed-controls";

interface RoomMusicPlayerProps {
  music: RoomMusicState;
  isOwner: boolean;
  onTogglePlay: (isPlaying: boolean) => void;
  onRestart?: () => void;
  onOpenPicker: () => void;
  className?: string;
}

export function RoomMusicPlayer({
  music,
  isOwner,
  onTogglePlay,
  onRestart,
  onOpenPicker,
  className,
}: RoomMusicPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const embedRef = useRef<HTMLIFrameElement>(null);
  const embedReadyRef = useRef(false);
  const lastTransportRef = useRef<"play" | "pause" | null>(null);

  const [volume, setVolume] = useState(0.7);
  const [muted, setMuted] = useState(false);
  const [embedOrigin, setEmbedOrigin] = useState("");

  const usesEmbed = isEmbedProvider(music.provider);
  const hasTrack = !!music.trackId && (!!music.audioUrl || !!music.embedUrl);
  const canTransportEmbed = supportsEmbedTransport(music.provider);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setEmbedOrigin(window.location.origin);
    }
  }, []);

  const applyAudioOutput = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume;
    audio.muted = muted;
  }, [volume, muted]);

  // Direct audio: load on track/seq change; play/pause without reloading src
  useEffect(() => {
    if (usesEmbed) return;

    const audio = audioRef.current;
    if (!audio) return;

    if (!music.audioUrl) {
      audio.pause();
      audio.removeAttribute("src");
      return;
    }

    const trackKey = `${music.trackId ?? ""}-${music.playbackSeq}`;
    if (audio.dataset.trackKey !== trackKey) {
      audio.dataset.trackKey = trackKey;
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

    applyAudioOutput();
  }, [
    music.trackId,
    music.audioUrl,
    music.isPlaying,
    music.playbackSeq,
    usesEmbed,
    applyAudioOutput,
  ]);

  useEffect(() => {
    applyAudioOutput();
  }, [applyAudioOutput]);

  // Embed: keep mounted; use postMessage where supported
  useEffect(() => {
    if (!usesEmbed || !embedRef.current || !embedReadyRef.current) return;

    const command = music.isPlaying ? "play" : "pause";
    if (canTransportEmbed && lastTransportRef.current !== command) {
      const sent = postEmbedCommand(embedRef.current, music.provider, command);
      if (sent) {
        lastTransportRef.current = command;
        return;
      }
    }
    lastTransportRef.current = command;
  }, [music.isPlaying, music.provider, usesEmbed, canTransportEmbed]);

  useEffect(() => {
    if (!usesEmbed || !embedRef.current || !embedReadyRef.current) return;
    const level = muted ? 0 : Math.round(volume * 100);
    postEmbedVolume(embedRef.current, music.provider, level);
  }, [muted, volume, music.provider, usesEmbed]);

  const embedSrc =
    usesEmbed && music.embedUrl
      ? resolveEmbedSrc(music.embedUrl, music.provider, {
          autoplay: music.isPlaying,
          origin: embedOrigin,
        })
      : null;

  const embedMountKey = `${music.trackId ?? "none"}-${music.playbackSeq}`;

  return (
    <div className={cn("flex items-center gap-2 px-4 py-2 sm:gap-3", className)}>
      {!usesEmbed && <audio ref={audioRef} loop preload="none" className="hidden" />}

      {usesEmbed && embedSrc && (
        <iframe
          key={embedMountKey}
          ref={embedRef}
          src={embedSrc}
          title={music.trackName ?? "Room music"}
          className="pointer-events-none fixed -left-[9999px] top-0 h-px w-px opacity-0"
          allow="autoplay; encrypted-media"
          onLoad={() => {
            embedReadyRef.current = true;
            lastTransportRef.current = null;
            if (music.isPlaying) {
              postEmbedCommand(embedRef.current, music.provider, "play");
              lastTransportRef.current = "play";
            }
          }}
        />
      )}

      <Button variant="outline" size="sm" className="shrink-0 gap-2" onClick={onOpenPicker}>
        <Music2 className="h-4 w-4" />
        Music
      </Button>

      {hasTrack ? (
        <>
          <ScrollingTrackRibbon
            className="flex-1"
            trackName={music.trackName ?? "Unknown track"}
            artist={music.artist}
            isPlaying={music.isPlaying}
          />

          {isOwner && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 text-foreground hover:text-foreground"
                onClick={() => onTogglePlay(!music.isPlaying)}
                aria-label={music.isPlaying ? "Pause music" : "Resume music"}
              >
                {music.isPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </Button>
              {onRestart && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-foreground hover:text-foreground"
                  onClick={onRestart}
                  aria-label="Restart playback"
                  title="Restart from beginning"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              )}
            </>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 text-foreground hover:text-foreground"
            onClick={() => setMuted((m) => !m)}
            aria-label={muted ? "Unmute" : "Mute"}
            title={muted ? "Unmute (only affects you)" : "Mute (only affects you)"}
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>

          {!muted && (
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              className="hidden w-16 accent-primary sm:block md:w-20"
              onChange={(e) => setVolume(Number(e.target.value))}
              aria-label="Volume"
            />
          )}
        </>
      ) : (
        <p className={cn("text-sm", ROOM_HEADER_SECONDARY_TEXT)}>No music playing</p>
      )}
    </div>
  );
}
