export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
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
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          display_name?: string;
          avatar_url?: string | null;
          study_streak?: number;
          total_focus_minutes?: number;
          subject_tags?: string[];
          plan_tier?: "free" | "premium" | "institution";
          onboarding_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
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
          settings: Json;
          invite_token: string | null;
          wallpaper_id: string | null;
          track_id: string | null;
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
          settings?: Json;
          invite_token?: string | null;
          wallpaper_id?: string | null;
          track_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          description?: string | null;
          is_public?: boolean;
          owner_id?: string;
          max_participants?: number;
          settings?: Json;
          invite_token?: string | null;
          wallpaper_id?: string | null;
          track_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      room_wallpapers: {
        Row: {
          id: string;
          name: string;
          image_url: string;
          storage_path: string | null;
          thumbnail_url: string | null;
          uploaded_by: string | null;
          is_public: boolean;
          is_builtin: boolean;
          category: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          image_url: string;
          storage_path?: string | null;
          thumbnail_url?: string | null;
          uploaded_by?: string | null;
          is_public?: boolean;
          is_builtin?: boolean;
          category?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          image_url?: string;
          storage_path?: string | null;
          thumbnail_url?: string | null;
          uploaded_by?: string | null;
          is_public?: boolean;
          is_builtin?: boolean;
          category?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      room_tracks: {
        Row: {
          id: string;
          name: string;
          artist: string | null;
          audio_url: string;
          storage_path: string | null;
          cover_url: string | null;
          duration_seconds: number | null;
          uploaded_by: string | null;
          is_public: boolean;
          is_builtin: boolean;
          category: string;
          provider: string;
          external_id: string | null;
          source_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          artist?: string | null;
          audio_url: string;
          storage_path?: string | null;
          cover_url?: string | null;
          duration_seconds?: number | null;
          uploaded_by?: string | null;
          is_public?: boolean;
          is_builtin?: boolean;
          category?: string;
          provider?: string;
          external_id?: string | null;
          source_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          artist?: string | null;
          audio_url?: string;
          storage_path?: string | null;
          cover_url?: string | null;
          duration_seconds?: number | null;
          uploaded_by?: string | null;
          is_public?: boolean;
          is_builtin?: boolean;
          category?: string;
          provider?: string;
          external_id?: string | null;
          source_url?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      room_track_requests: {
        Row: {
          id: string;
          room_id: string;
          track_id: string;
          requested_by: string;
          status: "pending" | "approved" | "rejected";
          reviewed_by: string | null;
          reviewed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          track_id: string;
          requested_by: string;
          status?: "pending" | "approved" | "rejected";
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          room_id?: string;
          track_id?: string;
          requested_by?: string;
          status?: "pending" | "approved" | "rejected";
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
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
        Update: {
          room_id?: string;
          user_id?: string;
          role?: "owner" | "moderator" | "member";
          joined_at?: string;
        };
        Relationships: [];
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
        Update: {
          id?: string;
          user_id?: string;
          room_id?: string | null;
          started_at?: string;
          ended_at?: string | null;
          focus_minutes?: number;
          break_minutes?: number;
          goal_text?: string | null;
          subjects?: string[];
        };
        Relationships: [];
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
        Update: {
          id?: string;
          room_id?: string;
          user_id?: string;
          content?: string;
          created_at?: string;
        };
        Relationships: [];
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
          icon?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          description?: string;
          icon?: string;
          created_at?: string;
        };
        Relationships: [];
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
        Update: {
          user_id?: string;
          achievement_id?: string;
          earned_at?: string;
        };
        Relationships: [];
      };
      user_post_it_tasks: {
        Row: {
          id: string;
          user_id: string;
          room_id: string | null;
          title: string;
          title_done: boolean;
          items: unknown;
          pos_x: number;
          pos_y: number;
          width: number;
          height: number;
          color: string;
          z_index: number;
          pinned: boolean;
          closed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          room_id?: string | null;
          title: string;
          title_done?: boolean;
          items?: unknown;
          pos_x?: number;
          pos_y?: number;
          width?: number;
          height?: number;
          color?: string;
          z_index?: number;
          pinned?: boolean;
          closed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          room_id?: string | null;
          title?: string;
          title_done?: boolean;
          items?: unknown;
          pos_x?: number;
          pos_y?: number;
          width?: number;
          height?: number;
          color?: string;
          z_index?: number;
          pinned?: boolean;
          closed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      update_profile_stats: {
        Args: { p_user_id: string; p_focus_minutes: number };
        Returns: undefined;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type StudyRoom = Database["public"]["Tables"]["study_rooms"]["Row"];
export type StudySession = Database["public"]["Tables"]["study_sessions"]["Row"];
