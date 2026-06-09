import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import Redis from "ioredis";
import {
  configureLazyRedis,
  redactRedisUrl,
  resolveRedisUrl,
  roomMusicKey,
  roomParticipantsKey,
  roomParticipantsRoomsKey,
  scanRedisKeys,
} from "@studyverce/redis";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import jwt from "jsonwebtoken";
import pg from "pg";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  RoomParticipant,
  RoomPresenceMode,
  ChatMessage,
  RoomMusicState,
  RoomTrack,
} from "@studyverce/shared";
import { expressRateLimitMiddleware } from "@studyverce/rate-limit/express";
import {
  roomTrackToMusicState,
  normalizePresenceMode,
  parseChatMentions,
  CHAT_MENTION_EVERYONE,
  CHAT_MENTION_HERE,
  isParticipantInRoomForChatEveryone,
  isParticipantOnlineForChatHere,
  ROOM_PRESENCE_AWAY_THRESHOLD_MS,
  ROOM_PRESENCE_REMOVE_AFTER_AWAY_MS,
  ROOM_PRESENCE_SWEEP_INTERVAL_MS,
} from "@studyverce/shared";
import {
  appendChatMessage,
  getCachedActiveCount,
  getCachedActiveCountsBatch,
  getCachedChatHistory,
  getCachedProfile,
  getCachedRoomMember,
  getCachedRoomOwnerCheck,
  getCachedRoomOwnerId,
  getCachedRoomOwnerOrMod,
  invalidateActiveCount,
  invalidateRoomMemberAuth,
  listParticipantRoomKeys,
  removeChatMessage,
  removeRoomParticipant,
  saveRoomParticipant,
  setCachedRoomMusic,
} from "./redis-cache";

const PORT = parseInt(process.env.PORT ?? "3002", 10);

type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function resolveLogLevel(): LogLevel {
  const raw = (process.env.SOCKET_LOG_LEVEL ?? process.env.LOG_LEVEL ?? "").toLowerCase();
  if (raw === "debug" || raw === "info" || raw === "warn" || raw === "error") {
    return raw;
  }
  return process.env.NODE_ENV === "production" ? "info" : "debug";
}

const activeLogLevel = resolveLogLevel();

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[activeLogLevel];
}

function formatMeta(meta?: Record<string, unknown>): string {
  if (!meta || Object.keys(meta).length === 0) return "";
  return ` ${JSON.stringify(meta)}`;
}

const log = {
  debug(message: string, meta?: Record<string, unknown>) {
    if (shouldLog("debug")) {
      console.log(`[socket-server] DEBUG ${message}${formatMeta(meta)}`);
    }
  },
  info(message: string, meta?: Record<string, unknown>) {
    if (shouldLog("info")) {
      console.log(`[socket-server] ${message}${formatMeta(meta)}`);
    }
  },
  warn(message: string, meta?: Record<string, unknown>) {
    if (shouldLog("warn")) {
      console.warn(`[socket-server] WARN ${message}${formatMeta(meta)}`);
    }
  },
  error(message: string, err?: unknown, meta?: Record<string, unknown>) {
    if (shouldLog("error")) {
      console.error(`[socket-server] ERROR ${message}${formatMeta(meta)}`, err ?? "");
    }
  },
};

configureLazyRedis({
  label: "socket-server",
  isEnabled: () =>
    Boolean(process.env.REDIS_URL?.trim() || process.env.REDIS_HOST?.trim()),
  resolveUrl: () =>
    resolveRedisUrl({
      requiredInProduction: true,
      localFallback: "redis://localhost:6379",
    }),
});

const REDIS_URL = resolveRedisUrl({
  requiredInProduction: true,
  localFallback: "redis://localhost:6379",
});
const SUPABASE_URL = (process.env.SUPABASE_URL ?? "").trim();
const JWT_SECRET = (process.env.SUPABASE_JWT_SECRET ?? "").trim();

let supabaseJwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function supabaseAuthIssuer(): string | null {
  if (!SUPABASE_URL) return null;
  return `${SUPABASE_URL.replace(/\/$/, "")}/auth/v1`;
}

function getSupabaseJwks(): ReturnType<typeof createRemoteJWKSet> {
  const issuer = supabaseAuthIssuer();
  if (!issuer) {
    throw new Error("SUPABASE_URL is required to verify asymmetric Supabase JWTs");
  }
  if (!supabaseJwks) {
    supabaseJwks = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));
  }
  return supabaseJwks;
}

