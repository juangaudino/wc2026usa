export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      api_providers: {
        Row: {
          api_key_set: boolean
          base_url: string | null
          config: Json
          created_at: string
          id: string
          is_active: boolean
          name: string
          slug: string
          sport_type: string
          updated_at: string
        }
        Insert: {
          api_key_set?: boolean
          base_url?: string | null
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          slug: string
          sport_type?: string
          updated_at?: string
        }
        Update: {
          api_key_set?: boolean
          base_url?: string | null
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          sport_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      base_tournaments: {
        Row: {
          created_at: string
          created_by: string | null
          default_bonus: Json
          default_exact_points: number
          default_incorrect_points: number
          default_tendency_points: number
          description: string | null
          external_provider: string | null
          external_ref: string | null
          id: string
          name: string
          season: string | null
          slug: string
          sport_type: string
          starts_at: string | null
          status: string
          theme_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          default_bonus?: Json
          default_exact_points?: number
          default_incorrect_points?: number
          default_tendency_points?: number
          description?: string | null
          external_provider?: string | null
          external_ref?: string | null
          id?: string
          name: string
          season?: string | null
          slug: string
          sport_type?: string
          starts_at?: string | null
          status?: string
          theme_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          default_bonus?: Json
          default_exact_points?: number
          default_incorrect_points?: number
          default_tendency_points?: number
          description?: string | null
          external_provider?: string | null
          external_ref?: string | null
          id?: string
          name?: string
          season?: string | null
          slug?: string
          sport_type?: string
          starts_at?: string | null
          status?: string
          theme_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "base_tournaments_theme_id_fkey"
            columns: ["theme_id"]
            isOneToOne: false
            referencedRelation: "themes"
            referencedColumns: ["id"]
          },
        ]
      }
      bonus_predictions: {
        Row: {
          bonus_key: string
          created_at: string
          id: string
          league_id: string
          participant_id: string
          points: number
          updated_at: string
          value: string | null
        }
        Insert: {
          bonus_key: string
          created_at?: string
          id?: string
          league_id: string
          participant_id: string
          points?: number
          updated_at?: string
          value?: string | null
        }
        Update: {
          bonus_key?: string
          created_at?: string
          id?: string
          league_id?: string
          participant_id?: string
          points?: number
          updated_at?: string
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bonus_predictions_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "private_leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bonus_predictions_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "league_participants"
            referencedColumns: ["id"]
          },
        ]
      }
      bonus_rules: {
        Row: {
          bonus_key: string
          correct_value: string | null
          created_at: string
          id: string
          input_type: string
          label: string
          league_id: string
          options: Json
          points: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          bonus_key: string
          correct_value?: string | null
          created_at?: string
          id?: string
          input_type?: string
          label: string
          league_id: string
          options?: Json
          points?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          bonus_key?: string
          correct_value?: string | null
          created_at?: string
          id?: string
          input_type?: string
          label?: string
          league_id?: string
          options?: Json
          points?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bonus_rules_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "private_leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      leaderboard_snapshots: {
        Row: {
          created_at: string
          data: Json
          id: string
          league_id: string
        }
        Insert: {
          created_at?: string
          data?: Json
          id?: string
          league_id: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          league_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leaderboard_snapshots_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "private_leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      league_managers: {
        Row: {
          created_at: string
          id: string
          league_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          league_id: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          league_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "league_managers_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "private_leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      league_participants: {
        Row: {
          created_at: string
          email: string | null
          id: string
          league_id: string
          name: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          league_id: string
          name: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          league_id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "league_participants_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "private_leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      manager_approval: {
        Row: {
          created_at: string
          note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["approval_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["approval_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["approval_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      match_predictions: {
        Row: {
          away_score: number
          created_at: string
          home_score: number
          id: string
          league_id: string
          match_id: string
          participant_id: string
          points: number
          updated_at: string
        }
        Insert: {
          away_score: number
          created_at?: string
          home_score: number
          id?: string
          league_id: string
          match_id: string
          participant_id: string
          points?: number
          updated_at?: string
        }
        Update: {
          away_score?: number
          created_at?: string
          home_score?: number
          id?: string
          league_id?: string
          match_id?: string
          participant_id?: string
          points?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_predictions_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "private_leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_predictions_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_predictions_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "league_participants"
            referencedColumns: ["id"]
          },
        ]
      }
      match_results: {
        Row: {
          away_score: number
          created_at: string
          entered_by: string | null
          home_score: number
          id: string
          match_id: string
          source: string
          status: string
          updated_at: string
        }
        Insert: {
          away_score: number
          created_at?: string
          entered_by?: string | null
          home_score: number
          id?: string
          match_id: string
          source?: string
          status?: string
          updated_at?: string
        }
        Update: {
          away_score?: number
          created_at?: string
          entered_by?: string | null
          home_score?: number
          id?: string
          match_id?: string
          source?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_results_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: true
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          away_team_id: string | null
          base_tournament_id: string
          city: string | null
          created_at: string
          external_ref: string | null
          group_name: string | null
          home_team_id: string | null
          id: string
          label: string | null
          match_time: string | null
          stage: string
          status: string
          updated_at: string
          venue: string | null
        }
        Insert: {
          away_team_id?: string | null
          base_tournament_id: string
          city?: string | null
          created_at?: string
          external_ref?: string | null
          group_name?: string | null
          home_team_id?: string | null
          id?: string
          label?: string | null
          match_time?: string | null
          stage?: string
          status?: string
          updated_at?: string
          venue?: string | null
        }
        Update: {
          away_team_id?: string | null
          base_tournament_id?: string
          city?: string | null
          created_at?: string
          external_ref?: string | null
          group_name?: string | null
          home_team_id?: string | null
          id?: string
          label?: string | null
          match_time?: string | null
          stage?: string
          status?: string
          updated_at?: string
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_base_tournament_id_fkey"
            columns: ["base_tournament_id"]
            isOneToOne: false
            referencedRelation: "base_tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          active_provider: string
          allow_result_override_default: boolean
          id: number
          registration_open: boolean
          settings: Json
          updated_at: string
        }
        Insert: {
          active_provider?: string
          allow_result_override_default?: boolean
          id?: number
          registration_open?: boolean
          settings?: Json
          updated_at?: string
        }
        Update: {
          active_provider?: string
          allow_result_override_default?: boolean
          id?: number
          registration_open?: boolean
          settings?: Json
          updated_at?: string
        }
        Relationships: []
      }
      player_links: {
        Row: {
          created_at: string
          id: string
          league_id: string
          participant_id: string
          token: string
        }
        Insert: {
          created_at?: string
          id?: string
          league_id: string
          participant_id: string
          token: string
        }
        Update: {
          created_at?: string
          id?: string
          league_id?: string
          participant_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_links_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "private_leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_links_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "league_participants"
            referencedColumns: ["id"]
          },
        ]
      }
      private_leagues: {
        Row: {
          auto_sync_enabled: boolean
          base_tournament_id: string
          created_at: string
          deadline: string | null
          description: string | null
          id: string
          is_public: boolean
          manager_id: string
          name: string
          predictions_locked: boolean
          result_override_allowed: boolean
          slug: string
          updated_at: string
        }
        Insert: {
          auto_sync_enabled?: boolean
          base_tournament_id: string
          created_at?: string
          deadline?: string | null
          description?: string | null
          id?: string
          is_public?: boolean
          manager_id: string
          name: string
          predictions_locked?: boolean
          result_override_allowed?: boolean
          slug: string
          updated_at?: string
        }
        Update: {
          auto_sync_enabled?: boolean
          base_tournament_id?: string
          created_at?: string
          deadline?: string | null
          description?: string | null
          id?: string
          is_public?: boolean
          manager_id?: string
          name?: string
          predictions_locked?: boolean
          result_override_allowed?: boolean
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "private_leagues_base_tournament_id_fkey"
            columns: ["base_tournament_id"]
            isOneToOne: false
            referencedRelation: "base_tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      result_change_log: {
        Row: {
          changed_at: string
          changed_by: string | null
          id: string
          match_id: string
          new_away: number | null
          new_home: number | null
          note: string | null
          old_away: number | null
          old_home: number | null
          source: string | null
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          match_id: string
          new_away?: number | null
          new_home?: number | null
          note?: string | null
          old_away?: number | null
          old_home?: number | null
          source?: string | null
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          match_id?: string
          new_away?: number | null
          new_home?: number | null
          note?: string | null
          old_away?: number | null
          old_home?: number | null
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "result_change_log_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      scoring_rules: {
        Row: {
          created_at: string
          created_by: string | null
          exact_score_points: number
          id: string
          incorrect_points: number
          is_preset: boolean
          league_id: string | null
          name: string
          tendency_points: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          exact_score_points?: number
          id?: string
          incorrect_points?: number
          is_preset?: boolean
          league_id?: string | null
          name?: string
          tendency_points?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          exact_score_points?: number
          id?: string
          incorrect_points?: number
          is_preset?: boolean
          league_id?: string | null
          name?: string
          tendency_points?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scoring_rules_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: true
            referencedRelation: "private_leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          base_tournament_id: string
          created_at: string
          external_ref: string | null
          flag_emoji: string | null
          flag_url: string | null
          group_name: string | null
          id: string
          name: string
          short_code: string | null
        }
        Insert: {
          base_tournament_id: string
          created_at?: string
          external_ref?: string | null
          flag_emoji?: string | null
          flag_url?: string | null
          group_name?: string | null
          id?: string
          name: string
          short_code?: string | null
        }
        Update: {
          base_tournament_id?: string
          created_at?: string
          external_ref?: string | null
          flag_emoji?: string | null
          flag_url?: string | null
          group_name?: string | null
          id?: string
          name?: string
          short_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_base_tournament_id_fkey"
            columns: ["base_tournament_id"]
            isOneToOne: false
            referencedRelation: "base_tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      themes: {
        Row: {
          asset_urls: Json
          background_url: string | null
          button_style: Json
          colors: Json
          created_at: string
          created_by: string | null
          id: string
          is_published: boolean
          logo_url: string | null
          name: string
          sport_type: string
          typography: Json
          updated_at: string
        }
        Insert: {
          asset_urls?: Json
          background_url?: string | null
          button_style?: Json
          colors?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          is_published?: boolean
          logo_url?: string | null
          name: string
          sport_type?: string
          typography?: Json
          updated_at?: string
        }
        Update: {
          asset_urls?: Json
          background_url?: string | null
          button_style?: Json
          colors?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          is_published?: boolean
          logo_url?: string | null
          name?: string
          sport_type?: string
          typography?: Json
          updated_at?: string
        }
        Relationships: []
      }
      tournament_theme_assignments: {
        Row: {
          assigned_by: string | null
          base_tournament_id: string
          created_at: string
          id: string
          theme_id: string
        }
        Insert: {
          assigned_by?: string | null
          base_tournament_id: string
          created_at?: string
          id?: string
          theme_id: string
        }
        Update: {
          assigned_by?: string | null
          base_tournament_id?: string
          created_at?: string
          id?: string
          theme_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_theme_assignments_base_tournament_id_fkey"
            columns: ["base_tournament_id"]
            isOneToOne: true
            referencedRelation: "base_tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_theme_assignments_theme_id_fkey"
            columns: ["theme_id"]
            isOneToOne: false
            referencedRelation: "themes"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "platform_owner" | "league_manager"
      approval_status: "pending" | "approved" | "rejected"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["platform_owner", "league_manager"],
      approval_status: ["pending", "approved", "rejected"],
    },
  },
} as const
