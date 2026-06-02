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
  PomodoroState,
  RoomParticipant,
  ChatMessage,
  RoomMusicState,
  RoomTrack,
} from "@studyverce/shared";
import { roomTrackToMusicState } from "@studyverce/shared";

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

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN ?? "http://localhost:3001" }));
app.get("/health", (_req, res) => res.json({ status: "ok" }));

const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>(
  httpServer,
  {
    cors: {
      origin: process.env.CORS_ORIGIN ?? "http://localhost:3001",
      methods: ["GET", "POST"],
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

function pomodoroKey(roomId: string) {
  return `room:${roomId}:pomodoro`;
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

  if (participants.length === 0) {
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

function defaultPomodoroState(): PomodoroState {
  return {
    phase: "idle",
    remainingSeconds: 25 * 60,
    focusMinutes: 25,
    breakMinutes: 5,
    startedBy: null,
    isPaused: false,
    updatedAt: new Date().toISOString(),
  };
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

async function getParticipants(roomId: string): Promise<RoomParticipant[]> {
  const data = await redis.hgetall(participantsKey(roomId));
  return Object.entries(data).map(([userId, json]) => {
    const parsed = JSON.parse(json) as RoomParticipant;
    return { ...parsed, userId };
  });
}

async function broadcastPresence(roomId: string) {
  const participants = await getParticipants(roomId);
  io.to(roomId).emit("room:presence", { roomId, participants });
}

async function getPomodoroState(roomId: string): Promise<PomodoroState> {
  const raw = await redis.get(pomodoroKey(roomId));
  if (!raw) return defaultPomodoroState();
  const state = JSON.parse(raw) as PomodoroState;

  if (!state.isPaused && state.phase !== "idle" && state.remainingSeconds > 0) {
    const elapsed = Math.floor(
      (Date.now() - new Date(state.updatedAt).getTime()) / 1000
    );
    state.remainingSeconds = Math.max(0, state.remainingSeconds - elapsed);
    state.updatedAt = new Date().toISOString();
    await redis.set(pomodoroKey(roomId), JSON.stringify(state));
  }

  return state;
}

async function setPomodoroState(roomId: string, state: PomodoroState) {
  state.updatedAt = new Date().toISOString();
  await redis.set(pomodoroKey(roomId), JSON.stringify(state));
  io.to(roomId).emit("pomodoro:sync", { roomId, state });
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

// Pomodoro tick interval
setInterval(async () => {
  const roomKeys = await redis.keys("room:*:pomodoro");
  for (const key of roomKeys) {
    const roomId = key.split(":")[1];
    const state = await getPomodoroState(roomId);

    if (state.phase === "idle" || state.isPaused || state.remainingSeconds <= 0) {
      if (state.remainingSeconds <= 0 && state.phase !== "idle" && !state.isPaused) {
        if (state.phase === "focus") {
          const newState: PomodoroState = {
            ...state,
            phase: "break",
            remainingSeconds: state.breakMinutes * 60,
            isPaused: false,
          };
          await setPomodoroState(roomId, newState);
        } else {
          const newState: PomodoroState = {
            ...defaultPomodoroState(),
            focusMinutes: state.focusMinutes,
            breakMinutes: state.breakMinutes,
          };
          await setPomodoroState(roomId, newState);
        }
      }
      continue;
    }

    state.remainingSeconds -= 1;
    state.updatedAt = new Date().toISOString();
    await redis.set(pomodoroKey(roomId), JSON.stringify(state));
    io.to(roomId).emit("pomodoro:sync", { roomId, state });

    if (state.remainingSeconds <= 0) {
      if (state.phase === "focus") {
        const newState: PomodoroState = {
          ...state,
          phase: "break",
          remainingSeconds: state.breakMinutes * 60,
          isPaused: false,
        };
        await setPomodoroState(roomId, newState);
      } else {
        const newState: PomodoroState = {
          ...defaultPomodoroState(),
          focusMinutes: state.focusMinutes,
          breakMinutes: state.breakMinutes,
        };
        await setPomodoroState(roomId, newState);
      }
    }
  }
}, 1000);

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

      const participant: RoomParticipant = {
        userId: user.id,
        username: profile.username,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
        socketId: socket.id,
      };

      await redis.hset(
        participantsKey(roomId),
        user.id,
        JSON.stringify(participant)
      );

      const history = await loadChatHistory(roomId);
      socket.emit("chat:history", { messages: history });

      const pomodoro = await getPomodoroState(roomId);
      socket.emit("pomodoro:sync", { roomId, state: pomodoro });

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
    await redis.hdel(participantsKey(roomId), user.id);
    await broadcastPresence(roomId);
    await syncRoomMusic(roomId);
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

  socket.on("pomodoro:start", async ({ roomId, phase, focusMinutes, breakMinutes }) => {
    const state = await getPomodoroState(roomId);
    const focus = focusMinutes ?? state.focusMinutes;
    const breakM = breakMinutes ?? state.breakMinutes;
    const newState: PomodoroState = {
      phase,
      remainingSeconds: (phase === "focus" ? focus : breakM) * 60,
      focusMinutes: focus,
      breakMinutes: breakM,
      startedBy: user.id,
      isPaused: false,
      updatedAt: new Date().toISOString(),
    };
    await setPomodoroState(roomId, newState);
  });

  socket.on("pomodoro:pause", async ({ roomId }) => {
    const state = await getPomodoroState(roomId);
    state.isPaused = !state.isPaused;
    state.updatedAt = new Date().toISOString();
    await setPomodoroState(roomId, state);
  });

  socket.on("pomodoro:reset", async ({ roomId }) => {
    const state = defaultPomodoroState();
    await setPomodoroState(roomId, state);
  });

  socket.on("room:wallpaper:set", async ({ roomId, wallpaperId, imageUrl }) => {
    const canManage = await isRoomOwnerOrMod(roomId, user.id);
    if (!canManage) {
      socket.emit("error", { message: "Not authorized to change room background" });
      return;
    }
    io.to(roomId).emit("room:wallpaper", { roomId, wallpaperId, imageUrl });
  });

  socket.on("room:music:sync", async ({ roomId, state }) => {
    const owner = await isRoomOwner(roomId, user.id);
    if (!owner) {
      socket.emit("error", { message: "Only the room owner can change room music" });
      return;
    }

    const participants = await getParticipants(roomId);
    const nextState =
      participants.length > 0 && state.trackId
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
      await redis.hdel(participantsKey(roomId), user.id);
      await broadcastPresence(roomId);
      await syncRoomMusic(roomId);
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`Socket server running on port ${PORT}`);
});
