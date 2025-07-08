export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
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
      dynamic_rates: {
        Row: {
          calculated_at: string
          created_at: string
          currency_pair: string
          id: string
          total_volume: number
          transaction_count: number
          updated_at: string
          vwap_rate: number
        }
        Insert: {
          calculated_at?: string
          created_at?: string
          currency_pair: string
          id?: string
          total_volume: number
          transaction_count: number
          updated_at?: string
          vwap_rate: number
        }
        Update: {
          calculated_at?: string
          created_at?: string
          currency_pair?: string
          id?: string
          total_volume?: number
          transaction_count?: number
          updated_at?: string
          vwap_rate?: number
        }
        Relationships: []
      }
      fees: {
        Row: {
          created_at: string | null
          currency: string
          fee_fixed_amount: number | null
          fee_percentage: number
          id: string
          is_active: boolean | null
          transaction_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          currency: string
          fee_fixed_amount?: number | null
          fee_percentage?: number
          id?: string
          is_active?: boolean | null
          transaction_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          currency?: string
          fee_fixed_amount?: number | null
          fee_percentage?: number
          id?: string
          is_active?: boolean | null
          transaction_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      fund_reservations: {
        Row: {
          created_at: string
          currency: string
          id: string
          order_id: string
          released_amount: number
          released_at: string | null
          reserved_amount: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency: string
          id?: string
          order_id: string
          released_amount?: number
          released_at?: string | null
          reserved_amount: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          order_id?: string
          released_amount?: number
          released_at?: string | null
          reserved_amount?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fund_reservations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "order_book"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fund_reservations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      dynamic_rates: {
        Row: {
          calculated_at: string
          created_at: string
          currency_pair: string
          id: string
          total_volume: number
          transaction_count: number
          updated_at: string
          vwap_rate: number
        }
        Insert: {
          calculated_at?: string
          created_at?: string
          currency_pair: string
          id?: string
          total_volume: number
          transaction_count: number
          updated_at?: string
          vwap_rate: number
        }
        Update: {
          calculated_at?: string
          created_at?: string
          currency_pair?: string
          id?: string
          total_volume?: number
          transaction_count?: number
          updated_at?: string
          vwap_rate?: number
        }
        Relationships: []
      }
      fees: {
        Row: {
          created_at: string | null
          currency: string
          fee_fixed_amount: number | null
          fee_percentage: number
          id: string
          is_active: boolean | null
          transaction_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          currency: string
          fee_fixed_amount?: number | null
          fee_percentage?: number
          id?: string
          is_active?: boolean | null
          transaction_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          currency?: string
          fee_fixed_amount?: number | null
          fee_percentage?: number
          id?: string
          is_active?: boolean | null
          transaction_type?: string
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
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          created_at: string
          currency_type: string
          dynamic_rate: boolean
          exchange_rate: number
          id: string
          reserved_amount: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency_type: string
          dynamic_rate?: boolean
          exchange_rate: number
          id?: string
          reserved_amount: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency_type?: string
          dynamic_rate?: boolean
          exchange_rate?: number
          id?: string
          reserved_amount?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "offers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      order_book: {
        Row: {
          average_fill_price: number | null
          base_currency: string
          cancelled_at: string | null
          created_at: string
          filled_at: string | null
          filled_quantity: number
          id: string
          order_type: string
          price: number | null
          quantity: number
          quote_currency: string
          remaining_quantity: number
          reserved_amount: number
          side: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          average_fill_price?: number | null
          base_currency: string
          cancelled_at?: string | null
          created_at?: string
          filled_at?: string | null
          filled_quantity?: number
          id?: string
          order_type: string
          price?: number | null
          quantity: number
          quote_currency: string
          remaining_quantity: number
          reserved_amount: number
          side: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          average_fill_price?: number | null
          base_currency?: string
          cancelled_at?: string | null
          created_at?: string
          filled_at?: string | null
          filled_quantity?: number
          id?: string
          order_type?: string
          price?: number | null
          quantity?: number
          quote_currency?: string
          remaining_quantity?: number
          reserved_amount?: number
          side?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_book_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      trades: {
        Row: {
          base_amount: number
          base_currency: string
          buy_order_id: string
          buyer_fee: number
          buyer_id: string
          created_at: string
          executed_at: string
          id: string
          price: number
          quantity: number
          quote_amount: number
          quote_currency: string
          sell_order_id: string
          seller_fee: number
          seller_id: string
        }
        Insert: {
          base_amount: number
          base_currency: string
          buy_order_id: string
          buyer_fee?: number
          buyer_id: string
          created_at?: string
          executed_at?: string
          id?: string
          price: number
          quantity: number
          quote_amount: number
          quote_currency: string
          sell_order_id: string
          seller_fee?: number
          seller_id: string
        }
        Update: {
          base_amount?: number
          base_currency?: string
          buy_order_id?: string
          buyer_fee?: number
          buyer_id?: string
          created_at?: string
          executed_at?: string
          id?: string
          price?: number
          quantity?: number
          quote_amount?: number
          quote_currency?: string
          sell_order_id?: string
          seller_fee?: number
          seller_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trades_buy_order_id_fkey"
            columns: ["buy_order_id"]
            isOneToOne: false
            referencedRelation: "order_book"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trades_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trades_sell_order_id_fkey"
            columns: ["sell_order_id"]
            isOneToOne: false
            referencedRelation: "order_book"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trades_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          counterparty_user_id: string | null
          created_at: string | null
          currency: string
          display_id: string | null
          exchange_id: string | null
          exchange_rate: number | null
          fee_amount: number
          id: string
          linked_transaction_id: string | null
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
          counterparty_user_id?: string | null
          created_at?: string | null
          currency: string
          display_id?: string | null
          exchange_id?: string | null
          exchange_rate?: number | null
          fee_amount?: number
          id?: string
          linked_transaction_id?: string | null
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
          counterparty_user_id?: string | null
          created_at?: string | null
          currency?: string
          display_id?: string | null
          exchange_id?: string | null
          exchange_rate?: number | null
          fee_amount?: number
          id?: string
          linked_transaction_id?: string | null
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
            foreignKeyName: "transactions_counterparty_user_id_fkey"
            columns: ["counterparty_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_linked_transaction_id_fkey"
            columns: ["linked_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
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
          kyc_completion_percentage: number | null
          kyc_current_step: number | null
          kyc_last_updated: string | null
          kyc_status: string | null
          phone_number: string | null
          profile_image_url: string | null
          updated_at: string | null
        }
        Insert: {
          clerk_user_id: string
          created_at?: string | null
          email: string
          full_name?: string | null
          id?: string
          kyc_completion_percentage?: number | null
          kyc_current_step?: number | null
          kyc_last_updated?: string | null
          kyc_status?: string | null
          phone_number?: string | null
          profile_image_url?: string | null
          updated_at?: string | null
        }
        Update: {
          clerk_user_id?: string
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          kyc_completion_percentage?: number | null
          kyc_current_step?: number | null
          kyc_last_updated?: string | null
          kyc_status?: string | null
          phone_number?: string | null
          profile_image_url?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      wallets: {
        Row: {
          available_balance: number
          created_at: string | null
          currency: string
          id: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          available_balance?: number
          created_at?: string | null
          currency: string
          id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          available_balance?: number
          created_at?: string | null
          currency?: string
          id?: string
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
    }
    Views: {
      wallet_balances_with_reserved: {
        Row: {
          available_balance: number | null
          created_at: string | null
          currency: string | null
          reserved_balance: number | null
          total_balance: number | null
          updated_at: string | null
          user_id: string | null
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
    }
    Functions: {
      get_order_book_depth: {
        Args: {
          p_base_currency: string
          p_quote_currency: string
          p_depth_limit?: number
        }
        Returns: Json
      }
      test_order_book_creation: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      validate_order_book_entry: {
        Args: {
          p_order_type: string
          p_side: string
          p_base_currency: string
          p_quote_currency: string
          p_quantity: number
          p_price?: number
        }
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
