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
      collector_permissions: {
        Row: {
          can_calculate: boolean
          can_export: boolean
          can_manage: boolean
          can_view: boolean
          employee_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          can_calculate?: boolean
          can_export?: boolean
          can_manage?: boolean
          can_view?: boolean
          employee_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          can_calculate?: boolean
          can_export?: boolean
          can_manage?: boolean
          can_view?: boolean
          employee_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      contact_logs: {
        Row: {
          channel: string | null
          created_at: string
          created_by: string | null
          customer_key: string
          id: string
          note: string | null
        }
        Insert: {
          channel?: string | null
          created_at?: string
          created_by?: string | null
          customer_key: string
          id?: string
          note?: string | null
        }
        Update: {
          channel?: string | null
          created_at?: string
          created_by?: string | null
          customer_key?: string
          id?: string
          note?: string | null
        }
        Relationships: []
      }
      customer_notes: {
        Row: {
          created_at: string
          created_by: string | null
          customer_key: string
          id: string
          text: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_key: string
          id?: string
          text: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_key?: string
          id?: string
          text?: string
        }
        Relationships: []
      }
      customer_states: {
        Row: {
          client_status: string | null
          contacted: boolean | null
          customer_key: string
          default_date: string | null
          edits: Json | null
          has_exemption: boolean | null
          has_reschedule: boolean | null
          last_contacted_at: string | null
          notes: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          client_status?: string | null
          contacted?: boolean | null
          customer_key: string
          default_date?: string | null
          edits?: Json | null
          has_exemption?: boolean | null
          has_reschedule?: boolean | null
          last_contacted_at?: string | null
          notes?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          client_status?: string | null
          contacted?: boolean | null
          customer_key?: string
          default_date?: string | null
          edits?: Json | null
          has_exemption?: boolean | null
          has_reschedule?: boolean | null
          last_contacted_at?: string | null
          notes?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      customers: {
        Row: {
          account_number: string | null
          action: string | null
          agent_employee_id: string | null
          amount: number | null
          customer_key: string
          customer_name: string | null
          debt_age: string | null
          file_month: string | null
          id: string
          imported_at: string
          imported_by: string | null
          installment: string | null
          is_deceased: boolean | null
          is_salary: boolean | null
          national_id: string | null
          phone: string | null
          product: string | null
          raw: Json | null
        }
        Insert: {
          account_number?: string | null
          action?: string | null
          agent_employee_id?: string | null
          amount?: number | null
          customer_key: string
          customer_name?: string | null
          debt_age?: string | null
          file_month?: string | null
          id?: string
          imported_at?: string
          imported_by?: string | null
          installment?: string | null
          is_deceased?: boolean | null
          is_salary?: boolean | null
          national_id?: string | null
          phone?: string | null
          product?: string | null
          raw?: Json | null
        }
        Update: {
          account_number?: string | null
          action?: string | null
          agent_employee_id?: string | null
          amount?: number | null
          customer_key?: string
          customer_name?: string | null
          debt_age?: string | null
          file_month?: string | null
          id?: string
          imported_at?: string
          imported_by?: string | null
          installment?: string | null
          is_deceased?: boolean | null
          is_salary?: boolean | null
          national_id?: string | null
          phone?: string | null
          product?: string | null
          raw?: Json | null
        }
        Relationships: []
      }
      group_members: {
        Row: {
          added_at: string
          employee_id: string
        }
        Insert: {
          added_at?: string
          employee_id: string
        }
        Update: {
          added_at?: string
          employee_id?: string
        }
        Relationships: []
      }
      wallet_backups: {
        Row: {
          account_count: number
          contact_logs_data: Json
          created_at: string
          created_by: string | null
          customer_notes_data: Json
          customer_states_data: Json
          customers_data: Json
          id: string
          total_amount: number
        }
        Insert: {
          account_count?: number
          contact_logs_data?: Json
          created_at?: string
          created_by?: string | null
          customer_notes_data?: Json
          customer_states_data?: Json
          customers_data?: Json
          id?: string
          total_amount?: number
        }
        Update: {
          account_count?: number
          contact_logs_data?: Json
          created_at?: string
          created_by?: string | null
          customer_notes_data?: Json
          customer_states_data?: Json
          customers_data?: Json
          id?: string
          total_amount?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_wallet_backup: { Args: { _created_by: string }; Returns: string }
      restore_wallet_backup: {
        Args: { _backup_id: string }
        Returns: undefined
      }
      truncate_wallet_tables: { Args: never; Returns: undefined }
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
