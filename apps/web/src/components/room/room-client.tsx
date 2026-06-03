"use client";

import { useRef, useState } from "react";
import { useRoomAppearance } from "@/hooks/use-room-appearance";
import { useRoomFullscreen } from "@/hooks/use-room-fullscreen";
import { useLocalPomodoro } from "@/hooks/use-local-pomodoro";
import { useRoomSocket } from "@/hooks/use-socket";
import { RoomAppearanceToggle } from "@/components/room/room-appearance-toggle";
import { RoomFullscreenToggle } from "@/components/room/room-fullscreen-toggle";
import { PomodoroTimer } from "@/components/room/pomodoro-timer";
import { RoomChat } from "@/components/room/room-chat";
import { RoomSidebarPanels } from "@/components/room/room-sidebar-panels";
import { ParticipantList } from "@/components/room/participant-list";
import { RoomBackgroundPicker } from "@/components/room/room-background-picker";
import { RoomMusicPicker } from "@/components/room/room-music-picker";
import { RoomMusicPlayer } from "@/components/room/room-music-player";
import { RoomPostItStack } from "@/components/room/room-post-it-stack";
import { RoomTaskPrompt } from "@/components/room/room-task-prompt";
import { RoomStudyAssistant } from "@/components/room/room-study-assistant";
import { RoomTodoPanel } from "@/components/room/room-todo-panel";
import { RoomVideoHint } from "@/components/room/room-video";
import { Badge } from "@/components/ui/badge";
import { Wifi, WifiOff } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { ROOM_CHROME_PANEL, ROOM_GLASS_PANEL } from "@/lib/room-ui";
import { wallpaperImageFilter } from "@/lib/wallpaper-overlay";
import { cn } from "@/lib/utils";
import type {
  ChatMessage,
  RoomSidebarPanelId,
  RoomTrack,
  UserPostItTask,
} from "@studyverce/shared";
import { roomTrackToMusicState } from "@studyverce/shared";

interface RoomClientProps {
  roomId: string;
  roomName: string;
  isPublic: boolean;
  currentUserId: string;
  isOwner: boolean;
  isModerator: boolean;
  initialWallpaperId: string | null;
  initialBackgroundUrl: string | null;
  initialWallpaperOverlay: number;
  initialTrack: RoomTrack | null;
  initialMessages: ChatMessage[];
  roomTask: UserPostItTask | null;
  hasRoomTasks: boolean;
  pomodoroFocusMinutes?: number;
  pomodoroBreakMinutes?: number;
  initialSidebarPanelOrder: RoomSidebarPanelId[];
}

