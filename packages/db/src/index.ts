import { z } from "zod";
import { DEFAULT_ROOM_SETTINGS, SUBJECT_TAGS } from "@studyverce/shared";

export const profileSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-z0-9_]+$/, "Username must be lowercase alphanumeric with underscores"),
  display_name: z.string().min(1).max(50),
  avatar_url: z.string().url().nullable().optional(),
  subject_tags: z.array(z.enum(SUBJECT_TAGS as unknown as [string, ...string[]])).max(5).default([]),
});

export const updateProfileSchema = profileSchema.partial();

export const createRoomSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(500).optional(),
  is_public: z.boolean().default(true),
  max_participants: z.number().int().min(2).max(100).default(50),
  settings: z
    .object({
      videoEnabled: z.boolean().optional(),
      pomodoroDefaults: z
        .object({
          focusMinutes: z.number().int().min(1).max(120),
          breakMinutes: z.number().int().min(1).max(60),
        })
        .optional(),
      breaksEnabled: z.boolean().optional(),
      anyoneCanControlTimer: z.boolean().optional(),
      wallpaperOverlayOpacity: z.number().int().min(0).max(100).optional(),
    })
    .optional(),
});

export const updateRoomSchema = createRoomSchema.partial();

export const studyGoalSchema = z.object({
  goal_text: z.string().max(200).optional(),
  subjects: z.array(z.string()).max(5).optional(),
});

export type ProfileInput = z.infer<typeof profileSchema>;
export type CreateRoomInput = z.infer<typeof createRoomSchema>;
export type UpdateRoomInput = z.infer<typeof updateRoomSchema>;

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function mergeRoomSettings(
  settings?: Partial<typeof DEFAULT_ROOM_SETTINGS>
): typeof DEFAULT_ROOM_SETTINGS {
  return {
    ...DEFAULT_ROOM_SETTINGS,
    ...settings,
    pomodoroDefaults: {
      ...DEFAULT_ROOM_SETTINGS.pomodoroDefaults,
      ...settings?.pomodoroDefaults,
    },
    breaksEnabled:
      settings?.breaksEnabled ?? DEFAULT_ROOM_SETTINGS.breaksEnabled,
    wallpaperOverlayOpacity:
      settings?.wallpaperOverlayOpacity ??
      DEFAULT_ROOM_SETTINGS.wallpaperOverlayOpacity,
  };
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          display_name: string;
          avatar_url: string | null;
          study_streak: number;
          total_focus_minutes: number;
          subject_tags: string[];
          plan_tier: "free" | "premium" | "institution";
          onboarding_completed: boolean;
          is_admin: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          display_name: string;
          avatar_url?: string | null;
          study_streak?: number;
          total_focus_minutes?: number;
          subject_tags?: string[];
          plan_tier?: "free" | "premium" | "institution";
          onboarding_completed?: boolean;
          is_admin?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      study_rooms: {
        Row: {
          id: string;
          slug: string;
          name: string;
          description: string | null;
          is_public: boolean;
          owner_id: string;
          max_participants: number;
          settings: Record<string, unknown>;
          invite_token: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          description?: string | null;
          is_public?: boolean;
          owner_id: string;
          max_participants?: number;
          settings?: Record<string, unknown>;
          invite_token?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["study_rooms"]["Insert"]>;
      };
      room_members: {
        Row: {
          room_id: string;
          user_id: string;
          role: "owner" | "moderator" | "member";
          joined_at: string;
        };
        Insert: {
          room_id: string;
          user_id: string;
          role?: "owner" | "moderator" | "member";
          joined_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["room_members"]["Insert"]>;
      };
      study_sessions: {
        Row: {
          id: string;
          user_id: string;
          room_id: string | null;
          started_at: string;
          ended_at: string | null;
          focus_minutes: number;
          break_minutes: number;
          goal_text: string | null;
          subjects: string[];
        };
        Insert: {
          id?: string;
          user_id: string;
          room_id?: string | null;
          started_at?: string;
          ended_at?: string | null;
          focus_minutes?: number;
          break_minutes?: number;
          goal_text?: string | null;
          subjects?: string[];
        };
        Update: Partial<Database["public"]["Tables"]["study_sessions"]["Insert"]>;
      };
      room_messages: {
        Row: {
          id: string;
          room_id: string;
          user_id: string;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          user_id: string;
          content: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["room_messages"]["Insert"]>;
      };
      achievements: {
        Row: {
          id: string;
          slug: string;
          name: string;
          description: string;
          icon: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          description: string;
          icon: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["achievements"]["Insert"]>;
      };
      user_achievements: {
        Row: {
          user_id: string;
          achievement_id: string;
          earned_at: string;
        };
        Insert: {
          user_id: string;
          achievement_id: string;
          earned_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["user_achievements"]["Insert"]>;
      };
    };
  };
}

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type StudyRoom = Database["public"]["Tables"]["study_rooms"]["Row"];
export type RoomMember = Database["public"]["Tables"]["room_members"]["Row"];
export type StudySession = Database["public"]["Tables"]["study_sessions"]["Row"];
export type RoomMessage = Database["public"]["Tables"]["room_messages"]["Row"];
