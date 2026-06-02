"use client";

import { useState } from "react";
import { useRoomSocket } from "@/hooks/use-socket";
import { PomodoroTimer } from "@/components/room/pomodoro-timer";
import { RoomChat } from "@/components/room/room-chat";
import { ParticipantList } from "@/components/room/participant-list";
import { RoomBackgroundPicker } from "@/components/room/room-background-picker";
import { RoomMusicPicker } from "@/components/room/room-music-picker";
import { RoomMusicPlayer } from "@/components/room/room-music-player";
import { RoomPostItStack } from "@/components/room/room-post-it-stack";
import { RoomTaskPrompt } from "@/components/room/room-task-prompt";
import { RoomTodoPanel } from "@/components/room/room-todo-panel";
import { RoomVideoHint } from "@/components/room/room-video";
import { Badge } from "@/components/ui/badge";
import { Wifi, WifiOff } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import type { ChatMessage, RoomTrack, UserPostItTask } from "@studyverse/shared";
import { roomTrackToMusicState } from "@studyverse/shared";

interface RoomClientProps {
  roomId: string;
  roomName: string;
  isPublic: boolean;
  currentUserId: string;
  isOwner: boolean;
  isModerator: boolean;
  initialWallpaperId: string | null;
  initialBackgroundUrl: string | null;
  initialTrack: RoomTrack | null;
  initialMessages: ChatMessage[];
  roomTask: UserPostItTask | null;
  hasRoomTasks: boolean;
}

const glassPanel =
  "bg-card/90 backdrop-blur-md border-border/50 shadow-lg supports-[backdrop-filter]:bg-card/80";

export function RoomClient({
  roomId,
  roomName,
  isPublic,
  currentUserId,
  isOwner,
  isModerator,
  initialWallpaperId,
  initialBackgroundUrl,
  initialTrack,
  initialMessages,
  roomTask,
  hasRoomTasks,
}: RoomClientProps) {
  const [wallpaperId, setWallpaperId] = useState(initialWallpaperId);
  const [backgroundUrl, setBackgroundUrl] = useState(initialBackgroundUrl);
  const [musicPickerOpen, setMusicPickerOpen] = useState(false);
  const [taskRefreshKey, setTaskRefreshKey] = useState(0);
  const [roomTasks, setRoomTasks] = useState<UserPostItTask[]>([]);
  const [goalText, setGoalText] = useState(roomTask?.title ?? "");
  const initialMusic = roomTrackToMusicState(initialTrack, !!initialTrack);

  const canManageBackground = isOwner || isModerator;

  const {
    connected,
    participants,
    messages,
    pomodoro,
    music,
    sendMessage,
    deleteMessage,
    startPomodoro,
    pausePomodoro,
    resetPomodoro,
    broadcastWallpaper,
    broadcastMusic,
  } = useRoomSocket(roomId, initialMessages, initialMusic);

  function handleBackgroundApply(id: string | null, url: string | null) {
    setWallpaperId(id);
    setBackgroundUrl(url);
    broadcastWallpaper(id, url);
    trackEvent("room_background_changed", { room_id: roomId, wallpaper_id: id });
  }

  function handleMusicApply(track: RoomTrack | null, isPlaying: boolean) {
    const state = roomTrackToMusicState(track, isPlaying);
    broadcastMusic(state);
    trackEvent("room_music_changed", {
      room_id: roomId,
      track_id: track?.id ?? null,
      is_playing: isPlaying,
    });
  }

  function handleTogglePlay(isPlaying: boolean) {
    broadcastMusic({ ...music, isPlaying });
  }

  return (
    <div className="relative flex h-[calc(100dvh-4rem)] flex-col overflow-hidden">
      <RoomTaskPrompt
        roomId={roomId}
        roomName={roomName}
        hasRoomTasks={hasRoomTasks}
        onTaskChange={() => setTaskRefreshKey((k) => k + 1)}
      />
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        {backgroundUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={backgroundUrl}
              alt=""
              aria-hidden
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-background/95 via-background/80 to-background/95" />
          </>
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-primary/5 via-background to-background" />
        )}
      </div>

      <header className={cn("shrink-0 border-b border-border/50", glassPanel)}>
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold sm:text-xl">{roomName}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Badge variant={isPublic ? "default" : "secondary"} className="text-xs">
                {isPublic ? "Public" : "Private"}
              </Badge>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                {connected ? (
                  <>
                    <Wifi className="h-3 w-3 text-primary" />
                    Connected
                  </>
                ) : (
                  <>
                    <WifiOff className="h-3 w-3" />
                    Connecting…
                  </>
                )}
              </span>
              <RoomVideoHint />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <ParticipantList
              participants={participants}
              currentUserId={currentUserId}
              variant="compact"
              className="hidden sm:flex"
            />
            <RoomBackgroundPicker
              roomId={roomId}
              currentWallpaperId={wallpaperId}
              canManage={canManageBackground}
              onApply={handleBackgroundApply}
            />
          </div>
        </div>

        <ParticipantList
          participants={participants}
          currentUserId={currentUserId}
          variant="compact"
          className="px-4 pb-3 sm:hidden"
        />

        <RoomMusicPlayer
          music={music}
          isOwner={isOwner}
          onTogglePlay={handleTogglePlay}
          onOpenPicker={() => setMusicPickerOpen(true)}
          className="border-t border-border/50"
        />
      </header>

      <RoomMusicPicker
        roomId={roomId}
        currentTrackId={music.trackId}
        isOwner={isOwner}
        onApply={handleMusicApply}
        open={musicPickerOpen}
        onOpenChange={setMusicPickerOpen}
      />

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <section className="relative flex min-h-0 flex-1 overflow-visible">
          <RoomPostItStack
            roomId={roomId}
            refreshKey={taskRefreshKey}
            tasks={roomTasks}
            onTasksChange={(tasks) => {
              setRoomTasks(tasks);
              const active = tasks.find((t) => !t.closed);
              if (active?.title) setGoalText(active.title);
            }}
          />
          <div className="pointer-events-none relative z-10 flex flex-1 items-center justify-center overflow-y-auto p-4 sm:p-6">
            <PomodoroTimer
              state={pomodoro}
              onStart={(phase) => {
                startPomodoro(phase);
                trackEvent("pomodoro_started", { room_id: roomId, phase });
              }}
              onPause={pausePomodoro}
              onReset={resetPomodoro}
              goalText={goalText}
              onGoalChange={setGoalText}
              className={cn("pointer-events-auto w-full max-w-md", glassPanel)}
            />
          </div>
        </section>

        <aside
          className={cn(
            "flex min-h-0 shrink-0 flex-col border-t border-border/50 lg:w-80 lg:border-l lg:border-t-0 xl:w-96",
            glassPanel
          )}
        >
          <RoomTodoPanel tasks={roomTasks} onTasksChange={setRoomTasks} />
          <RoomChat
            messages={messages}
            currentUserId={currentUserId}
            isModerator={isOwner || isModerator}
            onSend={sendMessage}
            onDelete={deleteMessage}
            className="min-h-[240px] flex-1 lg:min-h-0"
          />
        </aside>
      </div>
    </div>
  );
}