function formatJwtError(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

function getJwtAlgorithm(token: string): string | null {
  try {
    const header = JSON.parse(Buffer.from(token.split(".")[0] ?? "", "base64url").toString()) as {
      alg?: unknown;
    };
    return typeof header.alg === "string" ? header.alg : null;
  } catch {
    return null;
  }
}

function payloadToUser(payload: JWTPayload): AuthenticatedUser | null {
  if (typeof payload.sub !== "string") return null;
  return {
    id: payload.sub,
    email: typeof payload.email === "string" ? payload.email : undefined,
  };
}

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

app.get("/presence", async (req, res) => {
  const raw = req.query.roomIds;
  const roomIds =
    typeof raw === "string"
      ? raw.split(",").map((id) => id.trim()).filter(Boolean)
      : [];

  log.debug("GET /presence", { roomCount: roomIds.length, roomIds });

  const counts = await getCachedActiveCountsBatch(redis, roomIds, async (roomId) => {
    const participants = await getParticipants(roomId);
    return countActiveParticipants(participants);
  });

  res.json({ counts });
});

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
redis.on("connect", () => {
  log.info("redis connected", { url: redactRedisUrl(REDIS_URL) });
});
redis.on("ready", () => log.info("redis ready"));
redis.on("error", (err) => log.error("redis error", err));
redis.on("close", () => log.warn("redis connection closed"));
redis.on("reconnecting", () => log.info("redis reconnecting"));

const useRedisAdapter = process.env.SOCKET_REDIS_ADAPTER === "true";
if (useRedisAdapter) {
  const redisPub = redis.duplicate();
  const redisSub = redis.duplicate();
  io.adapter(createAdapter(redisPub, redisSub));
  log.info("socket.io redis adapter enabled");
} else {
  log.info(
    "socket.io redis adapter disabled (set SOCKET_REDIS_ADAPTER=true when ECS desiredCount > 1)"
  );
}

async function backfillParticipantRoomIndex(): Promise<void> {
  const indexed = await redis.scard(roomParticipantsRoomsKey());
  if (indexed > 0) return;

  const keys = await scanRedisKeys(redis, "room:*:participants");
  if (keys.length === 0) return;

  const roomIds = keys.map((key) => key.slice("room:".length, -":participants".length));
  await redis.sadd(roomParticipantsRoomsKey(), ...roomIds);
  log.info("backfilled participant room index", { roomCount: roomIds.length });
}

void backfillParticipantRoomIndex().catch((err) => {
  log.error("participant room index backfill failed", err);
});

const pgPool = DATABASE_URL ? new pg.Pool({ connectionString: DATABASE_URL }) : null;
if (pgPool) {
  pgPool.on("error", (err) => log.error("postgres pool error", err));
  log.info("chat persistence enabled via Postgres");
} else {
  log.warn("DATABASE_URL not configured — chat persistence disabled");
}

function presenceWatchRoom(roomId: string) {
  return `presence-watch:${roomId}`;
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
  const cached = await redis.get(roomMusicKey(roomId));
  if (cached) return JSON.parse(cached) as RoomMusicState;
  const fromDb = await loadRoomMusicFromDb(roomId);
  if (fromDb) await setCachedRoomMusic(redis, roomId, fromDb);
  return fromDb;
}

async function syncRoomMusic(roomId: string) {
  const participants = await getParticipants(roomId);
  let state = await getCachedMusic(roomId);
  if (!state?.trackId) return;

  if (countActiveParticipants(participants) === 0) {
    state = { ...state, isPlaying: false };
    await setCachedRoomMusic(redis, roomId, state);
    return;
  }

  if (!state.isPlaying) {
    state = { ...state, isPlaying: true };
    await setCachedRoomMusic(redis, roomId, state);
  }

  io.to(roomId).emit("room:music", { roomId, state });
}

async function verifyToken(token: string): Promise<AuthenticatedUser | null> {
  const alg = getJwtAlgorithm(token);

  if (alg && alg !== "HS256") {
    const issuer = supabaseAuthIssuer();
    if (!issuer) {
      log.warn("asymmetric JWT rejected — SUPABASE_URL missing", { alg });
      return null;
    }
    try {
      const { payload } = await jwtVerify(token, getSupabaseJwks(), { issuer });
      return payloadToUser(payload);
    } catch (err) {
      log.warn("asymmetric JWT verification failed", {
        alg,
        issuer,
        reason: formatJwtError(err),
      });
      return null;
    }
  }

  if (!JWT_SECRET) {
    if (process.env.NODE_ENV === "production") {
      log.error("SUPABASE_JWT_SECRET required in production — rejecting token");
      return null;
    }
    log.warn("SUPABASE_JWT_SECRET not set — decoding HS256 JWT payload without verification");
    try {
      const payload = JSON.parse(Buffer.from(token.split(".")[1] ?? "", "base64url").toString()) as {
        sub?: string;
        email?: string;
      };
      if (!payload.sub) return null;
      return { id: payload.sub, email: payload.email };
    } catch (err) {
      log.warn("HS256 JWT decode failed", { reason: formatJwtError(err) });
      return null;
    }
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] }) as {
      sub: string;
      email?: string;
    };
    return { id: payload.sub, email: payload.email };
  } catch (err) {
    log.warn("HS256 JWT verification failed", { reason: formatJwtError(err) });
    return null;
  }
}

