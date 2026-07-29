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
      agents: {
        Row: {
          created_at: string
          deleted_in_retell: boolean
          error_message: string | null
          id: string
          language: string
          llm: string | null
          metadata: Json | null
          name: string
          phone_number: string | null
          prompt: string | null
          retell_agent_id: string | null
          retell_agent_version: number | null
          retell_llm_id: string | null
          retell_voice_id: string | null
          status: string
          updated_at: string
          user_id: string | null
          voice: string | null
        }
        Insert: {
          created_at?: string
          deleted_in_retell?: boolean
          error_message?: string | null
          id?: string
          language?: string
          llm?: string | null
          metadata?: Json | null
          name: string
          phone_number?: string | null
          prompt?: string | null
          retell_agent_id?: string | null
          retell_agent_version?: number | null
          retell_llm_id?: string | null
          retell_voice_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
          voice?: string | null
        }
        Update: {
          created_at?: string
          deleted_in_retell?: boolean
          error_message?: string | null
          id?: string
          language?: string
          llm?: string | null
          metadata?: Json | null
          name?: string
          phone_number?: string | null
          prompt?: string | null
          retell_agent_id?: string | null
          retell_agent_version?: number | null
          retell_llm_id?: string | null
          retell_voice_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
          voice?: string | null
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          detail: Json | null
          id: string
          target: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          detail?: Json | null
          id?: string
          target?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          detail?: Json | null
          id?: string
          target?: string | null
        }
        Relationships: []
      }
      billing_accounts: {
        Row: {
          created_at: string
          credits: number
          id: string
          plan_tier: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_status: string | null
          trial_ends_at: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          credits?: number
          id?: string
          plan_tier?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          trial_ends_at?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          credits?: number
          id?: string
          plan_tier?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          trial_ends_at?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      calls: {
        Row: {
          agent_id: string | null
          agent_name: string | null
          call_successful: boolean | null
          call_type: string
          campaign_id: string | null
          cost_cents: number | null
          created_at: string
          direction: string
          duration_ms: number | null
          ended_at: string | null
          error_message: string | null
          from_number: string | null
          has_transcript: boolean
          id: string
          lead_name: string | null
          metadata: Json | null
          recording_url: string | null
          retell_call_id: string | null
          started_at: string | null
          status: string
          summary: string | null
          to_number: string | null
          transcript: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          agent_id?: string | null
          agent_name?: string | null
          call_successful?: boolean | null
          call_type?: string
          campaign_id?: string | null
          cost_cents?: number | null
          created_at?: string
          direction?: string
          duration_ms?: number | null
          ended_at?: string | null
          error_message?: string | null
          from_number?: string | null
          has_transcript?: boolean
          id?: string
          lead_name?: string | null
          metadata?: Json | null
          recording_url?: string | null
          retell_call_id?: string | null
          started_at?: string | null
          status?: string
          summary?: string | null
          to_number?: string | null
          transcript?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          agent_id?: string | null
          agent_name?: string | null
          call_successful?: boolean | null
          call_type?: string
          campaign_id?: string | null
          cost_cents?: number | null
          created_at?: string
          direction?: string
          duration_ms?: number | null
          ended_at?: string | null
          error_message?: string | null
          from_number?: string | null
          has_transcript?: boolean
          id?: string
          lead_name?: string | null
          metadata?: Json | null
          recording_url?: string | null
          retell_call_id?: string | null
          started_at?: string | null
          status?: string
          summary?: string | null
          to_number?: string | null
          transcript?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calls_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["campaign_id"]
          },
        ]
      }
      campaigns: {
        Row: {
          agent_id: string | null
          called_leads: number
          calls_completed: number
          campaign_id: string
          concurrency: number
          country_code: string | null
          created_at: string
          error_message: string | null
          failed_calls: number
          finished_at: string | null
          interested_description: string | null
          leads: Json | null
          max_attempts: number
          name: string
          not_interested_description: string | null
          notes: string | null
          paused_reason: string | null
          phone_number_id: string | null
          retell_batch_call_id: string | null
          retry_delay_minutes: number
          scheduled_at: string | null
          status: string
          timezone: string | null
          total_leads: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          agent_id?: string | null
          called_leads?: number
          calls_completed?: number
          campaign_id?: string
          concurrency?: number
          country_code?: string | null
          created_at?: string
          error_message?: string | null
          failed_calls?: number
          finished_at?: string | null
          interested_description?: string | null
          leads?: Json | null
          max_attempts?: number
          name: string
          not_interested_description?: string | null
          notes?: string | null
          paused_reason?: string | null
          phone_number_id?: string | null
          retell_batch_call_id?: string | null
          retry_delay_minutes?: number
          scheduled_at?: string | null
          status?: string
          timezone?: string | null
          total_leads?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          agent_id?: string | null
          called_leads?: number
          calls_completed?: number
          campaign_id?: string
          concurrency?: number
          country_code?: string | null
          created_at?: string
          error_message?: string | null
          failed_calls?: number
          finished_at?: string | null
          interested_description?: string | null
          leads?: Json | null
          max_attempts?: number
          name?: string
          not_interested_description?: string | null
          notes?: string | null
          paused_reason?: string | null
          phone_number_id?: string | null
          retell_batch_call_id?: string | null
          retry_delay_minutes?: number
          scheduled_at?: string | null
          status?: string
          timezone?: string | null
          total_leads?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_phone_number_id_fkey"
            columns: ["phone_number_id"]
            isOneToOne: false
            referencedRelation: "phone_numbers"
            referencedColumns: ["id"]
          },
        ]
      }
      consent_log: {
        Row: {
          campaign_id: string | null
          consent_basis: string
          created_at: string
          id: string
          lead_id: string | null
          phone: string | null
          user_id: string | null
        }
        Insert: {
          campaign_id?: string | null
          consent_basis?: string
          created_at?: string
          id?: string
          lead_id?: string | null
          phone?: string | null
          user_id?: string | null
        }
        Update: {
          campaign_id?: string | null
          consent_basis?: string
          created_at?: string
          id?: string
          lead_id?: string | null
          phone?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      contact_submissions: {
        Row: {
          company: string | null
          created_at: string
          email: string
          id: string
          message: string
          name: string
          phone: string | null
        }
        Insert: {
          company?: string | null
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          phone?: string | null
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          phone?: string | null
        }
        Relationships: []
      }
      credit_orders: {
        Row: {
          amount_cents: number
          created_at: string
          credits: number
          id: string
          status: string
          stripe_session_id: string | null
          user_id: string | null
        }
        Insert: {
          amount_cents: number
          created_at?: string
          credits: number
          id?: string
          status?: string
          stripe_session_id?: string | null
          user_id?: string | null
        }
        Update: {
          amount_cents?: number
          created_at?: string
          credits?: number
          id?: string
          status?: string
          stripe_session_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      credit_transactions: {
        Row: {
          cost_cents: number | null
          created_at: string
          credits: number | null
          description: string | null
          id: string
          stripe_reference: string | null
          tokens_used: number | null
          type: string
          user_id: string | null
        }
        Insert: {
          cost_cents?: number | null
          created_at?: string
          credits?: number | null
          description?: string | null
          id?: string
          stripe_reference?: string | null
          tokens_used?: number | null
          type: string
          user_id?: string | null
        }
        Update: {
          cost_cents?: number | null
          created_at?: string
          credits?: number | null
          description?: string | null
          id?: string
          stripe_reference?: string | null
          tokens_used?: number | null
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      leads: {
        Row: {
          attempt_count: number
          called_at: string | null
          campaign_id: string | null
          created_at: string
          custom_data: Json
          id: string
          lead_status: string | null
          name: string | null
          next_retry_at: string | null
          phone: string
          retell_call_id: string | null
          sentiment: string | null
          status: string
          summary: string | null
          transcript: string | null
          unresponsive_at: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          attempt_count?: number
          called_at?: string | null
          campaign_id?: string | null
          created_at?: string
          custom_data?: Json
          id?: string
          lead_status?: string | null
          name?: string | null
          next_retry_at?: string | null
          phone: string
          retell_call_id?: string | null
          sentiment?: string | null
          status?: string
          summary?: string | null
          transcript?: string | null
          unresponsive_at?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          attempt_count?: number
          called_at?: string | null
          campaign_id?: string | null
          created_at?: string
          custom_data?: Json
          id?: string
          lead_status?: string | null
          name?: string | null
          next_retry_at?: string | null
          phone?: string
          retell_call_id?: string | null
          sentiment?: string | null
          status?: string
          summary?: string | null
          transcript?: string | null
          unresponsive_at?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["campaign_id"]
          },
        ]
      }
      notification_settings: {
        Row: {
          callback_requested: boolean
          created_at: string
          enable_email: boolean
          id: string
          interested_lead: boolean
          recipient_email: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          callback_requested?: boolean
          created_at?: string
          enable_email?: boolean
          id?: string
          interested_lead?: boolean
          recipient_email?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          callback_requested?: boolean
          created_at?: string
          enable_email?: boolean
          id?: string
          interested_lead?: boolean
          recipient_email?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      phone_numbers: {
        Row: {
          created_at: string
          friendly_name: string | null
          id: string
          linked_agent_id: string | null
          provider: string | null
          retell_phone_number_id: string
          status: string
          twilio_phone_number: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          friendly_name?: string | null
          id?: string
          linked_agent_id?: string | null
          provider?: string | null
          retell_phone_number_id: string
          status?: string
          twilio_phone_number: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          friendly_name?: string | null
          id?: string
          linked_agent_id?: string | null
          provider?: string | null
          retell_phone_number_id?: string
          status?: string
          twilio_phone_number?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "phone_numbers_linked_agent_id_fkey"
            columns: ["linked_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      signup_leads: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string | null
          phone: string | null
          source: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          source?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          source?: string
        }
        Relationships: []
      }
      tenant_members: {
        Row: {
          created_at: string
          email: string | null
          id: string
          role: string
          tenant_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          role?: string
          tenant_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          role?: string
          tenant_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_members_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string
          credit_pool: number
          enabled_countries: string[]
          id: string
          name: string
          owner_id: string | null
          updated_at: string
          white_label: boolean
        }
        Insert: {
          created_at?: string
          credit_pool?: number
          enabled_countries?: string[]
          id?: string
          name: string
          owner_id?: string | null
          updated_at?: string
          white_label?: boolean
        }
        Update: {
          created_at?: string
          credit_pool?: number
          enabled_countries?: string[]
          id?: string
          name?: string
          owner_id?: string | null
          updated_at?: string
          white_label?: boolean
        }
        Relationships: []
      }
      twilio_configurations: {
        Row: {
          account_sid: string | null
          api_key: string | null
          api_secret: string | null
          auth_token: string | null
          created_at: string
          friendly_name: string | null
          id: string
          phone_number: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_sid?: string | null
          api_key?: string | null
          api_secret?: string | null
          auth_token?: string | null
          created_at?: string
          friendly_name?: string | null
          id?: string
          phone_number: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_sid?: string | null
          api_key?: string | null
          api_secret?: string | null
          auth_token?: string | null
          created_at?: string
          friendly_name?: string | null
          id?: string
          phone_number?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      webhook_events: {
        Row: {
          created_at: string
          error_message: string | null
          event_type: string
          id: string
          payload: Json | null
          retell_call_id: string | null
          status: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          event_type: string
          id?: string
          payload?: Json | null
          retell_call_id?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          event_type?: string
          id?: string
          payload?: Json | null
          retell_call_id?: string | null
          status?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      phone_number_link_status: {
        Args: { numbers: string[] }
        Returns: {
          phone_number: string
          agent_id: string
          agent_name: string
          has_active_campaign: boolean
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
