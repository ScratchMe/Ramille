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
          first_step: string | null
          id: string
          max_distance_km: number | null
          min_distance_km: number | null
          operation: string | null
          // C4.2 — le mot de la veille (20260928075453)
          phrase_de_la_veille: string | null
          poste: string | null
          question_template: string | null
          requires_car: boolean
          requires_tc: boolean
          segment: string | null
          share: number | null
          substitute_mode_id: string | null
          teletravail_admissible: string[] | null
          // v1-34 — ce qui passe près de chez soi (20261002231530)
          transports_exclus: string[] | null
          transports_requis: string[] | null
          trips: number | null
          zones_admissibles: string[] | null
        }
        Insert: {
          action_text: string
          detail_kind?: string | null
          first_step?: string | null
          id?: string
          max_distance_km?: number | null
          min_distance_km?: number | null
          operation?: string | null
          // C4.2 — le mot de la veille (20260928075453)
          phrase_de_la_veille?: string | null
          poste?: string | null
          question_template?: string | null
          requires_car?: boolean
          requires_tc?: boolean
          segment?: string | null
          share?: number | null
          substitute_mode_id?: string | null
          teletravail_admissible?: string[] | null
          transports_exclus?: string[] | null
          transports_requis?: string[] | null
          trips?: number | null
          zones_admissibles?: string[] | null
        }
        Update: {
          action_text?: string
          detail_kind?: string | null
          first_step?: string | null
          id?: string
          max_distance_km?: number | null
          min_distance_km?: number | null
          operation?: string | null
          // C4.2 — le mot de la veille (20260928075453)
          phrase_de_la_veille?: string | null
          poste?: string | null
          question_template?: string | null
          requires_car?: boolean
          requires_tc?: boolean
          segment?: string | null
          share?: number | null
          substitute_mode_id?: string | null
          teletravail_admissible?: string[] | null
          transports_exclus?: string[] | null
          transports_requis?: string[] | null
          trips?: number | null
          zones_admissibles?: string[] | null
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
      // L'alerte d'exploitation (20261002203259) — serveur seulement, aucun privilège client
      alertes_d_exploitation: {
        Row: {
          actives: boolean
          derniere_verification: string
          dernier_envoi: string | null
          dernier_passage: string | null
          dernier_resume: string | null
          envois_du_jour: number
          id: boolean
          jour_des_envois: string
          plafond_par_jour: number
          rappels_bloques_vus: number
        }
        Insert: {
          actives?: boolean
          derniere_verification?: string
          dernier_envoi?: string | null
          dernier_passage?: string | null
          dernier_resume?: string | null
          envois_du_jour?: number
          id?: boolean
          jour_des_envois?: string
          plafond_par_jour?: number
          rappels_bloques_vus?: number
        }
        Update: {
          actives?: boolean
          derniere_verification?: string
          dernier_envoi?: string | null
          dernier_passage?: string | null
          dernier_resume?: string | null
          envois_du_jour?: number
          id?: boolean
          jour_des_envois?: string
          plafond_par_jour?: number
          rappels_bloques_vus?: number
        }
        Relationships: []
      }
      assessment_answers: {
        Row: {
          assessment_id: string
          car_long_trips_engine: string | null
          car_long_trips_occupancy: number | null
          car_long_trips_per_year: number
          coach_long_trips_per_year: number
          commute_car_engine: string | null
          commute_carpool_size: number | null
          commute_days_per_week: number | null
          commute_distance_bracket: string | null
          commute_distance_km: number | null
          commute_has_regular_trip: boolean
          commute_is_carpool: boolean
          commute_mode: string | null
          commute_second_mode: string | null
          commute_second_mode_share: number | null
          commute_second_mode_used: boolean
          commute_train_type: string | null
          commute_two_wheeler_type: string | null
          commute_velo_type: string | null
          flights_short_per_year: number | null
          flights_total_per_year: number
          household_vehicles: string | null
          leisure_car_engine: string | null
          leisure_carpool_size: number | null
          leisure_distance_bracket: string | null
          leisure_distance_km: number | null
          leisure_frequency: string
          leisure_is_carpool: boolean
          leisure_mode: string | null
          leisure_train_type: string | null
          leisure_two_wheeler_type: string | null
          leisure_velo_type: string | null
          tc_access: string | null
          teletravail: string | null
          train_long_trips_per_year: number
          // v1-34 — ce qui passe près de chez soi (20261002231530) ; tc_access s'en déduit
          transports_proches: string[] | null
          updated_at: string
          zone_type: string | null
        }
        Insert: {
          assessment_id: string
          car_long_trips_engine?: string | null
          car_long_trips_occupancy?: number | null
          car_long_trips_per_year?: number
          coach_long_trips_per_year?: number
          commute_car_engine?: string | null
          commute_carpool_size?: number | null
          commute_days_per_week?: number | null
          commute_distance_bracket?: string | null
          commute_distance_km?: number | null
          commute_has_regular_trip: boolean
          commute_is_carpool?: boolean
          commute_mode?: string | null
          commute_second_mode?: string | null
          commute_second_mode_share?: number | null
          commute_second_mode_used?: boolean
          commute_train_type?: string | null
          commute_two_wheeler_type?: string | null
          commute_velo_type?: string | null
          flights_short_per_year?: number | null
          flights_total_per_year?: number
          household_vehicles?: string | null
          leisure_car_engine?: string | null
          leisure_carpool_size?: number | null
          leisure_distance_bracket?: string | null
          leisure_distance_km?: number | null
          leisure_frequency: string
          leisure_is_carpool?: boolean
          leisure_mode?: string | null
          leisure_train_type?: string | null
          leisure_two_wheeler_type?: string | null
          leisure_velo_type?: string | null
          tc_access?: string | null
          teletravail?: string | null
          train_long_trips_per_year?: number
          transports_proches?: string[] | null
          updated_at?: string
          zone_type?: string | null
        }
        Update: {
          assessment_id?: string
          car_long_trips_engine?: string | null
          car_long_trips_occupancy?: number | null
          car_long_trips_per_year?: number
          coach_long_trips_per_year?: number
          commute_car_engine?: string | null
          commute_carpool_size?: number | null
          commute_days_per_week?: number | null
          commute_distance_bracket?: string | null
          commute_distance_km?: number | null
          commute_has_regular_trip?: boolean
          commute_is_carpool?: boolean
          commute_mode?: string | null
          commute_second_mode?: string | null
          commute_second_mode_share?: number | null
          commute_second_mode_used?: boolean
          commute_train_type?: string | null
          commute_two_wheeler_type?: string | null
          commute_velo_type?: string | null
          flights_short_per_year?: number | null
          flights_total_per_year?: number
          household_vehicles?: string | null
          leisure_car_engine?: string | null
          leisure_carpool_size?: number | null
          leisure_distance_bracket?: string | null
          leisure_distance_km?: number | null
          leisure_frequency?: string
          leisure_is_carpool?: boolean
          leisure_mode?: string | null
          leisure_train_type?: string | null
          leisure_two_wheeler_type?: string | null
          leisure_velo_type?: string | null
          tc_access?: string | null
          teletravail?: string | null
          train_long_trips_per_year?: number
          transports_proches?: string[] | null
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
          commute_poste_mode: string | null
          commute_second_leg_co2_kg_year: number | null
          commute_second_leg_km_year: number | null
          commute_trip_distance_km: number | null
          computed_at: string
          dominant_poste: string
          dominant_poste_co2_kg_year: number
          dominant_poste_label: string
          dominant_poste_mode: string | null
          extras_poste: string | null
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
          travel_coach_co2_kg_year: number | null
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
          commute_poste_mode?: string | null
          commute_second_leg_co2_kg_year?: number | null
          commute_second_leg_km_year?: number | null
          commute_trip_distance_km?: number | null
          computed_at?: string
          dominant_poste: string
          dominant_poste_co2_kg_year: number
          dominant_poste_label: string
          dominant_poste_mode?: string | null
          extras_poste?: string | null
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
          travel_coach_co2_kg_year?: number | null
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
          commute_poste_mode?: string | null
          commute_second_leg_co2_kg_year?: number | null
          commute_second_leg_km_year?: number | null
          commute_trip_distance_km?: number | null
          computed_at?: string
          dominant_poste?: string
          dominant_poste_co2_kg_year?: number
          dominant_poste_label?: string
          dominant_poste_mode?: string | null
          extras_poste?: string | null
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
          travel_coach_co2_kg_year?: number | null
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
            foreignKeyName: "assessment_results_commute_poste_mode_fkey"
            columns: ["commute_poste_mode"]
            isOneToOne: false
            referencedRelation: "transport_modes"
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
      // La passe avant le lancement (20261005170000) : aucun privilège client, le hook d'envoi la lit
      autorisations_de_rattachement: {
        Row: {
          accordee_le: string | null
          essais: number
          essais_depuis: string
          user_id: string
        }
        Insert: {
          accordee_le?: string | null
          essais?: number
          essais_depuis?: string
          user_id: string
        }
        Update: {
          accordee_le?: string | null
          essais?: number
          essais_depuis?: string
          user_id?: string
        }
        Relationships: []
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
          authentifie: boolean
          detail: string | null
          id: string
          modes_updated: number
          ran_at: string
          status: string
        }
        Insert: {
          authentifie?: boolean
          detail?: string | null
          id?: string
          modes_updated?: number
          ran_at?: string
          status: string
        }
        Update: {
          authentifie?: boolean
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
          committed_action_text: string | null
          committed_intention_days: number[] | null
          committed_intention_timing: string | null
          committed_question: string | null
          created_at: string
          id: string
          loop_type: string
          mode: string | null
          period_label: string
          period_start: string
          poste: string | null
          question_kind: string
          responded_at: string | null
          response: boolean | null
          response_kind: string | null
          status: string
          trip_label: string
          user_id: string
        }
        Insert: {
          committed_action_text?: string | null
          committed_intention_days?: number[] | null
          committed_intention_timing?: string | null
          committed_question?: string | null
          created_at?: string
          id?: string
          loop_type: string
          mode?: string | null
          period_label: string
          period_start: string
          poste?: string | null
          question_kind?: string
          responded_at?: string | null
          response?: boolean | null
          response_kind?: string | null
          status?: string
          trip_label: string
          user_id: string
        }
        Update: {
          committed_action_text?: string | null
          committed_intention_days?: number[] | null
          committed_intention_timing?: string | null
          committed_question?: string | null
          created_at?: string
          id?: string
          loop_type?: string
          mode?: string | null
          period_label?: string
          period_start?: string
          poste?: string | null
          question_kind?: string
          responded_at?: string | null
          response?: boolean | null
          response_kind?: string | null
          status?: string
          trip_label?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "engagement_checkins_mode_fkey"
            columns: ["mode"]
            isOneToOne: false
            referencedRelation: "transport_modes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagement_checkins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      envois_d_e_mails_d_auth: {
        Row: {
          adresse_empreinte: string
          cree_le: string
          fournisseur: string | null
          id: number
          issue: string
          statut_http: number | null
          type: string
          user_id: string | null
        }
        Insert: {
          adresse_empreinte: string
          cree_le?: string
          fournisseur?: string | null
          id?: never
          issue: string
          statut_http?: number | null
          type: string
          user_id?: string | null
        }
        Update: {
          adresse_empreinte?: string
          cree_le?: string
          fournisseur?: string | null
          id?: never
          issue?: string
          statut_http?: number | null
          type?: string
          user_id?: string | null
        }
        Relationships: []
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
          // C4.2 : nul pour un mot de la veille (genre = 'veille')
          checkin_id: string | null
          created_at: string
          // C4.2 — le mot de la veille (20260928075453)
          genre: string
          id: string
          // C4.2 — le mot de la veille (20260928075453)
          jour_vise: string | null
          last_error: string | null
          provider_ticket: Json | null
          push_body: string | null
          receipts_checked_at: string | null
          recipient_email: string | null
          send_after: string
          sent_at: string | null
          status: string
          subject: string
          unsubscribe_token: string
          unsubscribe_used_at: string | null
          user_id: string
        }
        Insert: {
          attempts?: number
          body: string
          channel?: string
          checkin_id?: string | null
          created_at?: string
          // C4.2 — le mot de la veille (20260928075453)
          genre?: string
          id?: string
          // C4.2 — le mot de la veille (20260928075453)
          jour_vise?: string | null
          last_error?: string | null
          provider_ticket?: Json | null
          push_body?: string | null
          receipts_checked_at?: string | null
          recipient_email?: string | null
          send_after?: string
          sent_at?: string | null
          status?: string
          subject: string
          unsubscribe_token?: string
          unsubscribe_used_at?: string | null
          user_id: string
        }
        Update: {
          attempts?: number
          body?: string
          channel?: string
          checkin_id?: string | null
          created_at?: string
          // C4.2 — le mot de la veille (20260928075453)
          genre?: string
          id?: string
          // C4.2 — le mot de la veille (20260928075453)
          jour_vise?: string | null
          last_error?: string | null
          provider_ticket?: Json | null
          push_body?: string | null
          receipts_checked_at?: string | null
          recipient_email?: string | null
          send_after?: string
          sent_at?: string | null
          status?: string
          subject?: string
          unsubscribe_token?: string
          unsubscribe_used_at?: string | null
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
      plan_action_commitments_archive: {
        Row: {
          action_template_id: string
          action_text: string
          committed_at: string
          id: string
          intention_days: number[] | null
          intention_timing: string | null
          plan_cycle_id: string | null
          released_at: string
          released_reason: string
          user_id: string
        }
        Insert: {
          action_template_id: string
          action_text: string
          committed_at: string
          id?: string
          intention_days?: number[] | null
          intention_timing?: string | null
          plan_cycle_id?: string | null
          released_at?: string
          released_reason: string
          user_id: string
        }
        Update: {
          action_template_id?: string
          action_text?: string
          committed_at?: string
          id?: string
          intention_days?: number[] | null
          intention_timing?: string | null
          plan_cycle_id?: string | null
          released_at?: string
          released_reason?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_action_commitments_archive_action_template_id_fkey"
            columns: ["action_template_id"]
            isOneToOne: false
            referencedRelation: "action_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_action_commitments_archive_plan_cycle_id_fkey"
            columns: ["plan_cycle_id"]
            isOneToOne: false
            referencedRelation: "plan_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_action_commitments_archive_user_id_fkey"
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
          carried_over_from: string | null
          committed_at: string | null
          created_at: string
          detail_text: string | null
          first_step: string | null
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
          carried_over_from?: string | null
          committed_at?: string | null
          created_at?: string
          detail_text?: string | null
          first_step?: string | null
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
          carried_over_from?: string | null
          committed_at?: string | null
          created_at?: string
          detail_text?: string | null
          first_step?: string | null
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
            foreignKeyName: "plan_actions_carried_over_from_fkey"
            columns: ["carried_over_from"]
            isOneToOne: false
            referencedRelation: "plan_cycles"
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
      plan_cycle_runs: {
        Row: {
          comptes: number
          detail: string | null
          echecs: number
          id: string
          ran_at: string
        }
        Insert: {
          comptes?: number
          detail?: string | null
          echecs?: number
          id?: string
          ran_at?: string
        }
        Update: {
          comptes?: number
          detail?: string | null
          echecs?: number
          id?: string
          ran_at?: string
        }
        Relationships: []
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
          poste: string | null
          // C4.2 — le mot de la veille (20260928075453)
          premier_engagement_le: string | null
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
          poste?: string | null
          // C4.2 — le mot de la veille (20260928075453)
          premier_engagement_le?: string | null
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
          poste?: string | null
          // C4.2 — le mot de la veille (20260928075453)
          premier_engagement_le?: string | null
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
          // C4.2 — le mot de la veille (20260928075453)
          mot_de_la_veille: string
          reminder_channel: string
        }
        Insert: {
          cadence_type?: string
          created_at?: string
          id: string
          // C4.2 — le mot de la veille (20260928075453)
          mot_de_la_veille?: string
          reminder_channel?: string
        }
        Update: {
          cadence_type?: string
          created_at?: string
          id?: string
          // C4.2 — le mot de la veille (20260928075453)
          mot_de_la_veille?: string
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
      purges_par_cohorte: {
        Row: {
          comptes: number
          etape: string
          rappels_au_depart: string
          semaine_d_arrivee: string
          semaines_tenues: string
        }
        Insert: {
          comptes: number
          etape: string
          rappels_au_depart: string
          semaine_d_arrivee: string
          semaines_tenues: string
        }
        Update: {
          comptes?: number
          etape?: string
          rappels_au_depart?: string
          semaine_d_arrivee?: string
          semaines_tenues?: string
        }
        Relationships: []
      }
      push_tokens: {
        Row: {
          created_at: string
          derniere_reprise_le: string | null
          disabled_at: string | null
          disabled_reason: string | null
          last_seen_at: string
          platform: string
          proprietaire_precedent: string | null
          reprises: number
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          derniere_reprise_le?: string | null
          disabled_at?: string | null
          disabled_reason?: string | null
          last_seen_at?: string
          platform: string
          proprietaire_precedent?: string | null
          reprises?: number
          token: string
          user_id: string
        }
        Update: {
          created_at?: string
          derniere_reprise_le?: string | null
          disabled_at?: string | null
          disabled_reason?: string | null
          last_seen_at?: string
          platform?: string
          proprietaire_precedent?: string | null
          reprises?: number
          token?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_tokens_proprietaire_precedent_fkey"
            columns: ["proprietaire_precedent"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
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
          // C4.2 — le mot de la veille (20260928075453)
          genre: string
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
          // C4.2 — le mot de la veille (20260928075453)
          genre?: string
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
          // C4.2 — le mot de la veille (20260928075453)
          genre?: string
          id?: string
          ran_at?: string
          status?: string
          traites?: number
        }
        Relationships: []
      }
      suppressions_de_compte_par_mois: {
        Row: {
          mois: string
          suppressions: number
        }
        Insert: {
          mois: string
          suppressions: number
        }
        Update: {
          mois?: string
          suppressions?: number
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
      // v1-34 — l'accès déduit de la réponse aux transports (20261002231530), serveur seulement
      acces_deduit: { Args: { p_transports: string[] }; Returns: string }
      a_des_voyages_declares: {
        Args: {
          p_reponses: Database["public"]["Tables"]["assessment_answers"]["Row"]
        }
        Returns: boolean
      }
      action_engagee_de_la_periode: {
        Args: { p_period_start: string; p_poste: string; p_user_id: string }
        Returns: {
          action_text: string
          intention_days: number[]
          intention_timing: string
          // C4.2 — le mot de la veille (20260928075453)
          plan_action_id: string
          question_template: string
        }[]
      }
      // L'alerte d'exploitation (20261002203259)
      alerte_a_dire: {
        Args: { p_rappels_bloques_vus: number; p_releve: Json }
        Returns: boolean
      }
      // La passe avant le lancement (20261005170000) : ce qui passe le plafond de l'alerte
      alerte_du_serveur: {
        Args: { p_rappels_bloques_vus: number; p_releve: Json }
        Returns: boolean
      }
      archiver_engagement: {
        Args: {
          p_action_template_id: string
          p_committed_at: string
          p_intention_days: number[]
          p_intention_timing: string
          p_plan_cycle_id: string
          p_raison: string
          p_user_id: string
        }
        Returns: undefined
      }
      archiver_engagement_de_laction: {
        Args: { p_plan_action_id: string; p_raison: string }
        Returns: undefined
      }
      // Lot 6 — les vues de l'administration (20260929210541)
      // La passe avant le lancement (20261005170000) : l'autorisation du captcha avant un rattachement
      autoriser_le_rattachement: { Args: { p_jeton: string }; Returns: boolean }
      // …et le hook `before_user_created`, serveur seulement
      avant_la_creation_d_un_compte: { Args: { event: Json }; Returns: Json }
      boucle_de_la_personne: { Args: { p_user_id: string }; Returns: string }
      // La carte d'attente sait si une boucle tourne (20260930105923)
      boucles_du_dernier_bilan: {
        Args: { p_user_id?: string }
        Returns: { assessment_id: string; loop_type: string; user_id: string }[]
      }
      // C4.2 — le mot de la veille (20260928075453)
      canal_android: { Args: { p_genre: string }; Returns: string }
      check_intention_days: { Args: { p_days: number[] }; Returns: boolean }
      check_usage_event_props: { Args: { p_props: Json }; Returns: boolean }
      checkin_question: {
        Args: {
          p_intention_days?: number[]
          p_loop_type: string
          p_mode: string
          p_period_start: string
          p_poste: string
          p_question_kind: string
          p_question_template?: string
        }
        Returns: string
      }
      clear_plan_action_commitment: {
        Args: { p_plan_action_id: string }
        Returns: undefined
      }
      cohorte_de: {
        Args: { p_user_id: string }
        Returns: {
          etape: string
          rappels_au_depart: string
          semaine_d_arrivee: string
          semaines_tenues: string
        }[]
      }
      collect_push_receipts: { Args: never; Returns: undefined }
      commit_plan_action: {
        Args: {
          p_days?: number[]
          p_plan_action_id: string
          p_replace?: boolean
          p_timing?: string
        }
        Returns: undefined
      }
      complement_de_maintien: { Args: { p_mode: string }; Returns: string }
      compute_assessment_results: {
        Args: { p_assessment_id: string }
        Returns: undefined
      }
      delete_my_account: { Args: never; Returns: undefined }
      dernier_signe_de_vie: {
        Args: { p_loop_type: string; p_user_id: string }
        Returns: string
      }
      desinscrire_des_rappels: { Args: { p_jeton: string }; Returns: boolean }
      emission_factor: {
        Args: { p_mode_id: string; p_on_date: string }
        Returns: number
      }
      // C4.2 — le mot de la veille (20260928075453)
      engagement_de_la_veille: {
        Args: { p_aujourdhui: string; p_user_id: string }
        Returns: {
          dernier_soir: string
          intention_days: number[]
          phrase: string
        }[]
      }
      enqueue_checkin_reminders: { Args: never; Returns: undefined }
      // La passe avant le lancement (20261005170000) : l'appel à Expo, à part pour qu'un test le remplace
      envoyer_a_expo: {
        Args: { p_expo_token: string; p_messages: Json }
        Returns: unknown
      }
      envoyer_l_e_mail_d_auth: { Args: { event: Json }; Returns: Json }
      // C4.2 — le mot de la veille (20260928075453)
      envoyer_les_notifications: { Args: { p_genre: string }; Returns: number }
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
      // C4.2 — le mot de la veille (20260928075453)
      fenetre_du_mot_de_la_veille: {
        Args: never
        Returns: {
          action_de_trajet: boolean
          dernier_soir: string
        }[]
      }
      // Le passage des codes par Brevo (20261005125029)
      fournisseur_d_e_mail_d_auth: { Args: never; Returns: Record<string, unknown> }
      gabarit_d_e_mail_d_auth: {
        Args: { p_type: string }
        Returns: Record<string, unknown>
      }
      generate_commute_checkins: { Args: never; Returns: undefined }
      generate_extras_checkins: { Args: never; Returns: undefined }
      generate_plan_cycle_for_user: {
        Args: { p_cause?: string; p_user_id: string }
        Returns: undefined
      }
      generate_plan_cycles: { Args: never; Returns: undefined }
      jours_francais: { Args: { p_days: number[] }; Returns: string }
      le_soir_du_mot_est_venu: {
        Args: { p_maintenant: string }
        Returns: boolean
      }
      // Les boucles à venir, une par une (20260930131841) — remplace ma_boucle_a_venir
      mes_boucles_a_venir: { Args: never; Returns: string[] }
      // v1-34 : la réponse aux transports à la place de l'accès (20261002231530)
      mettre_a_jour_le_contexte: {
        Args: {
          p_household_vehicles: string
          p_teletravail: string | null
          p_transports_proches: string[]
          p_zone_type: string
        }
        Returns: undefined
      }
      // C4.2 — le mot de la veille (20260928075453)
      mettre_en_file_les_mots_de_la_veille: {
        Args: { p_aujourdhui?: string }
        Returns: number
      }
      mois_francais: { Args: { d: string }; Returns: string }
      periode_precedente: {
        Args: { p_loop_type: string; p_period_start: string }
        Returns: string
      }
      poste_inserable: {
        Args: { p_loop_type?: string; p_poste: string }
        Returns: string
      }
      purge_notification_outbox: { Args: never; Returns: undefined }
      purge_stale_anonymous_accounts: { Args: never; Returns: undefined }
      purge_usage_events: { Args: never; Returns: undefined }
      recompute_assessment_results: {
        Args: { p_assessment_id: string }
        Returns: undefined
      }
      regime_de_rappel: {
        Args: { p_loop_type: string; p_user_id: string }
        Returns: string
      }
      // L'alerte d'exploitation (20261002203259)
      releve_des_alertes: { Args: { p_depuis: string }; Returns: Json }
      register_push_token: {
        Args: { p_platform: string; p_token: string }
        Returns: undefined
      }
      reminder_channel_for: { Args: { p_user_id: string }; Returns: string }
      rendre_l_e_mail_d_auth: {
        Args: { p_adresse: string; p_code: string; p_type: string }
        Returns: Record<string, unknown>
      }
      replier_rappel_sur_email: {
        Args: { p_outbox_id: string; p_raison: string }
        Returns: undefined
      }
      repondre_au_checkin: {
        Args: { p_checkin_id: string; p_reponse: string }
        Returns: number
      }
      requete_d_e_mail_d_auth: {
        Args: {
          p_adresse: string
          p_fournisseur: string
          p_html: string
          p_secret: string
          p_sujet: string
        }
        Returns: unknown
      }
      resolve_car_mode: {
        Args: { p_engine: string; p_mode_id: string }
        Returns: string
      }
      resolve_mode: {
        Args: {
          p_car_engine: string
          p_mode_id: string
          p_train_type: string
          p_two_wheeler_type: string
          p_velo_type: string
        }
        Returns: string
      }
      resolve_train_mode: {
        Args: { p_mode_id: string; p_type: string }
        Returns: string
      }
      resolve_two_wheeler_mode: {
        Args: { p_mode_id: string; p_type: string }
        Returns: string
      }
      resolve_velo_mode: {
        Args: { p_mode_id: string; p_type: string }
        Returns: string
      }
      retirer_le_bilan: { Args: { p_assessment_id: string }; Returns: number }
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
      // L'alerte d'exploitation (20261002203259)
      texte_de_l_alerte: {
        Args: { p_depuis: string; p_rappels_bloques_vus: number; p_releve: Json }
        Returns: string
      }
      tranche_de_semaines_tenues: {
        Args: { p_semaines: number }
        Returns: string
      }
      // v1-34 — la forme rangée de la réponse aux transports (20261002231530), serveur seulement
      transports_ranges: { Args: { p_transports: string[] }; Returns: string[] }
      unregister_push_token: { Args: { p_token: string }; Returns: undefined }
      // L'alerte d'exploitation (20261002203259)
      // La passe avant le lancement (20261005170000) : la vérification auprès de Cloudflare, serveur seulement
      verifier_le_jeton_du_captcha: {
        Args: { p_jeton: string; p_secret: string }
        Returns: boolean
      }
      verifier_les_alertes: { Args: never; Returns: string }
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
