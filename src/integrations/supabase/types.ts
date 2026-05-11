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
      call_reports: {
        Row: {
          attachment_url: string | null
          call_date: string
          call_time: string
          created_at: string
          customer_id: string | null
          daily_allowance: number | null
          discussion: string | null
          id: string
          kilometers_travelled: number | null
          location: string | null
          lodging_expense: number | null
          meeting_outcome: string | null
          meeting_type: Database["public"]["Enums"]["meeting_type"]
          next_follow_up: string | null
          order_status: Database["public"]["Enums"]["order_status"]
          other_expense: number | null
          other_expense_note: string | null
          product_discussed: string | null
          ta_per_km: number | null
          travel_fare: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          attachment_url?: string | null
          call_date?: string
          call_time?: string
          created_at?: string
          customer_id?: string | null
          daily_allowance?: number | null
          discussion?: string | null
          id?: string
          kilometers_travelled?: number | null
          location?: string | null
          lodging_expense?: number | null
          meeting_outcome?: string | null
          meeting_type: Database["public"]["Enums"]["meeting_type"]
          next_follow_up?: string | null
          order_status?: Database["public"]["Enums"]["order_status"]
          other_expense?: number | null
          other_expense_note?: string | null
          product_discussed?: string | null
          ta_per_km?: number | null
          travel_fare?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          attachment_url?: string | null
          call_date?: string
          call_time?: string
          created_at?: string
          customer_id?: string | null
          daily_allowance?: number | null
          discussion?: string | null
          id?: string
          kilometers_travelled?: number | null
          location?: string | null
          lodging_expense?: number | null
          meeting_outcome?: string | null
          meeting_type?: Database["public"]["Enums"]["meeting_type"]
          next_follow_up?: string | null
          order_status?: Database["public"]["Enums"]["order_status"]
          other_expense?: number | null
          other_expense_note?: string | null
          product_discussed?: string | null
          ta_per_km?: number | null
          travel_fare?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_reports_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          city: string | null
          company_name: string | null
          contact_person: string | null
          created_at: string
          created_by: string
          customer_name: string
          customer_type: string | null
          email: string | null
          id: string
          industry_segment: string | null
          mobile: string | null
          notes: string | null
          state: string | null
          status: Database["public"]["Enums"]["customer_status"]
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          company_name?: string | null
          contact_person?: string | null
          created_at?: string
          created_by: string
          customer_name: string
          customer_type?: string | null
          email?: string | null
          id?: string
          industry_segment?: string | null
          mobile?: string | null
          notes?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["customer_status"]
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          company_name?: string | null
          contact_person?: string | null
          created_at?: string
          created_by?: string
          customer_name?: string
          customer_type?: string | null
          email?: string | null
          id?: string
          industry_segment?: string | null
          mobile?: string | null
          notes?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["customer_status"]
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string
          full_name?: string
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      travelling_expenses: {
        Row: {
          created_at: string
          daily_allowance: number
          details: string | null
          expense_date: string
          id: string
          kilometers_travelled: number
          lodging_expense: number
          notes: string | null
          other_expense: number
          other_expense_note: string | null
          other_expenses_items: Json
          ta_per_km: number
          travel_fare: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          daily_allowance?: number
          details?: string | null
          expense_date?: string
          id?: string
          kilometers_travelled?: number
          lodging_expense?: number
          notes?: string | null
          other_expense?: number
          other_expense_note?: string | null
          other_expenses_items?: Json
          ta_per_km?: number
          travel_fare?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          daily_allowance?: number
          details?: string | null
          expense_date?: string
          id?: string
          kilometers_travelled?: number
          lodging_expense?: number
          notes?: string | null
          other_expense?: number
          other_expense_note?: string | null
          other_expenses_items?: Json
          ta_per_km?: number
          travel_fare?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      app_role: "admin" | "employee"
      customer_status: "Active" | "Inactive"
      meeting_type:
        | "Physical Meeting"
        | "Phone Call"
        | "Video Call"
        | "Follow-up"
      order_status:
        | "Interested"
        | "Trial Required"
        | "Follow-up Needed"
        | "Order Confirmed"
        | "No Response"
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
      app_role: ["admin", "employee"],
      customer_status: ["Active", "Inactive"],
      meeting_type: [
        "Physical Meeting",
        "Phone Call",
        "Video Call",
        "Follow-up",
      ],
      order_status: [
        "Interested",
        "Trial Required",
        "Follow-up Needed",
        "Order Confirmed",
        "No Response",
      ],
    },
  },
} as const
