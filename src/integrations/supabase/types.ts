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
      bonus_predictions: {
        Row: {
          bonus_key: string
          created_at: string
          id: string
          participant_id: string
          points: number
          tournament_id: string
          updated_at: string
          value: string | null
        }
        Insert: {
          bonus_key: string
          created_at?: string
          id?: string
          participant_id: string
          points?: number
          tournament_id: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          bonus_key?: string
          created_at?: string
          id?: string
          participant_id?: string
          points?: number
          tournament_id?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bonus_predictions_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bonus_predictions_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      leaderboard_snapshots: {
        Row: {
          created_at: string
          data: Json
          id: string
          tournament_id: string
        }
        Insert: {
          created_at?: string
          data?: Json
          id?: string
          tournament_id: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leaderboard_snapshots_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      match_predictions: {
        Row: {
          away_score: number
          created_at: string
          home_score: number
          id: string
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
          match_id?: string
          participant_id?: string
          points?: number
          updated_at?: string
        }
        Relationships: [
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
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          away_team_id: string | null
          created_at: string
          home_team_id: string | null
          id: string
          locked: boolean
          match_time: string | null
          stage: string
          status: string
          tournament_id: string
          updated_at: string
        }
        Insert: {
          away_team_id?: string | null
          created_at?: string
          home_team_id?: string | null
          id?: string
          locked?: boolean
          match_time?: string | null
          stage?: string
          status?: string
          tournament_id: string
          updated_at?: string
        }
        Update: {
          away_team_id?: string | null
          created_at?: string
          home_team_id?: string | null
          id?: string
          locked?: boolean
          match_time?: string | null
          stage?: string
          status?: string
          tournament_id?: string
          updated_at?: string
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
            foreignKeyName: "matches_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      participants: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string
          tournament_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name: string
          tournament_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "participants_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      prediction_links: {
        Row: {
          created_at: string
          id: string
          participant_id: string
          token: string
          tournament_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          participant_id: string
          token: string
          tournament_id: string
        }
        Update: {
          created_at?: string
          id?: string
          participant_id?: string
          token?: string
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prediction_links_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prediction_links_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      result_change_log: {
        Row: {
          changed_at: string
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
      results: {
        Row: {
          away_score: number
          created_at: string
          entered_by: string | null
          home_score: number
          id: string
          match_id: string
          source: string
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
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "results_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: true
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      scoring_rules: {
        Row: {
          bonus_config: Json
          created_at: string
          exact_score_points: number
          id: string
          incorrect_points: number
          is_preset: boolean
          name: string
          tendency_points: number
          updated_at: string
        }
        Insert: {
          bonus_config?: Json
          created_at?: string
          exact_score_points?: number
          id?: string
          incorrect_points?: number
          is_preset?: boolean
          name: string
          tendency_points?: number
          updated_at?: string
        }
        Update: {
          bonus_config?: Json
          created_at?: string
          exact_score_points?: number
          id?: string
          incorrect_points?: number
          is_preset?: boolean
          name?: string
          tendency_points?: number
          updated_at?: string
        }
        Relationships: []
      }
      teams: {
        Row: {
          created_at: string
          flag_emoji: string | null
          flag_url: string | null
          group_name: string | null
          id: string
          name: string
          short_code: string | null
          tournament_id: string
        }
        Insert: {
          created_at?: string
          flag_emoji?: string | null
          flag_url?: string | null
          group_name?: string | null
          id?: string
          name: string
          short_code?: string | null
          tournament_id: string
        }
        Update: {
          created_at?: string
          flag_emoji?: string | null
          flag_url?: string | null
          group_name?: string | null
          id?: string
          name?: string
          short_code?: string | null
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
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
          id: string
          is_active: boolean
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
          id?: string
          is_active?: boolean
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
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          sport_type?: string
          typography?: Json
          updated_at?: string
        }
        Relationships: []
      }
      tournaments: {
        Row: {
          bonus_config: Json
          created_at: string
          deadline: string | null
          description: string | null
          id: string
          name: string
          predictions_locked: boolean
          scoring_rules_id: string | null
          slug: string
          sport_type: string
          status: string
          theme_id: string | null
          updated_at: string
        }
        Insert: {
          bonus_config?: Json
          created_at?: string
          deadline?: string | null
          description?: string | null
          id?: string
          name: string
          predictions_locked?: boolean
          scoring_rules_id?: string | null
          slug: string
          sport_type?: string
          status?: string
          theme_id?: string | null
          updated_at?: string
        }
        Update: {
          bonus_config?: Json
          created_at?: string
          deadline?: string | null
          description?: string | null
          id?: string
          name?: string
          predictions_locked?: boolean
          scoring_rules_id?: string | null
          slug?: string
          sport_type?: string
          status?: string
          theme_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournaments_scoring_rules_id_fkey"
            columns: ["scoring_rules_id"]
            isOneToOne: false
            referencedRelation: "scoring_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournaments_theme_id_fkey"
            columns: ["theme_id"]
            isOneToOne: false
            referencedRelation: "themes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
