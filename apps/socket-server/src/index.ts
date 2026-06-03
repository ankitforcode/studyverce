import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import Redis from "ioredis";
import jwt from "jsonwebtoken";
import pg from "pg";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  RoomParticipant,
  ChatMessage,
  RoomMusicState,
  RoomTrack,
} from "@studyverce/shared";
import { expressRateLimitMiddleware } from "@studyverce/rate-limit/express";
import {
  roomTrackToMusicState,
  ROOM_PRESENCE_AWAY_THRESHOLD_MS,
  ROOM_PRESENCE_REMOVE_AFTER_AWAY_MS,
  ROOM_PRESENCE_SWEEP_INTERVAL_MS,
} from "@studyverce/shared";

const PORT = parseInt(process.env.PORT ?? "3002", 10);
const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";
const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const JWT_SECRET = process.env.SUPABASE_JWT_SECRET ?? "";

function resolveDatabaseUrl(): string {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  // Auto-configure for local Supabase CLI
  if (
    SUPABASE_URL.includes("127.0.0.1") ||
    SUPABASE_URL.includes("localhost") ||
    process.env.NODE_ENV !== "production"
  ) {
    return "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
  }
  return "";
}

const DATABASE_URL = resolveDatabaseUrl();

interface AuthenticatedUser {
  id: string;
  email?: string;
}

