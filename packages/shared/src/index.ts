export type PlanTier = "free" | "premium" | "institution";

export type RoomRole = "owner" | "moderator" | "member";

export type PomodoroPhase = "idle" | "focus" | "break";

export interface PomodoroState {
  phase: PomodoroPhase;
  remainingSeconds: number;
  focusMinutes: number;
  breakMinutes: number;
  startedBy: string | null;
  isPaused: boolean;
  updatedAt: string;
}

export interface RoomParticipant {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  socketId: string;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  content: string;
  createdAt: string;
}

export interface StudyRoomSettings {
  videoEnabled: boolean;
  pomodoroDefaults: {
    focusMinutes: number;
    breakMinutes: number;
  };
  anyoneCanControlTimer: boolean;
}

export interface RoomWallpaper {
  id: string;
  name: string;
  imageUrl: string;
  thumbnailUrl: string | null;
  uploadedBy: string | null;
  isPublic: boolean;
  isBuiltin: boolean;
  category: string;
  createdAt: string;
}

export const WALLPAPER_CATEGORIES = [
  "all",
  "nature",
  "study",
  "space",
  "urban",
  "ambient",
  "minimal",
  "general",
] as const;

export type WallpaperCategory = (typeof WALLPAPER_CATEGORIES)[number];

export const MAX_WALLPAPER_SIZE_BYTES = 15 * 1024 * 1024;
export const ALLOWED_WALLPAPER_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export interface RoomTrack {
  id: string;
  name: string;
  artist: string | null;
  audioUrl: string;
  coverUrl: string | null;
  durationSeconds: number | null;
  uploadedBy: string | null;
  isPublic: boolean;
  isBuiltin: boolean;
  category: string;
  provider: MusicProvider;
  externalId: string | null;
  sourceUrl: string | null;
  createdAt: string;
}

export type MusicProvider = "builtin" | "youtube" | "soundcloud" | "spotify" | "direct";

export const MUSIC_PROVIDERS = ["youtube", "soundcloud", "spotify"] as const;

export type TrackRequestStatus = "pending" | "approved" | "rejected";

export interface RoomTrackRequest {
  id: string;
  roomId: string;
  trackId: string;
  requestedBy: string;
  status: TrackRequestStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  track?: RoomTrack;
  requesterName?: string;
}

export interface RoomMusicState {
  trackId: string | null;
  audioUrl: string | null;
  embedUrl: string | null;
  sourceUrl: string | null;
  provider: MusicProvider | null;
  trackName: string | null;
  artist: string | null;
  isPlaying: boolean;
}

export function roomTrackToMusicState(
  track: RoomTrack | null,
  isPlaying = false
): RoomMusicState {
  if (!track) {
    return {
      trackId: null,
      audioUrl: null,
      embedUrl: null,
      sourceUrl: null,
      provider: null,
      trackName: null,
      artist: null,
      isPlaying: false,
    };
  }

  const isEmbed =
    track.provider === "youtube" ||
    track.provider === "soundcloud" ||
    track.provider === "spotify";

  return {
    trackId: track.id,
    audioUrl: isEmbed ? null : track.audioUrl,
    embedUrl: isEmbed ? track.audioUrl : null,
    sourceUrl: track.sourceUrl,
    provider: track.provider,
    trackName: track.name,
    artist: track.artist,
    isPlaying,
  };
}

export const TRACK_CATEGORIES = [
  "all",
  "ambient",
  "focus",
  "lofi",
  "study",
  "nature",
  "classical",
  "general",
] as const;

export type TrackCategory = (typeof TRACK_CATEGORIES)[number];

export const PROVIDER_LINK_EXAMPLES = [
  "https://soundcloud.com/artist/track",
  "https://www.youtube.com/watch?v=...",
  "https://music.youtube.com/watch?v=...",
  "https://open.spotify.com/track/...",
  "https://open.spotify.com/playlist/...",
] as const;