export function RoomClient({
  roomId,
  roomName,
  isPublic,
  currentUserId,
  isOwner,
  isModerator,
  initialWallpaperId,
  initialBackgroundUrl,
  initialWallpaperOverlay,
  initialTrack,
  initialMessages,
  roomTask,
  hasRoomTasks,
  pomodoroFocusMinutes,
  pomodoroBreakMinutes,
  initialSidebarPanelOrder,
}: RoomClientProps) {
  const [wallpaperId, setWallpaperId] = useState(initialWallpaperId);
  const [backgroundUrl, setBackgroundUrl] = useState(initialBackgroundUrl);
  const [musicPickerOpen, setMusicPickerOpen] = useState(false);
  const [taskRefreshKey, setTaskRefreshKey] = useState(0);
  const [roomTasks, setRoomTasks] = useState<UserPostItTask[]>([]);
  const [goalText, setGoalText] = useState(roomTask?.title ?? "");
  const [tasksCollapsed, setTasksCollapsed] = useState(true);
  const [assistantCollapsed, setAssistantCollapsed] = useState(false);
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const roomRootRef = useRef<HTMLDivElement>(null);
  const initialMusic = roomTrackToMusicState(initialTrack, !!initialTrack);

  const canManageBackground = isOwner || isModerator;
  const { appearance, setRoomAppearance } = useRoomAppearance();
  const { isFullscreen, toggleFullscreen } = useRoomFullscreen(roomRootRef);

  const {
    state: pomodoro,
    start: startPomodoro,
    pause: pausePomodoro,
    reset: resetPomodoro,
  } = useLocalPomodoro(roomId, currentUserId, {
    focusMinutes: pomodoroFocusMinutes,
    breakMinutes: pomodoroBreakMinutes,
  });

  const {
    connected,
    connectionError,
    participants,
    messages,
    music,
    sendMessage,
    deleteMessage,
    wallpaperOverlayOpacity,
    broadcastWallpaper,
    broadcastWallpaperOverlay,
    broadcastMusic,
  } = useRoomSocket(roomId, initialMessages, initialMusic, initialWallpaperOverlay);

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

  function handleRestartPlayback() {
    if (!music.trackId) return;
    broadcastMusic({
      ...music,
      isPlaying: true,
      playbackSeq: music.playbackSeq + 1,
    });
  }

  return (
    <div
      ref={roomRootRef}
      className={cn(
        "relative isolate flex flex-col overflow-hidden",
        isFullscreen ? "h-dvh w-full" : "h-[calc(100dvh-4rem)]"
      )}
    >
      <RoomTaskPrompt
        roomId={roomId}
        roomName={roomName}
        hasRoomTasks={hasRoomTasks}
        portalContainerRef={roomRootRef}
        onTaskChange={() => setTaskRefreshKey((k) => k + 1)}
      />
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        {backgroundUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={backgroundUrl}
              alt=""
              aria-hidden
              className="h-full w-full object-cover"
              style={{ filter: wallpaperImageFilter(wallpaperOverlayOpacity) }}
            />
            <div
              className="absolute inset-0 bg-gradient-to-b from-background via-background/80 to-background"
              style={{ opacity: wallpaperOverlayOpacity / 100 }}
            />
          </>
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-primary/5 via-background to-background" />
        )}
      </div>

      <header
        className={cn("relative z-10 shrink-0 border-b border-border/50", ROOM_CHROME_PANEL)}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold sm:text-xl">{roomName}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Badge variant={isPublic ? "default" : "secondary"} className="text-xs">
                {isPublic ? "Public" : "Private"}
              </Badge>
              <span
                className={cn(
                  "flex items-center gap-1 text-xs",
                  connected
                    ? "text-primary"
                    : connectionError
                      ? "text-destructive"
                      : "text-muted-foreground"
                )}
                title={connectionError ?? undefined}
              >
                {connected ? (
                  <>
                    <Wifi className="h-3 w-3" />
                    Live
                  </>
                ) : connectionError ? (
                  <>
                    <WifiOff className="h-3 w-3" />
                    Offline
                  </>
                ) : (
                  <>
                    <WifiOff className="h-3 w-3 animate-pulse" />
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
            <RoomAppearanceToggle
              appearance={appearance}
              onChange={setRoomAppearance}
            />
            <RoomBackgroundPicker
              roomId={roomId}
              currentWallpaperId={wallpaperId}
              backgroundUrl={backgroundUrl}
              canManage={canManageBackground}
              isOwner={isOwner}
              overlayOpacity={wallpaperOverlayOpacity}
              onOverlayChange={broadcastWallpaperOverlay}
              onApply={handleBackgroundApply}
              portalContainerRef={roomRootRef}
            />
            <RoomFullscreenToggle
              isFullscreen={isFullscreen}
              onToggle={toggleFullscreen}
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
          onRestart={isOwner ? handleRestartPlayback : undefined}
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
        portalContainerRef={roomRootRef}
      />

      <div className="relative z-10 flex min-h-0 flex-1 flex-col lg:flex-row">
        <section className="relative flex min-h-0 flex-1 overflow-visible">
          <RoomPostItStack
            roomId={roomId}
            refreshKey={taskRefreshKey}
            tasks={roomTasks}
            onTasksChange={(update) => {
              setRoomTasks((prev) => {
                const next = typeof update === "function" ? update(prev) : update;
                const active = next.find((t) => !t.closed);
                if (active?.title) setGoalText(active.title);
                return next;
              });
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
              className={cn("pointer-events-auto w-full max-w-md", ROOM_GLASS_PANEL)}
            />
          </div>
        </section>

        <aside
          className={cn(
            "flex min-h-0 shrink-0 flex-col border-t border-border/50 lg:w-80 lg:border-l lg:border-t-0 xl:w-[26rem]",
            ROOM_CHROME_PANEL
          )}
        >
          <RoomSidebarPanels
            roomId={roomId}
            initialOrder={initialSidebarPanelOrder}
            panelExpanded={{
              tasks: !tasksCollapsed,
              assistant: !assistantCollapsed,
              chat: !chatCollapsed,
            }}
            panels={{
              tasks: (
                <RoomTodoPanel
                  tasks={roomTasks}
                  onTasksChange={setRoomTasks}
                  collapsed={tasksCollapsed}
                  onCollapsedChange={setTasksCollapsed}
                />
              ),
              assistant: (
                <RoomStudyAssistant
                  roomId={roomId}
                  roomName={roomName}
                  goalText={goalText}
                  collapsed={assistantCollapsed}
                  onCollapsedChange={(collapsed) => {
                    setAssistantCollapsed(collapsed);
                    if (collapsed) setChatCollapsed(false);
                  }}
                />
              ),
              chat: (
                <RoomChat
                  messages={messages}
                  currentUserId={currentUserId}
                  isModerator={isOwner || isModerator}
                  onSend={sendMessage}
                  onDelete={deleteMessage}
                  collapsed={chatCollapsed}
                  onCollapsedChange={setChatCollapsed}
                />
              ),
            }}
          />
        </aside>
      </div>
    </div>
  );
}
