"use client";

import { io, type Socket } from "socket.io-client";
import { useEffect, useRef, useState, useCallback } from "react";
import {
  DEFAULT_WALLPAPER_OVERLAY,
  ROOM_PRESENCE_PING_INTERVAL_MS,
  type ClientToServerEvents,
  type ServerToClientEvents,
  type RoomPresenceState,
  type ChatMessage,
  normalizeRoomMusicState,
  type RoomMusicState,
} from "@studyverce/shared";
import { createClient } from "@/lib/supabase/client";
import { getSocketIoClientUrl } from "@/lib/socket-client";
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
  const [socket, setSocket] = useState<AppSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    let activeSocket: AppSocket | null = null;
    let cancelled = false;

    async function connect() {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const url = getSocketIoClientUrl();
      activeSocket = io(url, {
        path: "/socket.io",
        auth: { token: session?.access_token ?? "dev" },
        autoConnect: true,
        transports: ["websocket", "polling"],
      });

      activeSocket.on("connect", () => {
        if (cancelled) return;
        setConnectionError(null);
        setConnected(true);
      });

      activeSocket.on("disconnect", () => {
        if (cancelled) return;
        setConnected(false);
      });

      activeSocket.on("connect_error", (err) => {
        if (cancelled) return;
        setConnected(false);
        setConnectionError(err.message);
      });

      if (!cancelled) {
        setSocket(activeSocket);
      }
    }

    void connect();

    return () => {
      cancelled = true;
      activeSocket?.disconnect();
      setSocket(null);
      setConnected(false);
    };
  }, []);

  return { socket, connected, connectionError };
}

export function useRoomSocket(
  roomId: string,
  initialMessages: ChatMessage[] = [],
  initialMusic?: RoomMusicState,
  initialWallpaperOverlay = DEFAULT_WALLPAPER_OVERLAY
) {
  const { socket, connected, connectionError } = useSocket();
  const [participants, setParticipants] = useState<RoomPresenceState["participants"]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [wallpaperId, setWallpaperId] = useState<string | null>(null);
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  const [wallpaperOverlayOpacity, setWallpaperOverlayOpacity] = useState(
    initialWallpaperOverlay
  );
  const [music, setMusic] = useState<RoomMusicState>(
    normalizeRoomMusicState(
      initialMusic ?? {
        trackId: null,
        audioUrl: null,
        embedUrl: null,
        sourceUrl: null,
        provider: null,
        trackName: null,
        artist: null,
        isPlaying: false,
        playbackSeq: 0,
      }
    )
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
        const activeCount = payload.participants.filter((p) => p.isActive).length;
        setMusic((prev) => {
          if (!prev.trackId || activeCount === 0) return prev;
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
        setMusic(normalizeRoomMusicState(payload.state));
      }
    });

    return () => {
      socket.emit("room:leave", { roomId });
      joinedRef.current = false;
      socket.off("room:presence");
      socket.off("chat:history");
      socket.off("chat:message");
      socket.off("chat:deleted");
      socket.off("room:wallpaper");
      socket.off("room:wallpaperOverlay");
      socket.off("room:music");
    };
  }, [socket, connected, roomId, joinRoom]);

  // Activity heartbeat — server marks users offline if pings stop
  useEffect(() => {
    if (!socket || !connected || !joinedRef.current) return;

    const sendPing = () => {
      if (document.visibilityState === "hidden") return;
      socket.emit("room:ping", { roomId });
    };

    sendPing();
    const intervalId = window.setInterval(sendPing, ROOM_PRESENCE_PING_INTERVAL_MS);

    const onVisible = () => {
      if (document.visibilityState === "visible") sendPing();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [socket, connected, roomId]);

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
      const next = normalizeRoomMusicState(state);
      setMusic(next);
      socket?.emit("room:music:sync", { roomId, state: next });
    },
    [socket, roomId]
  );

  return {
    connected,
    connectionError,
    participants,
    messages,
    wallpaperId,
    backgroundUrl,
    wallpaperOverlayOpacity,
    broadcastWallpaperOverlay,
    music,
    sendMessage,
    deleteMessage,
    broadcastWallpaper,
    broadcastMusic,
  };
}
