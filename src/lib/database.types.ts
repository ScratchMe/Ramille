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
          detail_kind: string | null
          id: string
          max_distance_km: number | null
          operation: string | null
          poste: string | null
          requires_car: boolean
          requires_tc: boolean
          segment: string | null
          share: number | null
          substitute_mode_id: string | null
          trips: number | null
        }
        Insert: {
          action_text: string
          detail_kind?: string | null
          id?: string
          max_distance_km?: number | null
          operation?: string | null
          poste?: string | null
          requires_car?: boolean
          requires_tc?: boolean
          segment?: string | null
          share?: number | null
          substitute_mode_id?: string | null
          trips?: number | null
        }
        Update: {
          action_text?: string
          detail_kind?: string | null
          id?: string
          max_distance_km?: number | null
          operation?: string | null
          poste?: string | null
          requires_car?: boolean
          requires_tc?: boolean
          segment?: string | null
          share?: number | null
          substitute_mode_id?: string | null
          trips?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "action_templates_substitute_mode_id_fkey"
            columns: ["substitute_mode_id"]
            isOneToOne: false
            referencedRelation: "transport_modes"
            referencedColumns: ["id"]
          },
        ]
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
          commute_two_wheeler_type: string | null
          flights_short_per_year: number | null
          flights_total_per_year: number
          household_vehicles: string | null
          leisure_car_engine: string | null
          leisure_distance_bracket: string | null
          leisure_frequency: string
          leisure_mode: string | null
          leisure_two_wheeler_type: string | null
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
          commute_two_wheeler_type?: string | null
          flights_short_per_year?: number | null
          flights_total_per_year?: number
          household_vehicles?: string | null
          leisure_car_engine?: string | null
          leisure_distance_bracket?: string | null
          leisure_frequency: string
          leisure_mode?: string | null
          leisure_two_wheeler_type?: string | null
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
          commute_two_wheeler_type?: string | null
          flights_short_per_year?: number | null
          flights_total_per_year?: number
          household_vehicles?: string | null
          leisure_car_engine?: string | null
          leisure_distance_bracket?: string | null
          leisure_frequency?: string
          leisure_mode?: string | null
          leisure_two_wheeler_type?: string | null
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
          commute_main_leg_co2_kg_year: number | null
          commute_main_leg_km_year: number | null
          commute_poste_label: string | null
          commute_trip_distance_km: number | null
          computed_at: string
          dominant_poste: string
          dominant_poste_co2_kg_year: number
          dominant_poste_label: string
          dominant_poste_mode: string | null
          extras_poste_co2_kg_year: number | null
          extras_poste_label: string | null
          id: string
          leisure_co2_kg_year: number
          leisure_km_year: number | null
          leisure_trip_distance_km: number | null
          mobility_constrained: boolean | null
          total_co2_kg_year: number
          travel_car_co2_kg_year: number | null
          travel_co2_kg_year: number
          travel_flight_long_co2_kg_year: number | null
          travel_flight_short_co2_kg_year: number | null
          travel_train_co2_kg_year: number | null
        }
        Insert: {
          assessment_id: string
          commute_co2_kg_year: number
          commute_main_leg_co2_kg_year?: number | null
          commute_main_leg_km_year?: number | null
          commute_poste_label?: string | null
          commute_trip_distance_km?: number | null
          computed_at?: string
          dominant_poste: string
          dominant_poste_co2_kg_year: number
          dominant_poste_label: string
          dominant_poste_mode?: string | null
          extras_poste_co2_kg_year?: number | null
          extras_poste_label?: string | null
          id?: string
          leisure_co2_kg_year: number
          leisure_km_year?: number | null
          leisure_trip_distance_km?: number | null
          mobility_constrained?: boolean | null
          total_co2_kg_year: number
          travel_car_co2_kg_year?: number | null
          travel_co2_kg_year: number
          travel_flight_long_co2_kg_year?: number | null
          travel_flight_short_co2_kg_year?: number | null
          travel_train_co2_kg_year?: number | null
        }
        Update: {
          assessment_id?: string
          commute_co2_kg_year?: number
          commute_main_leg_co2_kg_year?: number | null
          commute_main_leg_km_year?: number | null
          commute_poste_label?: string | null
          commute_trip_distance_km?: number | null
          computed_at?: string
          dominant_poste?: string
          dominant_poste_co2_kg_year?: number
          dominant_poste_label?: string
          dominant_poste_mode?: string | null
          extras_poste_co2_kg_year?: number | null
          extras_poste_label?: string | null
          id?: string
          leisure_co2_kg_year?: number
          leisure_km_year?: number | null
          leisure_trip_distance_km?: number | null
          mobility_constrained?: boolean | null
          total_co2_kg_year?: number
          travel_car_co2_kg_year?: number | null
          travel_co2_kg_year?: number
          travel_flight_long_co2_kg_year?: number | null
          travel_flight_short_co2_kg_year?: number | null
          travel_train_co2_kg_year?: number | null
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
      emission_factor_sources: {
        Row: {
          impactco2_slugs: string[]
          note: string | null
          transport_mode_id: string
        }
        Insert: {
          impactco2_slugs: string[]
          note?: string | null
          transport_mode_id: string
        }
        Update: {
          impactco2_slugs?: string[]
          note?: string | null
          transport_mode_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "emission_factor_sources_transport_mode_id_fkey"
            columns: ["transport_mode_id"]
            isOneToOne: true
            referencedRelation: "transport_modes"
            referencedColumns: ["id"]
          },
        ]
      }
      emission_factor_sync_runs: {
        Row: {
          detail: string | null
          id: string
          modes_updated: number
          ran_at: string
          status: string
        }
        Insert: {
          detail?: string | null
          id?: string
          modes_updated?: number
          ran_at?: string
          status: string
        }
        Update: {
          detail?: string | null
          id?: string
          modes_updated?: number
          ran_at?: string
          status?: string
        }
        Relationships: []
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
      feedback: {
        Row: {
          context: string | null
          created_at: string
          id: string
          kind: string
          message: string
          user_id: string
        }
        Insert: {
          context?: string | null
          created_at?: string
          id?: string
          kind: string
          message: string
          user_id: string
        }
        Update: {
          context?: string | null
          created_at?: string
          id?: string
          kind?: string
          message?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_outbox: {
        Row: {
          attempts: number
          body: string
          channel: string
          checkin_id: string
          created_at: string
          id: string
          last_error: string | null
          provider_ticket: Json | null
          push_body: string | null
          receipts_checked_at: string | null
          recipient_email: string | null
          send_after: string
          sent_at: string | null
          status: string
          subject: string
          user_id: string
        }
        Insert: {
          attempts?: number
          body: string
          channel?: string
          checkin_id: string
          created_at?: string
          id?: string
          last_error?: string | null
          provider_ticket?: Json | null
          push_body?: string | null
          receipts_checked_at?: string | null
          recipient_email?: string | null
          send_after?: string
          sent_at?: string | null
          status?: string
          subject: string
          user_id: string
        }
        Update: {
          attempts?: number
          body?: string
          channel?: string
          checkin_id?: string
          created_at?: string
          id?: string
          last_error?: string | null
          provider_ticket?: Json | null
          push_body?: string | null
          receipts_checked_at?: string | null
          recipient_email?: string | null
          send_after?: string
          sent_at?: string | null
          status?: string
          subject?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_outbox_checkin_id_fkey"
            columns: ["checkin_id"]
            isOneToOne: true
            referencedRelation: "engagement_checkins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_outbox_user_id_fkey"
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
          committed_at: string | null
          created_at: string
          detail_text: string | null
          id: string
          intention_days: number[] | null
          intention_timing: string | null
          plan_cycle_id: string
          rank: number | null
          saving_kg_year: number | null
          saving_share_percent: number | null
        }
        Insert: {
          action_template_id: string
          committed_at?: string | null
          created_at?: string
          detail_text?: string | null
          id?: string
          intention_days?: number[] | null
          intention_timing?: string | null
          plan_cycle_id: string
          rank?: number | null
          saving_kg_year?: number | null
          saving_share_percent?: number | null
        }
        Update: {
          action_template_id?: string
          committed_at?: string | null
          created_at?: string
          detail_text?: string | null
          id?: string
          intention_days?: number[] | null
          intention_timing?: string | null
          plan_cycle_id?: string
          rank?: number | null
          saving_kg_year?: number | null
          saving_share_percent?: number | null
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
          reminder_channel: string
        }
        Insert: {
          cadence_type?: string
          created_at?: string
          id: string
          reminder_channel?: string
        }
        Update: {
          cadence_type?: string
          created_at?: string
          id?: string
          reminder_channel?: string
        }
        Relationships: []
      }
      purge_runs: {
        Row: {
          candidates: number
          deleted: number
          detail: string | null
          id: string
          ran_at: string
          status: string
        }
        Insert: {
          candidates?: number
          deleted?: number
          detail?: string | null
          id?: string
          ran_at?: string
          status: string
        }
        Update: {
          candidates?: number
          deleted?: number
          detail?: string | null
          id?: string
          ran_at?: string
          status?: string
        }
        Relationships: []
      }
      push_tokens: {
        Row: {
          created_at: string
          disabled_at: string | null
          disabled_reason: string | null
          last_seen_at: string
          platform: string
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          disabled_at?: string | null
          disabled_reason?: string | null
          last_seen_at?: string
          platform: string
          token: string
          user_id: string
        }
        Update: {
          created_at?: string
          disabled_at?: string | null
          disabled_reason?: string | null
          last_seen_at?: string
          platform?: string
          token?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reminder_send_runs: {
        Row: {
          canal: string
          detail: string | null
          echecs: number
          envoyes: number
          id: string
          ran_at: string
          status: string
          traites: number
        }
        Insert: {
          canal: string
          detail?: string | null
          echecs?: number
          envoyes?: number
          id?: string
          ran_at?: string
          status: string
          traites?: number
        }
        Update: {
          canal?: string
          detail?: string | null
          echecs?: number
          envoyes?: number
          id?: string
          ran_at?: string
          status?: string
          traites?: number
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
      usage_event_types: {
        Row: {
          description: string
          name: string
        }
        Insert: {
          description: string
          name: string
        }
        Update: {
          description?: string
          name?: string
        }
        Relationships: []
      }
      usage_events: {
        Row: {
          id: number
          name: string
          occurred_at: string
          platform: string
          props: Json
          user_id: string
        }
        Insert: {
          id?: never
          name: string
          occurred_at?: string
          platform: string
          props?: Json
          user_id: string
        }
        Update: {
          id?: never
          name?: string
          occurred_at?: string
          platform?: string
          props?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_events_name_fkey"
            columns: ["name"]
            isOneToOne: false
            referencedRelation: "usage_event_types"
            referencedColumns: ["name"]
          },
          {
            foreignKeyName: "usage_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_intention_days: { Args: { p_days: number[] }; Returns: boolean }
      check_usage_event_props: { Args: { p_props: Json }; Returns: boolean }
      clear_plan_action_commitment: {
        Args: { p_plan_action_id: string }
        Returns: undefined
      }
      collect_push_receipts: { Args: never; Returns: undefined }
      commit_plan_action: {
        Args: { p_days?: number[]; p_plan_action_id: string; p_timing?: string }
        Returns: undefined
      }
      compute_assessment_results: {
        Args: { p_assessment_id: string }
        Returns: undefined
      }
      delete_my_account: { Args: never; Returns: undefined }
      emission_factor: {
        Args: { p_mode_id: string; p_on_date: string }
        Returns: number
      }
      enqueue_checkin_reminders: { Args: never; Returns: undefined }
      envoyer_lot_push: {
        Args: {
          p_expo_token: string
          p_jetons: string[]
          p_lignes: string[]
          p_messages: Json
        }
        Returns: Json
      }
      estimate_action_savings: {
        Args: { p_assessment_id: string }
        Returns: Database["public"]["CompositeTypes"]["action_saving"][]
        SetofOptions: {
          from: "*"
          to: "action_saving"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      export_my_data: { Args: never; Returns: Json }
      generate_commute_checkins: { Args: never; Returns: undefined }
      generate_extras_checkins: { Args: never; Returns: undefined }
      generate_plan_cycle_for_user: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      generate_plan_cycles: { Args: never; Returns: undefined }
      purge_notification_outbox: { Args: never; Returns: undefined }
      purge_stale_anonymous_accounts: { Args: never; Returns: undefined }
      purge_usage_events: { Args: never; Returns: undefined }
      recompute_assessment_results: {
        Args: { p_assessment_id: string }
        Returns: undefined
      }
      register_push_token: {
        Args: { p_platform: string; p_token: string }
        Returns: undefined
      }
      reminder_channel_for: { Args: { p_user_id: string }; Returns: string }
      replier_rappel_sur_email: {
        Args: { p_outbox_id: string; p_raison: string }
        Returns: undefined
      }
      resolve_car_mode: {
        Args: { p_engine: string; p_mode_id: string }
        Returns: string
      }
      resolve_mode: {
        Args: {
          p_car_engine: string
          p_mode_id: string
          p_two_wheeler_type: string
        }
        Returns: string
      }
      resolve_two_wheeler_mode: {
        Args: { p_mode_id: string; p_type: string }
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
      send_pending_reminders: { Args: never; Returns: number }
      sync_emission_factors: { Args: never; Returns: undefined }
      unregister_push_token: { Args: { p_token: string }; Returns: undefined }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      action_saving: {
        action_template_id: string | null
        poste: string | null
        action_text: string | null
        detail_text: string | null
        saving_kg_year: number | null
      }
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
