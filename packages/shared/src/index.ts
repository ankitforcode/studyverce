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

export type RoomPresenceMode = "active" | "away" | "invisible";

export interface RoomParticipant {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  socketId: string;
  /**
   * User-chosen presence. `invisible` users are hidden from other participants.
   * Heartbeat (`room:ping`) only sets active when mode is `active`.
   */
  presenceMode?: RoomPresenceMode;
  /**
   * True while the user appears active in the room.
   * False when away, invisible, or after leaving the room page.
   */
  isActive: boolean;
  /** ISO timestamp of the last in-room heartbeat. */
  lastSeenAt: string;
  /** ISO timestamp when isActive became false; used for auto-removal. */
  awaySinceAt?: string | null;
}

export function normalizePresenceMode(
  mode?: RoomPresenceMode | null
): RoomPresenceMode {
  return mode ?? "active";
}

/** Whether a participant row should render for this viewer. */
export function isParticipantVisibleToViewer(
  participant: RoomParticipant,
  viewerUserId: string
): boolean {
  if (participant.userId === viewerUserId) return true;
  return normalizePresenceMode(participant.presenceMode) !== "invisible";
}

/** Participants list as seen by a viewer (excludes others who are invisible). */
export function filterParticipantsForViewer(
  participants: RoomParticipant[],
  viewerUserId: string
): RoomParticipant[] {
  return participants.filter((p) => isParticipantVisibleToViewer(p, viewerUserId));
}

/** Presence mode as shown to a specific viewer. */
export function viewPresenceMode(
  participant: RoomParticipant,
  viewerUserId: string
): RoomPresenceMode {
  return normalizePresenceMode(participant.presenceMode);
}

export function isParticipantActiveForViewer(
  participant: RoomParticipant,
  viewerUserId: string
): boolean {
  return viewPresenceMode(participant, viewerUserId) === "active";
}

/** Client sends room:ping on this interval while the room page is open. */
export const ROOM_PRESENCE_PING_INTERVAL_MS = 30_000;

/** Not in the room (no heartbeat) for this long → marked away. */
export const ROOM_PRESENCE_AWAY_THRESHOLD_MS = 5 * 60 * 1000;

/** Away for this long → removed from room membership (room owner exempt). */
export const ROOM_PRESENCE_REMOVE_AFTER_AWAY_MS = 30 * 60 * 1000;

/** Server sweep interval to detect away / inactive members. */
export const ROOM_PRESENCE_SWEEP_INTERVAL_MS = 60_000;

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
  /** When false, focus sessions end without starting a break phase. */
  breaksEnabled: boolean;
  anyoneCanControlTimer: boolean;
  /** 0 = wallpaper fully visible, 100 = strongest dim overlay */
  wallpaperOverlayOpacity: number;
}

export const WALLPAPER_OVERLAY_MIN = 0;
export const WALLPAPER_OVERLAY_MAX = 100;
export const DEFAULT_WALLPAPER_OVERLAY = 75;

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

export type MusicProvider =
  | "builtin"
  | "youtube"
  | "soundcloud"
  | "spotify"
  | "apple_music"
  | "direct";

/** OAuth-connected streaming services (browse playlists in-app). */
export type StreamingMusicProvider = "spotify" | "youtube_music" | "apple_music";

export const STREAMING_MUSIC_PROVIDERS: StreamingMusicProvider[] = [
  "spotify",
  "youtube_music",
  "apple_music",
];

export const MUSIC_PROVIDERS = ["youtube", "soundcloud", "spotify", "apple_music"] as const;

export interface StreamingMusicConnection {
  provider: StreamingMusicProvider;
  connected: boolean;
  displayName: string | null;
  expiresAt: string | null;
}

export interface StreamingPlaylist {
  id: string;
  name: string;
  description: string | null;
  trackCount: number | null;
  imageUrl: string | null;
  provider: StreamingMusicProvider;
}

export interface StreamingPlaylistItem {
  id: string;
  name: string;
  artist: string | null;
  durationSeconds: number | null;
  sourceUrl: string;
  imageUrl: string | null;
  /** track | playlist | album */
  itemType: "track" | "playlist" | "album";
}

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
  requesterUsername?: string;
}

