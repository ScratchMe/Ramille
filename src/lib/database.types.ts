// Généré depuis le schéma Supabase réel (projet TraceVerte-v1) via
// mcp__Supabase__generate_typescript_types. À régénérer après toute migration
// (supabase/migrations/) pour rester synchronisé avec la base.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      action_templates: {
        Row: {
          action_text: string
          id: string
          transport_mode_category: string
        }
        Insert: {
          action_text: string
          id?: string
          transport_mode_category: string
        }
        Update: {
          action_text?: string
          id?: string
          transport_mode_category?: string
        }
        Relationships: []
      }
      assessment_answers: {
        Row: {
          assessment_id: string
          car_long_trips_engine: string | null
          car_long_trips_per_year: number
          commute_car_engine: string | null
          commute_carpool_size: number | null
          commute_days_per_week: number | null
          commute_distance_bracket: string | null
          commute_distance_km: number | null
          commute_has_regular_trip: boolean
          commute_is_carpool: boolean
          commute_mode: string | null
          commute_second_mode: string | null
          commute_second_mode_used: boolean
          flights_short_per_year: number | null
          flights_total_per_year: number
          household_vehicles: string | null
          leisure_car_engine: string | null
          leisure_distance_bracket: string | null
          leisure_frequency: string
          leisure_mode: string | null
          tc_access: string | null
          train_long_trips_per_year: number
          updated_at: string
          zone_type: string | null
        }
        Insert: {
          assessment_id: string
          car_long_trips_engine?: string | null
          car_long_trips_per_year?: number
          commute_car_engine?: string | null
          commute_carpool_size?: number | null
          commute_days_per_week?: number | null
          commute_distance_bracket?: string | null
          commute_distance_km?: number | null
          commute_has_regular_trip: boolean
          commute_is_carpool?: boolean
          commute_mode?: string | null
          commute_second_mode?: string | null
          commute_second_mode_used?: boolean
          flights_short_per_year?: number | null
          flights_total_per_year?: number
          household_vehicles?: string | null
          leisure_car_engine?: string | null
          leisure_distance_bracket?: string | null
          leisure_frequency: string
          leisure_mode?: string | null
          tc_access?: string | null
          train_long_trips_per_year?: number
          updated_at?: string
          zone_type?: string | null
        }
        Update: {
          assessment_id?: string
          car_long_trips_engine?: string | null
          car_long_trips_per_year?: number
          commute_car_engine?: string | null
          commute_carpool_size?: number | null
          commute_days_per_week?: number | null
          commute_distance_bracket?: string | null
          commute_distance_km?: number | null
          commute_has_regular_trip?: boolean
          commute_is_carpool?: boolean
          commute_mode?: string | null
          commute_second_mode?: string | null
          commute_second_mode_used?: boolean
          flights_short_per_year?: number | null
          flights_total_per_year?: number
          household_vehicles?: string | null
          leisure_car_engine?: string | null
          leisure_distance_bracket?: string | null
          leisure_frequency?: string
          leisure_mode?: string | null
          tc_access?: string | null
          train_long_trips_per_year?: number
          updated_at?: string
          zone_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assessment_answers_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: true
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_answers_commute_mode_fkey"
            columns: ["commute_mode"]
            isOneToOne: false
            referencedRelation: "transport_modes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_answers_commute_second_mode_fkey"
            columns: ["commute_second_mode"]
            isOneToOne: false
            referencedRelation: "transport_modes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_answers_leisure_mode_fkey"
            columns: ["leisure_mode"]
            isOneToOne: false
            referencedRelation: "transport_modes"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_results: {
        Row: {
          assessment_id: string
          commute_co2_kg_year: number
          commute_poste_label: string | null
          computed_at: string
          dominant_poste: string
          dominant_poste_co2_kg_year: number
          dominant_poste_label: string
          dominant_poste_mode: string | null
          extras_poste_co2_kg_year: number | null
          extras_poste_label: string | null
          id: string
          leisure_co2_kg_year: number
          total_co2_kg_year: number
          travel_co2_kg_year: number
        }
        Insert: {
          assessment_id: string
          commute_co2_kg_year: number
          commute_poste_label?: string | null
          computed_at?: string
          dominant_poste: string
          dominant_poste_co2_kg_year: number
          dominant_poste_label: string
          dominant_poste_mode?: string | null
          extras_poste_co2_kg_year?: number | null
          extras_poste_label?: string | null
          id?: string
          leisure_co2_kg_year: number
          total_co2_kg_year: number
          travel_co2_kg_year: number
        }
        Update: {
          assessment_id?: string
          commute_co2_kg_year?: number
          commute_poste_label?: string | null
          computed_at?: string
          dominant_poste?: string
          dominant_poste_co2_kg_year?: number
          dominant_poste_label?: string
          dominant_poste_mode?: string | null
          extras_poste_co2_kg_year?: number | null
          extras_poste_label?: string | null
          id?: string
          leisure_co2_kg_year?: number
          total_co2_kg_year?: number
          travel_co2_kg_year?: number
        }
        Relationships: [
          {
            foreignKeyName: "assessment_results_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: true
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_results_dominant_poste_mode_fkey"
            columns: ["dominant_poste_mode"]
            isOneToOne: false
            referencedRelation: "transport_modes"
            referencedColumns: ["id"]
          },
        ]
      }
      assessments: {
        Row: {
          created_at: string
          id: string
          status: string
          submitted_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          status?: string
          submitted_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          status?: string
          submitted_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      emission_factors: {
        Row: {
          id: string
          kg_co2_per_km: number
          source: string
          source_ref: string | null
          transport_mode_id: string
          valid_from: string
        }
        Insert: {
          id?: string
          kg_co2_per_km: number
          source?: string
          source_ref?: string | null
          transport_mode_id: string
          valid_from: string
        }
        Update: {
          id?: string
          kg_co2_per_km?: number
          source?: string
          source_ref?: string | null
          transport_mode_id?: string
          valid_from?: string
        }
        Relationships: [
          {
            foreignKeyName: "emission_factors_transport_mode_id_fkey"
            columns: ["transport_mode_id"]
            isOneToOne: false
            referencedRelation: "transport_modes"
            referencedColumns: ["id"]
          },
        ]
      }
      engagement_checkins: {
        Row: {
          created_at: string
          id: string
          loop_type: string
          period_label: string
          period_start: string
          responded_at: string | null
          response: boolean | null
          status: string
          trip_label: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          loop_type: string
          period_label: string
          period_start: string
          responded_at?: string | null
          response?: boolean | null
          status?: string
          trip_label: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          loop_type?: string
          period_label?: string
          period_start?: string
          responded_at?: string | null
          response?: boolean | null
          status?: string
          trip_label?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "engagement_checkins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_actions: {
        Row: {
          action_template_id: string
          created_at: string
          id: string
          plan_cycle_id: string
        }
        Insert: {
          action_template_id: string
          created_at?: string
          id?: string
          plan_cycle_id: string
        }
        Update: {
          action_template_id?: string
          created_at?: string
          id?: string
          plan_cycle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_actions_action_template_id_fkey"
            columns: ["action_template_id"]
            isOneToOne: false
            referencedRelation: "action_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_actions_plan_cycle_id_fkey"
            columns: ["plan_cycle_id"]
            isOneToOne: false
            referencedRelation: "plan_cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_cycles: {
        Row: {
          baseline_co2_kg_year: number | null
          cadence_type: string
          created_at: string
          id: string
          period_end: string
          period_label: string
          period_start: string
          target_reduction_pct: number
          trip_label: string
          user_id: string
        }
        Insert: {
          baseline_co2_kg_year?: number | null
          cadence_type: string
          created_at?: string
          id?: string
          period_end: string
          period_label: string
          period_start: string
          target_reduction_pct: number
          trip_label: string
          user_id: string
        }
        Update: {
          baseline_co2_kg_year?: number | null
          cadence_type?: string
          created_at?: string
          id?: string
          period_end?: string
          period_label?: string
          period_start?: string
          target_reduction_pct?: number
          trip_label?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_cycles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          cadence_type: string
          created_at: string
          id: string
          onboarding_completed_at: string | null
          tc_access: string | null
          zone_type: string | null
        }
        Insert: {
          cadence_type?: string
          created_at?: string
          id: string
          onboarding_completed_at?: string | null
          tc_access?: string | null
          zone_type?: string | null
        }
        Update: {
          cadence_type?: string
          created_at?: string
          id?: string
          onboarding_completed_at?: string | null
          tc_access?: string | null
          zone_type?: string | null
        }
        Relationships: []
      }
      transport_modes: {
        Row: {
          category: string
          id: string
          label: string
        }
        Insert: {
          category: string
          id: string
          label: string
        }
        Update: {
          category?: string
          id?: string
          label?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      compute_assessment_results: {
        Args: { p_assessment_id: string }
        Returns: undefined
      }
      generate_commute_checkins: { Args: never; Returns: undefined }
      generate_extras_checkins: { Args: never; Returns: undefined }
      generate_plan_cycle_for_user: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      generate_plan_cycles: { Args: never; Returns: undefined }
      purge_stale_anonymous_accounts: { Args: never; Returns: undefined }
      resolve_car_mode: {
        Args: { p_engine: string; p_mode_id: string }
        Returns: string
      }
      rolling_quarter_bounds: {
        Args: { anchor: string; d: string }
        Returns: {
          label: string
          period_end: string
          period_start: string
        }[]
      }
      season_bounds: {
        Args: { d: string }
        Returns: {
          label: string
          period_end: string
          period_start: string
        }[]
      }
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
