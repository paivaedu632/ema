export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      documents: {
        Row: {
          created_at: string | null
          document_type: string
          file_name: string
          file_size: number | null
          id: string
          kyc_record_id: string | null
          mime_type: string | null
          s3_bucket: string
          s3_key: string
          updated_at: string | null
          user_id: string | null
          verification_results: Json | null
          verification_status: string | null
        }
        Insert: {
          created_at?: string | null
          document_type: string
          file_name: string
          file_size?: number | null
          id?: string
          kyc_record_id?: string | null
          mime_type?: string | null
          s3_bucket: string
          s3_key: string
          updated_at?: string | null
          user_id?: string | null
          verification_results?: Json | null
          verification_status?: string | null
        }
        Update: {
          created_at?: string | null
          document_type?: string
          file_name?: string
          file_size?: number | null
          id?: string
          kyc_record_id?: string | null
          mime_type?: string | null
          s3_bucket?: string
          s3_key?: string
          updated_at?: string | null
          user_id?: string | null
          verification_results?: Json | null
          verification_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_kyc_record_id_fkey"
            columns: ["kyc_record_id"]
            isOneToOne: false
            referencedRelation: "kyc_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      exchange_rates: {
        Row: {
          created_at: string | null
          from_currency: string
          id: string
          is_active: boolean | null
          rate: number
          rate_type: string
          to_currency: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          from_currency: string
          id?: string
          is_active?: boolean | null
          rate: number
          rate_type: string
          to_currency: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          from_currency?: string
          id?: string
          is_active?: boolean | null
          rate?: number
          rate_type?: string
          to_currency?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      kyc_records: {
        Row: {
          created_at: string | null
          current_step: number | null
          data: Json
          documents: Json | null
          id: string
          status: string
          updated_at: string | null
          user_id: string | null
          verification_results: Json | null
        }
        Insert: {
          created_at?: string | null
          current_step?: number | null
          data?: Json
          documents?: Json | null
          id?: string
          status?: string
          updated_at?: string | null
          user_id?: string | null
          verification_results?: Json | null
        }
        Update: {
          created_at?: string | null
          current_step?: number | null
          data?: Json
          documents?: Json | null
          id?: string
          status?: string
          updated_at?: string | null
          user_id?: string | null
          verification_results?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "kyc_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          created_at: string | null
          currency: string
          exchange_rate: number | null
          fee_amount: number
          id: string
          metadata: Json | null
          net_amount: number
          recipient_info: Json | null
          reference_id: string | null
          status: string
          type: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency: string
          exchange_rate?: number | null
          fee_amount?: number
          id?: string
          metadata?: Json | null
          net_amount: number
          recipient_info?: Json | null
          reference_id?: string | null
          status?: string
          type: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string
          exchange_rate?: number | null
          fee_amount?: number
          id?: string
          metadata?: Json | null
          net_amount?: number
          recipient_info?: Json | null
          reference_id?: string | null
          status?: string
          type?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          clerk_user_id: string
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          phone_number: string | null
          profile_image_url: string | null
          updated_at: string | null
          kyc_status: string | null
          kyc_current_step: number | null
          kyc_completion_percentage: number | null
          kyc_last_updated: string | null
        }
        Insert: {
          clerk_user_id: string
          created_at?: string | null
          email: string
          full_name?: string | null
          id?: string
          phone_number?: string | null
          profile_image_url?: string | null
          updated_at?: string | null
          kyc_status?: string | null
          kyc_current_step?: number | null
          kyc_completion_percentage?: number | null
          kyc_last_updated?: string | null
        }
        Update: {
          clerk_user_id?: string
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          phone_number?: string | null
          profile_image_url?: string | null
          updated_at?: string | null
          kyc_status?: string | null
          kyc_current_step?: number | null
          kyc_completion_percentage?: number | null
          kyc_last_updated?: string | null
        }
        Relationships: []
      }
      wallets: {
        Row: {
          available_balance: number
          balance: number
          created_at: string | null
          currency: string
          id: string
          pending_balance: number
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          available_balance?: number
          balance?: number
          created_at?: string | null
          currency: string
          id?: string
          pending_balance?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          available_balance?: number
          balance?: number
          created_at?: string | null
          currency?: string
          id?: string
          pending_balance?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wallets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_limits: {
        Row: {
          id: string
          user_id: string | null
          daily_limit_pre_kyc: number | null
          monthly_limit_pre_kyc: number | null
          transaction_limit_pre_kyc: number | null
          daily_limit_post_kyc: number | null
          monthly_limit_post_kyc: number | null
          transaction_limit_post_kyc: number | null
          current_daily_limit: number | null
          current_monthly_limit: number | null
          current_transaction_limit: number | null
          daily_used: number | null
          monthly_used: number | null
          last_reset_date: string | null
          currency: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          daily_limit_pre_kyc?: number | null
          monthly_limit_pre_kyc?: number | null
          transaction_limit_pre_kyc?: number | null
          daily_limit_post_kyc?: number | null
          monthly_limit_post_kyc?: number | null
          transaction_limit_post_kyc?: number | null
          current_daily_limit?: number | null
          current_monthly_limit?: number | null
          current_transaction_limit?: number | null
          daily_used?: number | null
          monthly_used?: number | null
          last_reset_date?: string | null
          currency?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          daily_limit_pre_kyc?: number | null
          monthly_limit_pre_kyc?: number | null
          transaction_limit_pre_kyc?: number | null
          daily_limit_post_kyc?: number | null
          monthly_limit_post_kyc?: number | null
          transaction_limit_post_kyc?: number | null
          current_daily_limit?: number | null
          current_monthly_limit?: number | null
          current_transaction_limit?: number | null
          daily_used?: number | null
          monthly_used?: number | null
          last_reset_date?: string | null
          currency?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_limits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      user_dashboard_data: {
        Row: {
          id: string | null
          clerk_user_id: string | null
          email: string | null
          full_name: string | null
          phone_number: string | null
          profile_image_url: string | null
          kyc_status: string | null
          kyc_current_step: number | null
          kyc_completion_percentage: number | null
          kyc_last_updated: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string | null
          clerk_user_id?: string | null
          email?: string | null
          full_name?: string | null
          phone_number?: string | null
          profile_image_url?: string | null
          kyc_status?: string | null
          kyc_current_step?: number | null
          kyc_completion_percentage?: number | null
          kyc_last_updated?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string | null
          clerk_user_id?: string | null
          email?: string | null
          full_name?: string | null
          phone_number?: string | null
          profile_image_url?: string | null
          kyc_status?: string | null
          kyc_current_step?: number | null
          kyc_completion_percentage?: number | null
          kyc_last_updated?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      user_limits_data: {
        Row: {
          id: string | null
          user_id: string | null
          current_daily_limit: number | null
          current_monthly_limit: number | null
          current_transaction_limit: number | null
          daily_used: number | null
          monthly_used: number | null
          daily_remaining: number | null
          monthly_remaining: number | null
          currency: string | null
          last_reset_date: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string | null
          user_id?: string | null
          current_daily_limit?: number | null
          current_monthly_limit?: number | null
          current_transaction_limit?: number | null
          daily_used?: number | null
          monthly_used?: number | null
          daily_remaining?: number | null
          monthly_remaining?: number | null
          currency?: string | null
          last_reset_date?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string | null
          user_id?: string | null
          current_daily_limit?: number | null
          current_monthly_limit?: number | null
          current_transaction_limit?: number | null
          daily_used?: number | null
          monthly_used?: number | null
          daily_remaining?: number | null
          monthly_remaining?: number | null
          currency?: string | null
          last_reset_date?: string | null
          updated_at?: string | null
        }
      }
    }
    Functions: {
      get_active_exchange_rate: {
        Args: { from_curr: string; to_curr: string }
        Returns: number
      }
      get_current_user_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_user_available_balance: {
        Args: { user_uuid: string; currency_code: string }
        Returns: number
      }
      get_user_balance: {
        Args: { user_uuid: string; currency_code: string }
        Returns: number
      }
      user_owns_resource: {
        Args: { resource_user_id: string }
        Returns: boolean
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
