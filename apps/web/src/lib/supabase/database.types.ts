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
          is_admin: boolean;
          referral_code: string;
          referred_by_user_id: string | null;
          premium_until: string | null;
          premium_source:
            | "free"
            | "referral_trial"
            | "referral_reward"
            | "referral_lifetime"
            | "stripe"
            | "admin";
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
          referral_code?: string;
          referred_by_user_id?: string | null;
          premium_until?: string | null;
          premium_source?:
            | "free"
            | "referral_trial"
            | "referral_reward"
            | "referral_lifetime"
            | "stripe"
            | "admin";
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
          is_admin?: boolean;
          referral_code?: string;
          referred_by_user_id?: string | null;
          premium_until?: string | null;
          premium_source?:
            | "free"
            | "referral_trial"
            | "referral_reward"
            | "referral_lifetime"
            | "stripe"
            | "admin";
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
      user_music_connections: {
        Row: {
          user_id: string;
          provider: "spotify" | "youtube_music" | "apple_music";
          access_token: string;
          refresh_token: string | null;
          expires_at: string | null;
          token_type: string;
          scope: string | null;
          provider_account_id: string | null;
          display_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          provider: "spotify" | "youtube_music" | "apple_music";
          access_token: string;
          refresh_token?: string | null;
          expires_at?: string | null;
          token_type?: string;
          scope?: string | null;
          provider_account_id?: string | null;
          display_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          provider?: "spotify" | "youtube_music" | "apple_music";
          access_token?: string;
          refresh_token?: string | null;
          expires_at?: string | null;
          token_type?: string;
          scope?: string | null;
          provider_account_id?: string | null;
          display_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      room_access_requests: {
        Row: {
          id: string;
          room_id: string;
          user_id: string;
          status: "pending" | "approved" | "rejected" | "revoked";
          reviewed_by: string | null;
          reviewed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          user_id: string;
          status?: "pending" | "approved" | "rejected" | "revoked";
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          room_id?: string;
          user_id?: string;
          status?: "pending" | "approved" | "rejected" | "revoked";
          reviewed_by?: string | null;
          reviewed_at?: string | null;
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
      room_voice_notes: {
        Row: {
          id: string;
          room_id: string;
          user_id: string;
          storage_path: string;
          duration_seconds: number | null;
          transcript: string | null;
          is_shared: boolean;
          shared_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          user_id: string;
          storage_path: string;
          duration_seconds?: number | null;
          transcript?: string | null;
          is_shared?: boolean;
          shared_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          room_id?: string;
          user_id?: string;
          storage_path?: string;
          duration_seconds?: number | null;
          transcript?: string | null;
          is_shared?: boolean;
          shared_at?: string | null;
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
      referrals: {
        Row: {
          id: string;
          referrer_id: string;
          referee_id: string;
          status: "pending" | "qualified" | "rejected";
          qualified_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          referrer_id: string;
          referee_id: string;
          status?: "pending" | "qualified" | "rejected";
          qualified_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          referrer_id?: string;
          referee_id?: string;
          status?: "pending" | "qualified" | "rejected";
          qualified_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      referral_rewards: {
        Row: {
          id: string;
          user_id: string;
          reward_type: "referee_trial" | "premium_1mo" | "ambassador_badge" | "lifetime_premium";
          referral_count_at_grant: number;
          granted_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          reward_type: "referee_trial" | "premium_1mo" | "ambassador_badge" | "lifetime_premium";
          referral_count_at_grant?: number;
          granted_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          reward_type?: "referee_trial" | "premium_1mo" | "ambassador_badge" | "lifetime_premium";
          referral_count_at_grant?: number;
          granted_at?: string;
        };
        Relationships: [];
      };
      user_room_sidebar_layout: {
        Row: {
          user_id: string;
          room_id: string;
          panel_order: string[];
          updated_at: string;
        };
        Insert: {
          user_id: string;
          room_id: string;
          panel_order?: string[];
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          room_id?: string;
          panel_order?: string[];
          updated_at?: string;
        };
        Relationships: [];
      };
      friendships: {
        Row: {
          user_id: string;
          friend_id: string;
          status: "pending" | "accepted" | "blocked";
          created_at: string;
        };
        Insert: {
          user_id: string;
          friend_id: string;
          status?: "pending" | "accepted" | "blocked";
          created_at?: string;
        };
        Update: {
          user_id?: string;
          friend_id?: string;
          status?: "pending" | "accepted" | "blocked";
          created_at?: string;
        };
        Relationships: [];
      };
      user_favorite_rooms: {
        Row: {
          user_id: string;
          room_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          room_id: string;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          room_id?: string;
          created_at?: string;
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
      get_room_share_preview: {
        Args: { p_slug: string; p_token?: string | null };
        Returns: Json;
      };
      get_room_access_state_for_user: {
        Args: { p_slug: string };
        Returns: Json;
      };
      get_user_pending_access_rooms: {
        Args: Record<string, never>;
        Returns: Json;
      };
      get_user_private_rooms: {
        Args: Record<string, never>;
        Returns: Json;
      };
      get_user_friend_rooms: {
        Args: Record<string, never>;
        Returns: Json;
      };
      approve_room_access_request: {
        Args: { p_request_id: string };
        Returns: Json;
      };
      leaderboard_weekly_focus: {
        Args: { p_limit?: number };
        Returns: { user_id: string; weekly_minutes: number }[];
      };
      update_profile_stats: {
        Args: { p_user_id: string; p_focus_minutes: number };
        Returns: undefined;
      };
      attach_referral: {
        Args: { p_referee_id: string; p_referral_code: string };
        Returns: boolean;
      };
      qualify_referral_and_grant_rewards: {
        Args: { p_referee_id: string };
        Returns: Json;
      };
      sync_referral_code_for_username: {
        Args: { p_user_id: string; p_username: string };
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