interface SocketData {
  user: AuthenticatedUser;
  profile: {
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
}

function parseCorsOrigins(): string[] {
  const raw = process.env.CORS_ORIGIN ?? "http://localhost:3001";
  const origins = raw
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  return origins.length > 0 ? origins : ["http://localhost:3001"];
}

const corsOrigins = parseCorsOrigins();

const app = express();
app.use(
  cors({
    origin: corsOrigins,
    credentials: true,
  })
);
app.use(expressRateLimitMiddleware());
app.get("/health", (_req, res) => res.json({ status: "ok" }));

const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>(
  httpServer,
  {
    cors: {
      origin: corsOrigins,
      methods: ["GET", "POST"],
      credentials: true,
    },
  }
);

const redis = new Redis(REDIS_URL);
const pgPool = DATABASE_URL ? new pg.Pool({ connectionString: DATABASE_URL }) : null;

if (!pgPool) {
  console.warn("DATABASE_URL not configured — chat persistence disabled on socket server");
} else {
  console.log("Chat persistence enabled via Postgres");
}

function participantsKey(roomId: string) {
  return `room:${roomId}:participants`;
}

function musicKey(roomId: string) {
  return `room:${roomId}:music`;
}

function mapDbTrack(row: Record<string, unknown>): RoomTrack {
  return {
    id: row.id as string,
    name: row.name as string,
    artist: (row.artist as string | null) ?? null,
    audioUrl: row.audio_url as string,
    coverUrl: (row.cover_url as string | null) ?? null,
    durationSeconds: (row.duration_seconds as number | null) ?? null,
    uploadedBy: (row.uploaded_by as string | null) ?? null,
    isPublic: row.is_public as boolean,
    isBuiltin: row.is_builtin as boolean,
    category: row.category as string,
    provider: (row.provider as RoomTrack["provider"]) ?? "direct",
    externalId: (row.external_id as string | null) ?? null,
    sourceUrl: (row.source_url as string | null) ?? null,
    createdAt: row.created_at as string,
  };
}

async function loadRoomMusicFromDb(roomId: string): Promise<RoomMusicState | null> {
  if (!pgPool) return null;
  const result = await pgPool.query(
    `SELECT t.*
     FROM public.study_rooms r
     JOIN public.room_tracks t ON t.id = r.track_id
     WHERE r.id = $1
     LIMIT 1`,
    [roomId]
  );
  if (!result.rows[0]) return null;
  return roomTrackToMusicState(mapDbTrack(result.rows[0]), true);
}

async function getCachedMusic(roomId: string): Promise<RoomMusicState | null> {
  const cached = await redis.get(musicKey(roomId));
  if (cached) return JSON.parse(cached) as RoomMusicState;
  const fromDb = await loadRoomMusicFromDb(roomId);
  if (fromDb) await redis.set(musicKey(roomId), JSON.stringify(fromDb));
  return fromDb;
}

async function syncRoomMusic(roomId: string) {
  const participants = await getParticipants(roomId);
  let state = await getCachedMusic(roomId);
  if (!state?.trackId) return;

  if (countActiveParticipants(participants) === 0) {
    state = { ...state, isPlaying: false };
    await redis.set(musicKey(roomId), JSON.stringify(state));
    return;
  }

  if (!state.isPlaying) {
    state = { ...state, isPlaying: true };
    await redis.set(musicKey(roomId), JSON.stringify(state));
  }

  io.to(roomId).emit("room:music", { roomId, state });
}

async function verifyToken(token: string): Promise<AuthenticatedUser | null> {
  if (!JWT_SECRET) {
    console.warn("SUPABASE_JWT_SECRET not set — socket auth disabled for dev");
    try {
      const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
      return { id: payload.sub, email: payload.email };
    } catch {
      return null;
    }
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { sub: string; email?: string };
    return { id: payload.sub, email: payload.email };
  } catch {
    return null;
  }
}

async function getProfile(userId: string) {
  if (!pgPool) {
    return {
      username: `user_${userId.slice(0, 8)}`,
      displayName: "Anonymous",
      avatarUrl: null,
    };
  }
  const result = await pgPool.query(
    `SELECT username, display_name, avatar_url FROM profiles WHERE id = $1`,
    [userId]
  );
  if (result.rows.length === 0) {
    return {
      username: `user_${userId.slice(0, 8)}`,
      displayName: "Anonymous",
      avatarUrl: null,
    };
  }
  const row = result.rows[0];
  return {
    username: row.username,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
  };
}

function parseStoredParticipant(userId: string, json: string): RoomParticipant {
  const raw = JSON.parse(json) as Partial<RoomParticipant>;
  const lastSeenAt = raw.lastSeenAt ?? new Date(0).toISOString();
  return {
    userId,
    username: raw.username ?? `user_${userId.slice(0, 8)}`,
    displayName: raw.displayName ?? "Anonymous",
    avatarUrl: raw.avatarUrl ?? null,
    socketId: raw.socketId ?? "",
    lastSeenAt,
    isActive: raw.isActive ?? true,
    awaySinceAt: raw.awaySinceAt ?? null,
  };
}

async function getParticipants(roomId: string): Promise<RoomParticipant[]> {
  const data = await redis.hgetall(participantsKey(roomId));
  return Object.entries(data).map(([userId, json]) => parseStoredParticipant(userId, json));
}

function countActiveParticipants(participants: RoomParticipant[]): number {
  return participants.filter((p) => p.isActive).length;
}

async function saveParticipant(roomId: string, participant: RoomParticipant): Promise<void> {
  await redis.hset(participantsKey(roomId), participant.userId, JSON.stringify(participant));
}

async function touchParticipant(
  roomId: string,
  userId: string,
  socketId: string
): Promise<RoomParticipant | null> {
  const raw = await redis.hget(participantsKey(roomId), userId);
  if (!raw) return null;

  const existing = parseStoredParticipant(userId, raw);
  const now = new Date().toISOString();
  const updated: RoomParticipant = {
    ...existing,
    socketId,
    lastSeenAt: now,
    isActive: true,
    awaySinceAt: null,
  };
  await saveParticipant(roomId, updated);
  return updated;
}

async function markParticipantLeft(roomId: string, userId: string): Promise<void> {
  const raw = await redis.hget(participantsKey(roomId), userId);
  if (!raw) return;

  const existing = parseStoredParticipant(userId, raw);
  const now = new Date().toISOString();
  await saveParticipant(roomId, {
    ...existing,
    socketId: "",
    lastSeenAt: now,
  });
}

async function removeParticipantFromRoom(roomId: string, userId: string): Promise<void> {
  const owner = await isRoomOwner(roomId, userId);
  await redis.hdel(participantsKey(roomId), userId);

  if (!owner && pgPool) {
    await pgPool.query(`DELETE FROM room_members WHERE room_id = $1 AND user_id = $2`, [
      roomId,
      userId,
    ]);
  }

  const sockets = await io.in(roomId).fetchSockets();
  for (const s of sockets) {
    if (s.data.user.id === userId) {
      s.emit("room:membership-revoked", { roomId, reason: "inactive" });
      await s.leave(roomId);
    }
  }
}

async function sweepStaleParticipants(): Promise<void> {
  const keys = await redis.keys("room:*:participants");
  const now = Date.now();

  for (const key of keys) {
    const roomId = key.slice("room:".length, -":participants".length);
    const data = await redis.hgetall(key);
    let changed = false;

    for (const [userId, json] of Object.entries(data)) {
      const participant = parseStoredParticipant(userId, json);
      const idleMs = now - new Date(participant.lastSeenAt).getTime();

      if (!participant.isActive) {
        const awaySince = participant.awaySinceAt ?? participant.lastSeenAt;
        const awayMs = now - new Date(awaySince).getTime();
        if (awayMs > ROOM_PRESENCE_REMOVE_AFTER_AWAY_MS) {
          await removeParticipantFromRoom(roomId, userId);
          changed = true;
        }
        continue;
      }

      if (idleMs > ROOM_PRESENCE_AWAY_THRESHOLD_MS) {
        const awaySinceAt = new Date().toISOString();
        await saveParticipant(roomId, {
          ...participant,
          isActive: false,
          awaySinceAt,
        });
        changed = true;
      }
    }

    if (changed) {
      await broadcastPresence(roomId);
      await syncRoomMusic(roomId);
    }
  }
}

async function broadcastPresence(roomId: string) {
  const participants = await getParticipants(roomId);
  io.to(roomId).emit("room:presence", { roomId, participants });
}

async function loadChatHistory(roomId: string): Promise<ChatMessage[]> {
  if (!pgPool) return [];
  const result = await pgPool.query(
    `SELECT m.id, m.room_id, m.user_id, m.content, m.created_at,
            p.username, p.display_name, p.avatar_url
     FROM room_messages m
     JOIN profiles p ON p.id = m.user_id
     WHERE m.room_id = $1
     ORDER BY m.created_at DESC
     LIMIT 50`,
    [roomId]
  );
  return result.rows.reverse().map((row) => ({
    id: row.id,
    roomId: row.room_id,
    userId: row.user_id,
    username: row.username,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    content: row.content,
    createdAt: row.created_at.toISOString(),
  }));
}

async function persistMessage(
  roomId: string,
  userId: string,
  content: string
): Promise<ChatMessage | null> {
  if (!pgPool) return null;
  const profile = await getProfile(userId);
  const result = await pgPool.query(
    `INSERT INTO room_messages (room_id, user_id, content)
     VALUES ($1, $2, $3)
     RETURNING id, room_id, user_id, content, created_at`,
    [roomId, userId, content]
  );
  const row = result.rows[0];
  return {
    id: row.id,
    roomId: row.room_id,
    userId: row.user_id,
    username: profile.username,
    displayName: profile.displayName,
    avatarUrl: profile.avatarUrl,
    content: row.content,
    createdAt: row.created_at.toISOString(),
  };
}

async function deleteMessage(messageId: string, roomId: string) {
  if (!pgPool) return false;
  await pgPool.query(`DELETE FROM room_messages WHERE id = $1 AND room_id = $2`, [
    messageId,
    roomId,
  ]);
  return true;
}

async function isRoomMember(roomId: string, userId: string): Promise<boolean> {
  if (!pgPool) return true;
  const result = await pgPool.query(
    `SELECT 1 FROM room_members WHERE room_id = $1 AND user_id = $2
     UNION
     SELECT 1 FROM study_rooms WHERE id = $1 AND is_public = TRUE
     LIMIT 1`,
    [roomId, userId]
  );
  return result.rows.length > 0;
}

async function isRoomOwnerOrMod(roomId: string, userId: string): Promise<boolean> {
  if (!pgPool) return false;
  const result = await pgPool.query(
    `SELECT 1 FROM study_rooms WHERE id = $1 AND owner_id = $2
     UNION
     SELECT 1 FROM room_members WHERE room_id = $1 AND user_id = $2 AND role IN ('owner', 'moderator')
     LIMIT 1`,
    [roomId, userId]
  );
  return result.rows.length > 0;
}

async function isRoomOwner(roomId: string, userId: string): Promise<boolean> {
  if (!pgPool) return false;
  const result = await pgPool.query(
    `SELECT 1 FROM study_rooms WHERE id = $1 AND owner_id = $2 LIMIT 1`,
    [roomId, userId]
  );
  return result.rows.length > 0;
}

async function startStudySession(
  userId: string,
  roomId?: string,
  goalText?: string,
  subjects?: string[]
): Promise<string | null> {
  if (!pgPool) return crypto.randomUUID();
  const result = await pgPool.query(
    `INSERT INTO study_sessions (user_id, room_id, goal_text, subjects)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [userId, roomId ?? null, goalText ?? null, subjects ?? []]
  );
  return result.rows[0].id;
}

async function endStudySession(sessionId: string, focusMinutes: number, breakMinutes: number) {
  if (!pgPool) return;
  const result = await pgPool.query(
    `UPDATE study_sessions
     SET ended_at = NOW(), focus_minutes = $2, break_minutes = $3
     WHERE id = $1
     RETURNING user_id`,
    [sessionId, focusMinutes, breakMinutes]
  );
  if (result.rows.length > 0 && focusMinutes > 0) {
    await pgPool.query(`SELECT update_profile_stats($1, $2)`, [
      result.rows[0].user_id,
      focusMinutes,
    ]);
  }
}

io.use(async (socket, next) => {
  const token = socket.handshake.auth.token as string | undefined;
  if (!token) {
    return next(new Error("Authentication required"));
  }
  const user = await verifyToken(token);
  if (!user) {
    return next(new Error("Invalid token"));
  }
  const profile = await getProfile(user.id);
  socket.data.user = user;
  socket.data.profile = profile;
  next();
});

io.on("connection", (socket) => {
  const { user, profile } = socket.data;

  socket.on("room:join", async ({ roomId, token: _token }) => {
    try {
      const member = await isRoomMember(roomId, user.id);
      if (!member) {
        socket.emit("error", { message: "Not a member of this room" });
        return;
      }

      await socket.join(roomId);

      const now = new Date().toISOString();
      const participant: RoomParticipant = {
        userId: user.id,
        username: profile.username,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
        socketId: socket.id,
        lastSeenAt: now,
        isActive: true,
        awaySinceAt: null,
      };

      await saveParticipant(roomId, participant);

      const history = await loadChatHistory(roomId);
      socket.emit("chat:history", { messages: history });

      const music = await getCachedMusic(roomId);
      if (music) {
        socket.emit("room:music", { roomId, state: music });
      }

      await broadcastPresence(roomId);
      await syncRoomMusic(roomId);
    } catch (err) {
      console.error("room:join error", err);
      socket.emit("error", { message: "Failed to join room" });
    }
  });

  socket.on("room:leave", async ({ roomId }) => {
    await socket.leave(roomId);
    await markParticipantLeft(roomId, user.id);
    await broadcastPresence(roomId);
    await syncRoomMusic(roomId);
  });

  socket.on("room:ping", async ({ roomId }) => {
    if (!socket.rooms.has(roomId)) return;

    const raw = await redis.hget(participantsKey(roomId), user.id);
    if (!raw) return;

    const wasInactive = !parseStoredParticipant(user.id, raw).isActive;
    await touchParticipant(roomId, user.id, socket.id);

    if (wasInactive) {
      await broadcastPresence(roomId);
      await syncRoomMusic(roomId);
    }
  });

  socket.on("chat:send", async ({ roomId, content }) => {
    if (!content.trim()) return;
    const message = await persistMessage(roomId, user.id, content.trim());
    if (message) {
      io.to(roomId).emit("chat:message", message);
    } else {
      const fallback: ChatMessage = {
        id: crypto.randomUUID(),
        roomId,
        userId: user.id,
        username: profile.username,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
        content: content.trim(),
        createdAt: new Date().toISOString(),
      };
      io.to(roomId).emit("chat:message", fallback);
    }
  });

  // Relay already-persisted messages from the web app (Supabase server actions)
  socket.on("chat:broadcast", async ({ roomId, message }) => {
    const member = await isRoomMember(roomId, user.id);
    if (!member || message.userId !== user.id) {
      socket.emit("error", { message: "Not authorized to broadcast message" });
      return;
    }
    socket.to(roomId).emit("chat:message", message);
  });

  socket.on("chat:broadcast-delete", async ({ roomId, messageId }) => {
    const member = await isRoomMember(roomId, user.id);
    if (!member) {
      socket.emit("error", { message: "Not authorized" });
      return;
    }
    socket.to(roomId).emit("chat:deleted", { messageId });
  });

  socket.on("chat:delete", async ({ roomId, messageId }) => {
    const canDelete = await isRoomOwnerOrMod(roomId, user.id);
    if (!canDelete) {
      socket.emit("error", { message: "Not authorized to delete messages" });
      return;
    }
    await deleteMessage(messageId, roomId);
    io.to(roomId).emit("chat:deleted", { messageId });
  });

  socket.on("room:wallpaper:set", async ({ roomId, wallpaperId, imageUrl }) => {
    const canManage = await isRoomOwnerOrMod(roomId, user.id);
    if (!canManage) {
      socket.emit("error", { message: "Not authorized to change room background" });
      return;
    }
    io.to(roomId).emit("room:wallpaper", { roomId, wallpaperId, imageUrl });
  });

  socket.on("room:wallpaperOverlay:set", async ({ roomId, overlayOpacity }) => {
    const owner = await isRoomOwner(roomId, user.id);
    if (!owner) {
      socket.emit("error", {
        message: "Only the room creator can change wallpaper opacity",
      });
      return;
    }
    io.to(roomId).emit("room:wallpaperOverlay", { roomId, overlayOpacity });
  });

  socket.on("room:music:sync", async ({ roomId, state }) => {
    const owner = await isRoomOwner(roomId, user.id);
    if (!owner) {
      socket.emit("error", { message: "Only the room owner can change room music" });
      return;
    }

    const participants = await getParticipants(roomId);
    const nextState =
      countActiveParticipants(participants) > 0 && state.trackId
        ? { ...state, isPlaying: state.isPlaying ?? true }
        : state;

    await redis.set(musicKey(roomId), JSON.stringify(nextState));
    io.to(roomId).emit("room:music", { roomId, state: nextState });
  });

  socket.on("session:start", async ({ roomId, goalText, subjects }) => {
    const sessionId = await startStudySession(user.id, roomId, goalText, subjects);
    if (sessionId) {
      socket.emit("session:started", { sessionId });
    }
  });

  socket.on("session:end", async ({ sessionId }) => {
    await endStudySession(sessionId, 0, 0);
    socket.emit("session:ended", { sessionId });
  });

  socket.on("disconnect", async () => {
    const rooms = Array.from(socket.rooms).filter((r) => r !== socket.id);
    for (const roomId of rooms) {
      await markParticipantLeft(roomId, user.id);
      await broadcastPresence(roomId);
      await syncRoomMusic(roomId);
    }
  });
});

setInterval(() => {
  void sweepStaleParticipants();
}, ROOM_PRESENCE_SWEEP_INTERVAL_MS);

httpServer.listen(PORT, () => {
  console.log(`Socket server running on port ${PORT}`);
});