export type RoomAccessRequestStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "revoked";

export interface RoomSharePreview {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  maxParticipants: number;
  memberCount: number;
  ownerDisplayName: string;
  ownerId: string;
}

export interface RoomAccessRequest {
  id: string;
  roomId: string;
  userId: string;
  status: RoomAccessRequestStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  requesterName?: string;
  requesterUsername?: string;
}

export interface RoomVoiceNote {
  id: string;
  roomId: string;
  userId: string;
  audioUrl: string;
  durationSeconds: number | null;
  transcript: string | null;
  isShared: boolean;
  sharedAt: string | null;
  createdAt: string;
  authorDisplayName?: string;
  authorUsername?: string;
}

/** Incoming friend request from someone currently in the study room. */
export interface RoomFriendRequest {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  roomId: string;
  createdAt: string;
}

/** Private-room owner alert when someone uses a share invite. */
export interface RoomInviteOwnerNotification {
  roomId: string;
  roomSlug: string;
  roomName: string;
  memberUserId: string;
  memberDisplayName: string;
  memberUsername: string;
  kind: "access_requested" | "member_joined";
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
  /** Bumped by the room owner to restart playback for everyone. */
  playbackSeq: number;
}

export function normalizeRoomMusicState(state: RoomMusicState): RoomMusicState {
  return {
    ...state,
    playbackSeq: state.playbackSeq ?? 0,
  };
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
      playbackSeq: 0,
    };
  }

  const isEmbed =
    track.provider === "youtube" ||
    track.provider === "soundcloud" ||
    track.provider === "spotify" ||
    track.provider === "apple_music";

  return {
    trackId: track.id,
    audioUrl: isEmbed ? null : track.audioUrl,
    embedUrl: isEmbed ? track.audioUrl : null,
    sourceUrl: track.sourceUrl,
    provider: track.provider,
    trackName: track.name,
    artist: track.artist,
    isPlaying,
    playbackSeq: 0,
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
  "https://music.apple.com/us/playlist/...",
] as const;

export const DEFAULT_ROOM_SETTINGS: StudyRoomSettings = {
  videoEnabled: false,
  pomodoroDefaults: {
    focusMinutes: 25,
    breakMinutes: 5,
  },
  breaksEnabled: true,
  anyoneCanControlTimer: true,
  wallpaperOverlayOpacity: DEFAULT_WALLPAPER_OVERLAY,
};

export interface RoomPresenceState {
  roomId: string;
  participants: RoomParticipant[];
}

export interface RoomPresenceCount {
  roomId: string;
  activeCount: number;
}

// Socket.IO event payloads
export interface ClientToServerEvents {
  "room:join": (payload: { roomId: string; token: string }) => void;
  "room:leave": (payload: { roomId: string }) => void;
  "room:ping": (payload: { roomId: string }) => void;
  "room:presence:set": (payload: { roomId: string; mode: RoomPresenceMode }) => void;
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
  "room:wallpaperOverlay:set": (payload: { roomId: string; overlayOpacity: number }) => void;
  "room:music:sync": (payload: { roomId: string; state: RoomMusicState }) => void;
  "session:start": (payload: {
    roomId?: string;
    goalText?: string;
    subjects?: string[];
  }) => void;
  "session:end": (payload: { sessionId: string }) => void;
  "access:request-created": (payload: {
    roomId: string;
    request: RoomAccessRequest;
  }) => void;
  "access:reviewed": (payload: {
    roomId: string;
    requestId: string;
    userId: string;
    status: RoomAccessRequestStatus;
  }) => void;
  "music:request-created": (payload: {
    roomId: string;
    request: RoomTrackRequest;
  }) => void;
  "music:reviewed": (payload: {
    roomId: string;
    requestId: string;
    userId: string;
    status: TrackRequestStatus;
  }) => void;
  "friend:request-created": (payload: {
    roomId: string;
    toUserId: string;
    request: RoomFriendRequest;
  }) => void;
  "friend:reviewed": (payload: {
    roomId: string;
    requesterId: string;
    status: "accepted" | "declined";
  }) => void;
  "room:visibility:set": (payload: {
    roomId: string;
    isPublic: boolean;
    inviteToken: string | null;
  }) => void;
  "rooms:presence:subscribe": (payload: { roomIds: string[] }) => void;
  "rooms:presence:unsubscribe": (payload: { roomIds: string[] }) => void;
  "room:member:kick": (payload: { roomId: string; userId: string }) => void;
}