async function getProfile(userId: string) {
  return getCachedProfile(redis, userId, async () => {
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
  });
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
    presenceMode: normalizePresenceMode(raw.presenceMode),
    awaySinceAt: raw.awaySinceAt ?? null,
  };
}

function presenceModeToActive(mode: RoomPresenceMode): boolean {
  return mode === "active";
}

async function setParticipantPresence(
  roomId: string,
  userId: string,
  mode: RoomPresenceMode
): Promise<RoomParticipant | null> {
  const raw = await redis.hget(roomParticipantsKey(roomId), userId);
  if (!raw) return null;

  const existing = parseStoredParticipant(userId, raw);
  const now = new Date().toISOString();
  const isActive = presenceModeToActive(mode);
  const updated: RoomParticipant = {
    ...existing,
    presenceMode: mode,
    isActive,
    lastSeenAt: now,
    awaySinceAt: isActive ? null : now,
  };
  await saveParticipant(roomId, updated);
  return updated;
}

async function getParticipants(roomId: string): Promise<RoomParticipant[]> {
  const data = await redis.hgetall(roomParticipantsKey(roomId));
  return Object.entries(data).map(([userId, json]) => parseStoredParticipant(userId, json));
}

function countActiveParticipants(participants: RoomParticipant[]): number {
  return participants.filter((p) => p.isActive).length;
}

async function saveParticipant(roomId: string, participant: RoomParticipant): Promise<void> {
  await saveRoomParticipant(
    redis,
    roomId,
    participant.userId,
    JSON.stringify(participant)
  );
}

async function touchParticipant(
  roomId: string,
  userId: string,
  socketId: string
): Promise<{ participant: RoomParticipant; wasInactive: boolean } | null> {
  const raw = await redis.hget(roomParticipantsKey(roomId), userId);
  if (!raw) return null;

  const existing = parseStoredParticipant(userId, raw);
  const wasInactive = !existing.isActive;
  const now = new Date().toISOString();
  const mode = normalizePresenceMode(existing.presenceMode);
  const isActive = presenceModeToActive(mode);
  const updated: RoomParticipant = {
    ...existing,
    socketId,
    lastSeenAt: now,
    isActive,
    awaySinceAt: isActive ? null : existing.awaySinceAt ?? now,
  };
  await saveParticipant(roomId, updated);
  return { participant: updated, wasInactive };
}

async function markParticipantLeft(roomId: string, userId: string): Promise<void> {
  const raw = await redis.hget(roomParticipantsKey(roomId), userId);
  if (!raw) return;

  const existing = parseStoredParticipant(userId, raw);
  const now = new Date().toISOString();
  await saveParticipant(roomId, {
    ...existing,
    socketId: "",
    lastSeenAt: now,
    isActive: false,
    awaySinceAt: now,
  });
}

async function removeParticipantFromRoom(roomId: string, userId: string): Promise<void> {
  const owner = await isRoomOwner(roomId, userId);
  await removeRoomParticipant(redis, roomId, userId);
  await invalidateRoomMemberAuth(redis, roomId, userId);
  await invalidateActiveCount(redis, roomId);

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
  const keys = await listParticipantRoomKeys(redis);
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

      if (
        idleMs > ROOM_PRESENCE_AWAY_THRESHOLD_MS &&
        normalizePresenceMode(participant.presenceMode) === "active"
      ) {
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
      log.debug("presence sweep updated room", { roomId });
      await broadcastPresence(roomId);
      await syncRoomMusic(roomId);
    }
  }
}

async function getActiveParticipantCount(roomId: string): Promise<number> {
  return getCachedActiveCount(redis, roomId, async () => {
    const participants = await getParticipants(roomId);
    return countActiveParticipants(participants);
  });
}

async function broadcastPresenceCount(roomId: string) {
  const activeCount = await getActiveParticipantCount(roomId);
  io.to(presenceWatchRoom(roomId)).emit("rooms:presence-count", { roomId, activeCount });
}

