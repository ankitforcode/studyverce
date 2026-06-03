"use client";

import { io, type Socket } from "socket.io-client";
import { useEffect, useRef, useState, useCallback } from "react";
import {
  DEFAULT_WALLPAPER_OVERLAY,
  type ClientToServerEvents,
  type ServerToClientEvents,
  type RoomPresenceState,
  type ChatMessage,
  type PomodoroState,
  type RoomMusicState,
} from "@studyverce/shared";
import { createClient } from "@/lib/supabase/client";
import { sendRoomMessage, deleteRoomMessage } from "@/app/rooms/chat-actions";

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

function mergeMessages(existing: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const byId = new Map(existing.map((m) => [m.id, m]));
  for (const msg of incoming) {
    byId.set(msg.id, msg);
  }
  return Array.from(byId.values()).sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

export function useSocket() {
  const socketRef = useRef<AppSocket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let socket: AppSocket;

    async function connect() {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      socket = io(process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:3002", {
        auth: { token: session?.access_token ?? "dev" },
        autoConnect: true,
      });

      socket.on("connect", () => setConnected(true));
      socket.on("disconnect", () => setConnected(false));
      socketRef.current = socket;
    }

    connect();

    return () => {
      socket?.disconnect();
    };
  }, []);

  return { socket: socketRef.current, connected };
}

export function useRoomSocket(
  roomId: string,
  initialMessages: ChatMessage[] = [],
  initialMusic?: RoomMusicState,
  initialWallpaperOverlay = DEFAULT_WALLPAPER_OVERLAY
) {
  const { socket, connected } = useSocket();
  const [participants, setParticipants] = useState<RoomPresenceState["participants"]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [pomodoro, setPomodoro] = useState<PomodoroState | null>(null);
  const [wallpaperId, setWallpaperId] = useState<string | null>(null);
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  const [wallpaperOverlayOpacity, setWallpaperOverlayOpacity] = useState(
    initialWallpaperOverlay
  );
  const [music, setMusic] = useState<RoomMusicState>(
    initialMusic ?? {
      trackId: null,
      audioUrl: null,
      embedUrl: null,
      sourceUrl: null,
      provider: null,
      trackName: null,
      artist: null,
      isPlaying: false,
    }
  );
  const joinedRef = useRef(false);

  // Sync when server-rendered history arrives (e.g. navigation)
  useEffect(() => {
    if (initialMessages.length > 0) {
      setMessages((prev) => mergeMessages(prev, initialMessages));
    }
  }, [initialMessages]);

  const joinRoom = useCallback(async () => {
    if (!socket || joinedRef.current) return;
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    socket.emit("room:join", { roomId, token: session?.access_token ?? "dev" });
    joinedRef.current = true;
  }, [socket, roomId]);

  useEffect(() => {
    if (!socket || !connected) return;

    joinRoom();

    socket.on("room:presence", (payload) => {
      if (payload.roomId === roomId) {
        setParticipants(payload.participants);
        setMusic((prev) => {
          if (!prev.trackId || payload.participants.length === 0) return prev;
          if (prev.isPlaying) return prev;
          return { ...prev, isPlaying: true };
        });
      }
    });

    socket.on("chat:history", (payload) => {
      setMessages((prev) => mergeMessages(prev, payload.messages));
    });
    socket.on("chat:message", (msg) => {
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
    });
    socket.on("chat:deleted", ({ messageId }) =>
      setMessages((prev) => prev.filter((m) => m.id !== messageId))
    );
    socket.on("pomodoro:sync", (payload) => {
      if (payload.roomId === roomId) setPomodoro(payload.state);
    });
    socket.on("room:wallpaper", (payload) => {
      if (payload.roomId === roomId) {
        setWallpaperId(payload.wallpaperId);
        setBackgroundUrl(payload.imageUrl);
      }
    });
    socket.on("room:wallpaperOverlay", (payload) => {
      if (payload.roomId === roomId) {
        setWallpaperOverlayOpacity(payload.overlayOpacity);
      }
    });
    socket.on("room:music", (payload) => {
      if (payload.roomId === roomId) {
        setMusic(payload.state);
      }
    });

    return () => {
      socket.emit("room:leave", { roomId });
      joinedRef.current = false;
      socket.off("room:presence");
      socket.off("chat:history");
      socket.off("chat:message");
      socket.off("chat:deleted");
      socket.off("pomodoro:sync");
      socket.off("room:wallpaper");
      socket.off("room:wallpaperOverlay");
      socket.off("room:music");
    };
  }, [socket, connected, roomId, joinRoom]);

  const sendMessage = useCallback(
    async (content: string) => {
      const result = await sendRoomMessage(roomId, content);
      if (result.error || !result.message) {
        console.error("Failed to send message:", result.error);
        return;
      }

      const message = result.message;
      setMessages((prev) =>
        prev.some((m) => m.id === message.id) ? prev : [...prev, message]
      );
      socket?.emit("chat:broadcast", { roomId, message });
    },
    [socket, roomId]
  );

  const deleteMessage = useCallback(
    async (messageId: string) => {
      const result = await deleteRoomMessage(roomId, messageId);
      if (result.error) {
        console.error("Failed to delete message:", result.error);
        return;
      }

      setMessages((prev) => prev.filter((m) => m.id !== messageId));
      socket?.emit("chat:broadcast-delete", { roomId, messageId });
    },
    [socket, roomId]
  );

  const startPomodoro = useCallback(
    (phase: "focus" | "break", focusMinutes?: number, breakMinutes?: number) => {
      socket?.emit("pomodoro:start", { roomId, phase, focusMinutes, breakMinutes });
    },
    [socket, roomId]
  );

  const pausePomodoro = useCallback(() => {
    socket?.emit("pomodoro:pause", { roomId });
  }, [socket, roomId]);

  const resetPomodoro = useCallback(() => {
    socket?.emit("pomodoro:reset", { roomId });
  }, [socket, roomId]);

  const broadcastWallpaper = useCallback(
    (id: string | null, imageUrl: string | null) => {
      socket?.emit("room:wallpaper:set", { roomId, wallpaperId: id, imageUrl });
    },
    [socket, roomId]
  );

  const broadcastWallpaperOverlay = useCallback(
    (overlayOpacity: number) => {
      setWallpaperOverlayOpacity(overlayOpacity);
      socket?.emit("room:wallpaperOverlay:set", { roomId, overlayOpacity });
    },
    [socket, roomId]
  );

  const broadcastMusic = useCallback(
    (state: RoomMusicState) => {
      setMusic(state);
      socket?.emit("room:music:sync", { roomId, state });
    },
    [socket, roomId]
  );

  return {
    connected,
    participants,
    messages,
    pomodoro,
    wallpaperId,
    backgroundUrl,
    wallpaperOverlayOpacity,
    broadcastWallpaperOverlay,
    music,
    sendMessage,
    deleteMessage,
    startPomodoro,
    pausePomodoro,
    resetPomodoro,
    broadcastWallpaper,
    broadcastMusic,
  };
}
