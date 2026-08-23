// Généré depuis le schéma Supabase réel (projet TraceVerte-v1) via
// mcp__Supabase__generate_typescript_types. À régénérer après toute migration
// (supabase/migrations/) pour rester synchronisé avec la base.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '14.15';
  };
  public: {
    Tables: {
      assessment_results: {
        Row: {
          assessment_id: string;
          computed_at: string;
          dominant_trip_id: string;
          id: string;
          total_co2_kg_year: number;
        };
        Insert: {
          assessment_id: string;
          computed_at?: string;
          dominant_trip_id: string;
          id?: string;
          total_co2_kg_year: number;
        };
        Update: {
          assessment_id?: string;
          computed_at?: string;
          dominant_trip_id?: string;
          id?: string;
          total_co2_kg_year?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'assessment_results_assessment_id_fkey';
            columns: ['assessment_id'];
            isOneToOne: true;
            referencedRelation: 'assessments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'assessment_results_dominant_trip_id_fkey';
            columns: ['dominant_trip_id'];
            isOneToOne: false;
            referencedRelation: 'assessment_trips';
            referencedColumns: ['id'];
          },
        ];
      };
      assessment_trip_modes: {
        Row: {
          assessment_trip_id: string;
          id: string;
          share_percent: number;
          transport_mode_id: string;
        };
        Insert: {
          assessment_trip_id: string;
          id?: string;
          share_percent?: number;
          transport_mode_id: string;
        };
        Update: {
          assessment_trip_id?: string;
          id?: string;
          share_percent?: number;
          transport_mode_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'assessment_trip_modes_assessment_trip_id_fkey';
            columns: ['assessment_trip_id'];
            isOneToOne: false;
            referencedRelation: 'assessment_trips';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'assessment_trip_modes_transport_mode_id_fkey';
            columns: ['transport_mode_id'];
            isOneToOne: false;
            referencedRelation: 'transport_modes';
            referencedColumns: ['id'];
          },
        ];
      };
      assessment_trips: {
        Row: {
          assessment_id: string;
          distance_km: number;
          frequency_unit: string;
          frequency_value: number;
          id: string;
          label: string | null;
          trip_scope: string | null;
          trip_type: string;
        };
        Insert: {
          assessment_id: string;
          distance_km: number;
          frequency_unit: string;
          frequency_value: number;
          id?: string;
          label?: string | null;
          trip_scope?: string | null;
          trip_type: string;
        };
        Update: {
          assessment_id?: string;
          distance_km?: number;
          frequency_unit?: string;
          frequency_value?: number;
          id?: string;
          label?: string | null;
          trip_scope?: string | null;
          trip_type?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'assessment_trips_assessment_id_fkey';
            columns: ['assessment_id'];
            isOneToOne: false;
            referencedRelation: 'assessments';
            referencedColumns: ['id'];
          },
        ];
      };
      assessments: {
        Row: {
          created_at: string;
          id: string;
          status: string;
          submitted_at: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          status?: string;
          submitted_at?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          status?: string;
          submitted_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'assessments_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      emission_factors: {
        Row: {
          id: string;
          kg_co2_per_km: number;
          source: string;
          source_ref: string | null;
          transport_mode_id: string;
          valid_from: string;
        };
        Insert: {
          id?: string;
          kg_co2_per_km: number;
          source?: string;
          source_ref?: string | null;
          transport_mode_id: string;
          valid_from: string;
        };
        Update: {
          id?: string;
          kg_co2_per_km?: number;
          source?: string;
          source_ref?: string | null;
          transport_mode_id?: string;
          valid_from?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'emission_factors_transport_mode_id_fkey';
            columns: ['transport_mode_id'];
            isOneToOne: false;
            referencedRelation: 'transport_modes';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          cadence_type: string;
          created_at: string;
          id: string;
          onboarding_completed_at: string | null;
          tc_access: string | null;
          zone_type: string | null;
        };
        Insert: {
          cadence_type?: string;
          created_at?: string;
          id: string;
          onboarding_completed_at?: string | null;
          tc_access?: string | null;
          zone_type?: string | null;
        };
        Update: {
          cadence_type?: string;
          created_at?: string;
          id?: string;
          onboarding_completed_at?: string | null;
          tc_access?: string | null;
          zone_type?: string | null;
        };
        Relationships: [];
      };
      transport_modes: {
        Row: {
          category: string;
          id: string;
          label: string;
        };
        Insert: {
          category: string;
          id: string;
          label: string;
        };
        Update: {
          category?: string;
          id?: string;
          label?: string;
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;
type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends { Insert: infer I }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends { Update: infer U }
      ? U
      : never
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