async function broadcastPresence(roomId: string) {
  await invalidateActiveCount(redis, roomId);
  const participants = await getParticipants(roomId);
  io.to(roomId).emit("room:presence", { roomId, participants });
  await broadcastPresenceCount(roomId);
}

async function loadChatHistoryFromDb(roomId: string): Promise<ChatMessage[]> {
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

async function loadChatHistory(roomId: string): Promise<ChatMessage[]> {
  return getCachedChatHistory(redis, roomId, () => loadChatHistoryFromDb(roomId));
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
  const message = {
    id: row.id,
    roomId: row.room_id,
    userId: row.user_id,
    username: profile.username,
    displayName: profile.displayName,
    avatarUrl: profile.avatarUrl,
    content: row.content,
    createdAt: row.created_at.toISOString(),
  };
  await appendChatMessage(redis, roomId, message);
  return message;
}

async function deleteMessage(messageId: string, roomId: string) {
  if (!pgPool) return false;
  await pgPool.query(`DELETE FROM room_messages WHERE id = $1 AND room_id = $2`, [
    messageId,
    roomId,
  ]);
  await removeChatMessage(redis, roomId, messageId);
  return true;
}

async function loadMessageById(
  messageId: string,
  roomId: string
): Promise<ChatMessage | null> {
  if (!pgPool) return null;
  const result = await pgPool.query(
    `SELECT m.id, m.room_id, m.user_id, m.content, m.created_at,
            p.username, p.display_name, p.avatar_url
     FROM room_messages m
     JOIN profiles p ON p.id = m.user_id
     WHERE m.id = $1 AND m.room_id = $2
     LIMIT 1`,
    [messageId, roomId]
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    id: row.id,
    roomId: row.room_id,
    userId: row.user_id,
    username: row.username,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    content: row.content,
    createdAt: row.created_at.toISOString(),
  };
}

async function canDeleteChatMessage(
  roomId: string,
  userId: string,
  messageId: string
): Promise<boolean> {
  if (!pgPool) return false;
  const result = await pgPool.query(
    `SELECT m.user_id AS author_id, sr.owner_id,
            rm.role AS member_role
     FROM room_messages m
     JOIN study_rooms sr ON sr.id = m.room_id
     LEFT JOIN room_members rm
       ON rm.room_id = m.room_id AND rm.user_id = $3
     WHERE m.id = $1 AND m.room_id = $2
     LIMIT 1`,
    [messageId, roomId, userId]
  );
  const row = result.rows[0] as
    | { author_id: string; owner_id: string; member_role: string | null }
    | undefined;
  if (!row) return false;
  return (
    row.author_id === userId ||
    row.owner_id === userId ||
    row.member_role === "owner" ||
    row.member_role === "moderator"
  );
}

const MAX_SESSION_FOCUS_MINUTES = 480;
const MAX_SESSION_BREAK_MINUTES = 120;

async function isRoomMember(roomId: string, userId: string): Promise<boolean> {
  if (!pgPool) return false;
  return getCachedRoomMember(redis, roomId, userId, async () => {
    const result = await pgPool!.query(
      `SELECT 1 FROM room_members WHERE room_id = $1 AND user_id = $2 LIMIT 1`,
      [roomId, userId]
    );
    return result.rows.length > 0;
  });
}

async function isRoomOwnerOrMod(roomId: string, userId: string): Promise<boolean> {
  if (!pgPool) return false;
  return getCachedRoomOwnerOrMod(redis, roomId, userId, async () => {
    const result = await pgPool!.query(
      `SELECT 1 FROM study_rooms WHERE id = $1 AND owner_id = $2
       UNION
       SELECT 1 FROM room_members WHERE room_id = $1 AND user_id = $2 AND role IN ('owner', 'moderator')
       LIMIT 1`,
      [roomId, userId]
    );
    return result.rows.length > 0;
  });
}

async function isRoomOwner(roomId: string, userId: string): Promise<boolean> {
  if (!pgPool) return false;
  return getCachedRoomOwnerCheck(redis, roomId, userId, async () => {
    const result = await pgPool!.query(
      `SELECT 1 FROM study_rooms WHERE id = $1 AND owner_id = $2 LIMIT 1`,
      [roomId, userId]
    );
    return result.rows.length > 0;
  });
}

async function getRoomOwnerId(roomId: string): Promise<string | null> {
  if (!pgPool) return null;
  return getCachedRoomOwnerId(redis, roomId, async () => {
    const result = await pgPool!.query(
      `SELECT owner_id FROM study_rooms WHERE id = $1 LIMIT 1`,
      [roomId]
    );
    return (result.rows[0]?.owner_id as string | undefined) ?? null;
  });
}

async function notifyRoomOwnerInviteEvent(
  roomId: string,
  kind: "access_requested" | "member_joined",
  member: { userId: string; displayName: string; username: string }
): Promise<void> {
  if (!pgPool) return;

  const ownerId = await getRoomOwnerId(roomId);
  if (!ownerId || ownerId === member.userId) return;

  const roomResult = await pgPool.query(
    `SELECT slug, name, is_public FROM study_rooms WHERE id = $1 LIMIT 1`,
    [roomId]
  );
  const room = roomResult.rows[0] as
    | { slug: string; name: string; is_public: boolean }
    | undefined;
  if (!room || room.is_public) return;

  io.to(userChannel(ownerId)).emit("room:invite-owner-notification", {
    roomId,
    roomSlug: room.slug,
    roomName: room.name,
    memberUserId: member.userId,
    memberDisplayName: member.displayName,
    memberUsername: member.username,
    kind,
  });
}

function truncateChatPreview(content: string, maxLength = 120): string {
  const trimmed = content.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength - 3)}...`;
}

async function notifyChatMentions(
  roomId: string,
  message: ChatMessage,
  senderUserId: string
): Promise<void> {
  if (!pgPool) return;

  const { usernames, broadcastMentions } = parseChatMentions(message.content);
  const notifyHere = broadcastMentions.includes(CHAT_MENTION_HERE);
  const notifyEveryone = broadcastMentions.includes(CHAT_MENTION_EVERYONE);

  if (usernames.length === 0 && !notifyHere && !notifyEveryone) return;

  const roomResult = await pgPool.query(
    `SELECT slug, name FROM study_rooms WHERE id = $1 LIMIT 1`,
    [roomId]
  );
  const room = roomResult.rows[0] as { slug: string; name: string } | undefined;
  if (!room) return;

  const targetUserIds = new Set<string>();

  if (usernames.length > 0) {
    const membersResult = await pgPool.query(
      `SELECT rm.user_id
       FROM room_members rm
       JOIN profiles p ON p.id = rm.user_id
       WHERE rm.room_id = $1 AND lower(p.username) = ANY($2::text[])`,
      [roomId, usernames]
    );

    for (const row of membersResult.rows) {
      const userId = row.user_id as string;
      if (userId !== senderUserId) {
        targetUserIds.add(userId);
      }
    }
  }

  if (notifyHere || notifyEveryone) {
    const participants = await getParticipants(roomId);

    for (const participant of participants) {
      if (participant.userId === senderUserId) continue;

      if (notifyEveryone) {
        if (isParticipantInRoomForChatEveryone(participant, senderUserId)) {
          targetUserIds.add(participant.userId);
        }
        continue;
      }

      if (notifyHere && isParticipantOnlineForChatHere(participant)) {
        targetUserIds.add(participant.userId);
      }
    }
  }

  if (targetUserIds.size === 0) return;

  const contentPreview = truncateChatPreview(message.content);

  for (const userId of targetUserIds) {
    io.to(userChannel(userId)).emit("chat:mention-notification", {
      roomId,
      roomSlug: room.slug,
      roomName: room.name,
      messageId: message.id,
      senderUserId,
      senderDisplayName: message.displayName,
      senderUsername: message.username,
      contentPreview,
    });
  }
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

async function endStudySession(
  sessionId: string,
  userId: string,
  focusMinutes: number,
  breakMinutes: number
) {
  if (!pgPool) return;
  const cappedFocus = Math.min(
    Math.max(0, Math.floor(focusMinutes)),
    MAX_SESSION_FOCUS_MINUTES
  );
  const cappedBreak = Math.min(
    Math.max(0, Math.floor(breakMinutes)),
    MAX_SESSION_BREAK_MINUTES
  );
  const result = await pgPool.query(
    `UPDATE study_sessions
     SET ended_at = NOW(), focus_minutes = $2, break_minutes = $3
     WHERE id = $1 AND user_id = $4 AND ended_at IS NULL
     RETURNING user_id`,
    [sessionId, cappedFocus, cappedBreak, userId]
  );
  if (result.rows.length > 0 && cappedFocus > 0) {
    await pgPool.query(`SELECT update_profile_stats($1, $2)`, [
      result.rows[0].user_id,
      cappedFocus,
    ]);
  }
}

io.use(async (socket, next) => {
  const token = socket.handshake.auth.token as string | undefined;
  if (!token) {
    log.warn("connection rejected: missing auth token", {
      socketId: socket.id,
      address: socket.handshake.address,
    });
    return next(new Error("Authentication required"));
  }
  const user = await verifyToken(token);
  if (!user) {
    log.warn("connection rejected: invalid token", {
      socketId: socket.id,
      address: socket.handshake.address,
      alg: getJwtAlgorithm(token),
      supabaseUrl: SUPABASE_URL ? "configured" : "missing",
      jwtSecret: JWT_SECRET ? "configured" : "missing",
    });
    return next(new Error("Invalid token"));
  }
  const profile = await getProfile(user.id);
  socket.data.user = user;
  socket.data.profile = profile;
  log.info("client authenticated", {
    userId: user.id,
    username: profile.username,
    socketId: socket.id,
  });
  next();
});

function userChannel(userId: string) {
  return `user:${userId}`;
}

io.on("connection", (socket) => {
  const { user, profile } = socket.data;
  void socket.join(userChannel(user.id));
  log.info("client connected", {
    userId: user.id,
    username: profile.username,
    socketId: socket.id,
  });

  socket.on("access:request-created", async ({ roomId, request }) => {
    if (!pgPool) return;
    try {
      const result = await pgPool.query(
        `SELECT 1 FROM room_access_requests
         WHERE id = $1 AND room_id = $2 AND user_id = $3 AND status = 'pending'
         LIMIT 1`,
        [request.id, roomId, user.id]
      );
      if (result.rows.length === 0) {
        socket.emit("error", { message: "Invalid access request" });
        return;
      }
      io.to(roomId).emit("room:access-request:new", { request });
      await notifyRoomOwnerInviteEvent(roomId, "access_requested", {
        userId: user.id,
        displayName: request.requesterName ?? profile.displayName,
        username: request.requesterUsername ?? profile.username,
      });
    } catch (err) {
      log.error("access:request-created failed", err, { userId: user.id, roomId });
      socket.emit("error", { message: "Failed to notify room owner" });
    }
  });

  socket.on("access:reviewed", async ({ roomId, requestId, userId, status }) => {
    try {
      const owner = await isRoomOwner(roomId, user.id);
      if (!owner) {
        socket.emit("error", { message: "Only the room owner can review access requests" });
        return;
      }
      io.to(userChannel(userId)).emit("room:access-request:reviewed", {
        roomId,
        requestId,
        status,
      });
      io.to(roomId).emit("room:access-request:removed", { requestId });
    } catch (err) {
      log.error("access:reviewed failed", err, { userId: user.id, roomId, requestId });
      socket.emit("error", { message: "Failed to broadcast access review" });
    }
  });

  socket.on("music:request-created", async ({ roomId, request }) => {
    if (!pgPool) return;
    try {
      const result = await pgPool.query(
        `SELECT 1 FROM room_track_requests
         WHERE id = $1 AND room_id = $2 AND requested_by = $3 AND status = 'pending'
         LIMIT 1`,
        [request.id, roomId, user.id]
      );
      if (result.rows.length === 0) {
        socket.emit("error", { message: "Invalid music request" });
        return;
      }
      io.to(roomId).emit("room:music-request:new", { request });
    } catch (err) {
      log.error("music:request-created failed", err, { userId: user.id, roomId });
      socket.emit("error", { message: "Failed to notify room owner" });
    }
  });

  socket.on("music:reviewed", async ({ roomId, requestId, userId, status }) => {
    try {
      const owner = await isRoomOwner(roomId, user.id);
      if (!owner) {
        socket.emit("error", { message: "Only the room owner can review music requests" });
        return;
      }
      io.to(userChannel(userId)).emit("room:music-request:reviewed", {
        roomId,
        requestId,
        status,
      });
      io.to(roomId).emit("room:music-request:removed", { requestId });
    } catch (err) {
      log.error("music:reviewed failed", err, { userId: user.id, roomId, requestId });
      socket.emit("error", { message: "Failed to broadcast music review" });
    }
  });

  socket.on("friend:request-created", async ({ roomId, toUserId, request }) => {
    if (!pgPool) return;
    try {
      const result = await pgPool.query(
        `SELECT 1 FROM friendships
         WHERE user_id = $1 AND friend_id = $2 AND status = 'pending'
         LIMIT 1`,
        [user.id, toUserId]
      );
      if (result.rows.length === 0) {
        socket.emit("error", { message: "Invalid friend request" });
        return;
      }
      io.to(userChannel(toUserId)).emit("room:friend-request:new", { request });
    } catch (err) {
      log.error("friend:request-created failed", err, { userId: user.id, roomId, toUserId });
      socket.emit("error", { message: "Failed to notify friend request recipient" });
    }
  });

  socket.on("friend:reviewed", async ({ requesterId }) => {
    if (!pgPool || !requesterId) return;
    const result = await pgPool.query(
      `SELECT 1 FROM friendships
       WHERE user_id = $1 AND friend_id = $2 AND status IN ('accepted', 'pending')
       LIMIT 1`,
      [requesterId, user.id]
    );
    if (result.rows.length === 0) return;
    io.to(userChannel(user.id)).emit("room:friend-request:removed", { requesterId });
    io.to(userChannel(requesterId)).emit("room:friend-request:removed", { requesterId });
  });

  socket.on("rooms:presence:subscribe", async ({ roomIds }) => {
    const uniqueIds = [...new Set(roomIds.filter(Boolean))];
    if (uniqueIds.length === 0) return;

    log.debug("rooms:presence:subscribe", { userId: user.id, roomIds: uniqueIds });

    for (const roomId of uniqueIds) {
      await socket.join(presenceWatchRoom(roomId));
    }

    const counts: Record<string, number> = {};
    await Promise.all(
      uniqueIds.map(async (roomId) => {
        counts[roomId] = await getActiveParticipantCount(roomId);
      })
    );
    socket.emit("rooms:presence-snapshot", { counts });
  });

  socket.on("rooms:presence:unsubscribe", async ({ roomIds }) => {
    for (const roomId of roomIds) {
      await socket.leave(presenceWatchRoom(roomId));
    }
  });

  socket.on("room:member:kick", async ({ roomId, userId }) => {
    try {
      log.info("room:member:kick", { actorId: user.id, roomId, targetUserId: userId });
      const owner = await isRoomOwner(roomId, user.id);
      if (!owner) {
        log.warn("room:member:kick denied — not owner", { userId: user.id, roomId });
        socket.emit("error", { message: "Only the room owner can remove members" });
        return;
      }
      if (userId === user.id) {
        socket.emit("error", { message: "You cannot remove yourself" });
        return;
      }

      const roomOwnerId = await getRoomOwnerId(roomId);
      if (roomOwnerId && userId === roomOwnerId) {
        socket.emit("error", { message: "Cannot remove the room owner" });
        return;
      }

      await removeParticipantFromRoom(roomId, userId);

      const sockets = await io.in(roomId).fetchSockets();
      for (const s of sockets) {
        if (s.data.user.id === userId) {
          s.emit("room:membership-revoked", { roomId, reason: "kicked" });
          await s.leave(roomId);
        }
      }

      io.to(userChannel(userId)).emit("room:membership-revoked", {
        roomId,
        reason: "kicked",
      });

      await broadcastPresence(roomId);
      await syncRoomMusic(roomId);
    } catch (err) {
      log.error("room:member:kick failed", err, { userId: user.id, roomId, targetUserId: userId });
      socket.emit("error", { message: "Failed to remove member" });
    }
  });

  socket.on("room:join", async ({ roomId, token: _token }) => {
    try {
      const member = await isRoomMember(roomId, user.id);
      if (!member) {
        log.warn("room:join denied — not a member", { userId: user.id, roomId });
        socket.emit("error", { message: "Not a member of this room" });
        return;
      }

      const hadPresence = await redis.hget(roomParticipantsKey(roomId), user.id);

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
        presenceMode: "active",
        awaySinceAt: null,
      };

      await saveParticipant(roomId, participant);

      if (!hadPresence && pgPool) {
        const approvedInvite = await pgPool.query(
          `SELECT 1 FROM room_access_requests
           WHERE room_id = $1 AND user_id = $2 AND status = 'approved'
           LIMIT 1`,
          [roomId, user.id]
        );
        if (approvedInvite.rows.length > 0) {
          await notifyRoomOwnerInviteEvent(roomId, "member_joined", {
            userId: user.id,
            displayName: profile.displayName,
            username: profile.username,
          });
        }
      }

      const history = await loadChatHistory(roomId);
      socket.emit("chat:history", { messages: history });

      const music = await getCachedMusic(roomId);
      if (music) {
        socket.emit("room:music", { roomId, state: music });
      }

      log.info("room:join", {
        userId: user.id,
        roomId,
        socketId: socket.id,
        returning: Boolean(hadPresence),
        historyMessages: history.length,
      });
      await broadcastPresence(roomId);
      await syncRoomMusic(roomId);
    } catch (err) {
      log.error("room:join failed", err, { userId: user.id, roomId });
      socket.emit("error", { message: "Failed to join room" });
    }
  });

  socket.on("room:leave", async ({ roomId }) => {
    log.info("room:leave", { userId: user.id, roomId, socketId: socket.id });
    await socket.leave(roomId);
    await markParticipantLeft(roomId, user.id);
    await broadcastPresence(roomId);
    await syncRoomMusic(roomId);
  });

  socket.on("room:ping", async ({ roomId }) => {
    if (!socket.rooms.has(roomId)) return;

    const result = await touchParticipant(roomId, user.id, socket.id);
    if (!result) return;

    if (result.wasInactive && result.participant.isActive) {
      await broadcastPresence(roomId);
      await syncRoomMusic(roomId);
    }
  });

  socket.on("room:presence:set", async ({ roomId, mode }) => {
    try {
      if (!socket.rooms.has(roomId)) return;
      if (mode !== "active" && mode !== "away" && mode !== "invisible") return;

      log.debug("room:presence:set", { userId: user.id, roomId, mode });
      await setParticipantPresence(roomId, user.id, mode);
      await broadcastPresence(roomId);
      await syncRoomMusic(roomId);
    } catch (err) {
      log.error("room:presence:set failed", err, { userId: user.id, roomId, mode });
      socket.emit("error", { message: "Failed to update presence" });
    }
  });

  socket.on("chat:send", async ({ roomId, content }) => {
    if (!content.trim()) return;
    const member = await isRoomMember(roomId, user.id);
    if (!member || !socket.rooms.has(roomId)) {
      socket.emit("error", { message: "Not authorized to send messages" });
      return;
    }
    log.debug("chat:send", { userId: user.id, roomId, length: content.trim().length });
    const message = await persistMessage(roomId, user.id, content.trim());
    if (message) {
      io.to(roomId).emit("chat:message", message);
      await notifyChatMentions(roomId, message, user.id);
    }
  });

  // Relay already-persisted messages from the web app (Supabase server actions)
  socket.on("chat:broadcast", async ({ roomId, message }) => {
    const member = await isRoomMember(roomId, user.id);
    if (!member || message.userId !== user.id) {
      socket.emit("error", { message: "Not authorized to broadcast message" });
      return;
    }
    const verified = await loadMessageById(message.id, roomId);
    if (!verified || verified.userId !== user.id) {
      socket.emit("error", { message: "Message not found" });
      return;
    }
    socket.to(roomId).emit("chat:message", verified);
    await notifyChatMentions(roomId, verified, user.id);
  });

  socket.on("chat:broadcast-delete", async ({ roomId, messageId }) => {
    const member = await isRoomMember(roomId, user.id);
    if (!member) {
      socket.emit("error", { message: "Not authorized" });
      return;
    }
    const allowed = await canDeleteChatMessage(roomId, user.id, messageId);
    if (!allowed) {
      socket.emit("error", { message: "Not authorized to delete this message" });
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

  socket.on("room:visibility:set", async ({ roomId, isPublic, inviteToken }) => {
    const owner = await isRoomOwner(roomId, user.id);
    if (!owner) {
      socket.emit("error", { message: "Only the room owner can change visibility" });
      return;
    }
    io.to(roomId).emit("room:visibility", { roomId, isPublic, inviteToken });
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

    await setCachedRoomMusic(redis, roomId, nextState);
    io.to(roomId).emit("room:music", { roomId, state: nextState });
  });

  socket.on("session:start", async ({ roomId, goalText, subjects }) => {
    const sessionId = await startStudySession(user.id, roomId, goalText, subjects);
    if (sessionId) {
      socket.emit("session:started", { sessionId });
    }
  });

  socket.on("session:end", async ({ sessionId, focusMinutes, breakMinutes }) => {
    await endStudySession(
      sessionId,
      user.id,
      focusMinutes,
      breakMinutes
    );
    socket.emit("session:ended", { sessionId });
  });

  socket.on("disconnect", async (reason) => {
    const rooms = Array.from(socket.rooms).filter((r) => r !== socket.id);
    log.info("client disconnected", {
      userId: user.id,
      socketId: socket.id,
      reason,
      roomCount: rooms.length,
      rooms,
    });
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

log.info("starting socket server", {
  port: PORT,
  nodeEnv: process.env.NODE_ENV ?? "development",
  logLevel: activeLogLevel,
  redis: redactRedisUrl(REDIS_URL),
  database: pgPool ? "configured" : "disabled",
  supabaseUrl: SUPABASE_URL ? "configured" : "missing",
  jwtSecret: JWT_SECRET ? "configured" : "missing",
  corsOrigins,
});

httpServer.listen(PORT, () => {
  log.info("socket server listening", { port: PORT });
});