export const DEFAULT_ROOM_SETTINGS: StudyRoomSettings = {
  videoEnabled: false,
  pomodoroDefaults: {
    focusMinutes: 25,
    breakMinutes: 5,
  },
  anyoneCanControlTimer: true,
};

export interface RoomPresenceState {
  roomId: string;
  participants: RoomParticipant[];
}

// Socket.IO event payloads
export interface ClientToServerEvents {
  "room:join": (payload: { roomId: string; token: string }) => void;
  "room:leave": (payload: { roomId: string }) => void;
  "chat:send": (payload: { roomId: string; content: string }) => void;
  "chat:broadcast": (payload: { roomId: string; message: ChatMessage }) => void;
  "chat:broadcast-delete": (payload: { roomId: string; messageId: string }) => void;
  "chat:delete": (payload: { roomId: string; messageId: string }) => void;
  "pomodoro:start": (payload: {
    roomId: string;
    phase: "focus" | "break";
    focusMinutes?: number;
    breakMinutes?: number;
  }) => void;
  "pomodoro:pause": (payload: { roomId: string }) => void;
  "pomodoro:reset": (payload: { roomId: string }) => void;
  "room:wallpaper:set": (payload: { roomId: string; wallpaperId: string | null; imageUrl: string | null }) => void;
  "room:music:sync": (payload: { roomId: string; state: RoomMusicState }) => void;
  "session:start": (payload: {
    roomId?: string;
    goalText?: string;
    subjects?: string[];
  }) => void;
  "session:end": (payload: { sessionId: string }) => void;
}

export interface ServerToClientEvents {
  "room:presence": (payload: RoomPresenceState) => void;
  "chat:message": (payload: ChatMessage) => void;
  "chat:history": (payload: { messages: ChatMessage[] }) => void;
  "chat:deleted": (payload: { messageId: string }) => void;
  "pomodoro:sync": (payload: { roomId: string; state: PomodoroState }) => void;
  "room:wallpaper": (payload: { roomId: string; wallpaperId: string | null; imageUrl: string | null }) => void;
  "room:music": (payload: { roomId: string; state: RoomMusicState }) => void;
  "session:started": (payload: { sessionId: string }) => void;
  "session:ended": (payload: { sessionId: string }) => void;
  error: (payload: { message: string }) => void;
}

export const SUBJECT_TAGS = [
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "Computer Science",
  "Engineering",
  "Medicine",
  "Law",
  "Business",
  "Languages",
  "History",
  "Literature",
  "Art",
  "Music",
  "Other",
] as const;

export type SubjectTag = (typeof SUBJECT_TAGS)[number];

export const PLAN_LIMITS = {
  free: {
    maxPrivateRooms: 1,
    aiFeatures: false,
    advancedAnalytics: false,
  },
  premium: {
    maxPrivateRooms: Infinity,
    aiFeatures: true,
    advancedAnalytics: true,
  },
  institution: {
    maxPrivateRooms: Infinity,
    aiFeatures: true,
    advancedAnalytics: true,
  },
} as const;

export const POST_IT_COLORS = ["yellow", "mint", "pink", "sky", "lavender"] as const;
export type PostItColor = (typeof POST_IT_COLORS)[number];

export interface PostItItem {
  id: string;
  text: string;
  done: boolean;
}

export interface UserPostItTask {
  id: string;
  userId: string;
  roomId: string | null;
  title: string;
  titleDone: boolean;
  items: PostItItem[];
  posX: number;
  posY: number;
  width: number;
  height: number;
  color: PostItColor;
  zIndex: number;
  pinned: boolean;
  closed: boolean;
  createdAt: string;
  updatedAt: string;
}

export const FEATURE_FLAGS = {
  livekit: false,
  aiStudyPlanner: false,
  aiFlashcards: false,
  leaderboards: false,
  socialFeatures: false,
} as const;