export interface ServerToClientEvents {
  "room:presence": (payload: RoomPresenceState) => void;
  "rooms:presence-count": (payload: RoomPresenceCount) => void;
  "rooms:presence-snapshot": (payload: { counts: Record<string, number> }) => void;
  "chat:message": (payload: ChatMessage) => void;
  "chat:history": (payload: { messages: ChatMessage[] }) => void;
  "chat:deleted": (payload: { messageId: string }) => void;
  "pomodoro:sync": (payload: { roomId: string; state: PomodoroState }) => void;
  "room:wallpaper": (payload: { roomId: string; wallpaperId: string | null; imageUrl: string | null }) => void;
  "room:wallpaperOverlay": (payload: { roomId: string; overlayOpacity: number }) => void;
  "room:music": (payload: { roomId: string; state: RoomMusicState }) => void;
  "room:visibility": (payload: {
    roomId: string;
    isPublic: boolean;
    inviteToken: string | null;
  }) => void;
  "room:membership-revoked": (payload: {
    roomId: string;
    reason: "inactive" | "kicked";
  }) => void;
  "room:access-request:new": (payload: { request: RoomAccessRequest }) => void;
  "room:access-request:removed": (payload: { requestId: string }) => void;
  "room:access-request:reviewed": (payload: {
    roomId: string;
    requestId: string;
    status: RoomAccessRequestStatus;
  }) => void;
  "room:music-request:new": (payload: { request: RoomTrackRequest }) => void;
  "room:music-request:removed": (payload: { requestId: string }) => void;
  "room:music-request:reviewed": (payload: {
    roomId: string;
    requestId: string;
    status: TrackRequestStatus;
  }) => void;
  "room:friend-request:new": (payload: { request: RoomFriendRequest }) => void;
  "room:friend-request:removed": (payload: { requesterId: string }) => void;
  "room:invite-owner-notification": (payload: RoomInviteOwnerNotification) => void;
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
    maxRoomParticipants: 20,
    teamFeatures: false,
    aiDailyPromptsPerRoom: 10,
    aiConversationMemory: false,
    advancedAnalytics: false,
    maxUserMusicLinks: 10,
    streamingIntegration: false,
    roomVideo: false,
    voiceNotes: false,
  },
  premium: {
    maxPrivateRooms: Infinity,
    maxRoomParticipants: null,
    teamFeatures: true,
    aiDailyPromptsPerRoom: null,
    aiConversationMemory: true,
    advancedAnalytics: true,
    maxUserMusicLinks: null,
    streamingIntegration: true,
    roomVideo: true,
    voiceNotes: true,
  },
  institution: {
    maxPrivateRooms: Infinity,
    maxRoomParticipants: null,
    teamFeatures: true,
    aiDailyPromptsPerRoom: null,
    aiConversationMemory: true,
    advancedAnalytics: true,
    maxUserMusicLinks: null,
    streamingIntegration: true,
    roomVideo: true,
    voiceNotes: true,
  },
} as const;

export const FREE_MAX_ROOM_PARTICIPANTS = PLAN_LIMITS.free.maxRoomParticipants;

export const STUDY_ASSISTANT_FREE_DAILY_PROMPTS =
  PLAN_LIMITS.free.aiDailyPromptsPerRoom;

export const MUSIC_FREE_LINK_LIMIT = PLAN_LIMITS.free.maxUserMusicLinks;

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

export const ROOM_SIDEBAR_PANEL_IDS = ["tasks", "assistant", "chat"] as const;

export type RoomSidebarPanelId = (typeof ROOM_SIDEBAR_PANEL_IDS)[number];

export const DEFAULT_ROOM_SIDEBAR_PANEL_ORDER: RoomSidebarPanelId[] = [
  "tasks",
  "assistant",
  "chat",
];

export const FEATURE_FLAGS = {
  livekit: false,
  aiStudyPlanner: false,
  aiFlashcards: false,
  leaderboards: false,
  socialFeatures: false,
} as const;
