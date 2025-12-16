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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      admin_settings: {
        Row: {
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          setting_key: string
          setting_value?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      daily_bonuses: {
        Row: {
          bonus_amount: number
          claimed_at: string
          id: string
          streak_days: number
          user_id: string
        }
        Insert: {
          bonus_amount?: number
          claimed_at?: string
          id?: string
          streak_days?: number
          user_id: string
        }
        Update: {
          bonus_amount?: number
          claimed_at?: string
          id?: string
          streak_days?: number
          user_id?: string
        }
        Relationships: []
      }
      forced_results: {
        Row: {
          created_at: string
          created_by: string
          id: string
          is_active: boolean
          remaining_flips: number
          result: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean
          remaining_flips?: number
          result: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          remaining_flips?: number
          result?: string
        }
        Relationships: []
      }
      matchmaking_queue: {
        Row: {
          amount: number
          choice: string
          created_at: string
          game_session_id: string | null
          id: string
          matched_at: string | null
          matched_with: string | null
          status: string
          user_id: string
          username: string
        }
        Insert: {
          amount: number
          choice: string
          created_at?: string
          game_session_id?: string | null
          id?: string
          matched_at?: string | null
          matched_with?: string | null
          status?: string
          user_id: string
          username: string
        }
        Update: {
          amount?: number
          choice?: string
          created_at?: string
          game_session_id?: string | null
          id?: string
          matched_at?: string | null
          matched_with?: string | null
          status?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      multiplayer_bets: {
        Row: {
          amount: number
          created_at: string
          id: string
          payout: number | null
          round_id: string
          side: string
          user_id: string
          username: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          payout?: number | null
          round_id: string
          side: string
          user_id: string
          username: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          payout?: number | null
          round_id?: string
          side?: string
          user_id?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "multiplayer_bets_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "multiplayer_rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      multiplayer_rounds: {
        Row: {
          completed_at: string | null
          ends_at: string
          id: string
          king_total: number
          round_number: number
          started_at: string
          status: string
          tail_total: number
          winner: string | null
        }
        Insert: {
          completed_at?: string | null
          ends_at?: string
          id?: string
          king_total?: number
          round_number?: number
          started_at?: string
          status?: string
          tail_total?: number
          winner?: string | null
        }
        Update: {
          completed_at?: string | null
          ends_at?: string
          id?: string
          king_total?: number
          round_number?: number
          started_at?: string
          status?: string
          tail_total?: number
          winner?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_status: string | null
          created_at: string
          email: string
          id: string
          kyc_status: string | null
          last_login: string | null
          phone_number: string | null
          profile_image: string | null
          referral_code: string | null
          referred_by: string | null
          username: string
        }
        Insert: {
          account_status?: string | null
          created_at?: string
          email: string
          id: string
          kyc_status?: string | null
          last_login?: string | null
          phone_number?: string | null
          profile_image?: string | null
          referral_code?: string | null
          referred_by?: string | null
          username: string
        }
        Update: {
          account_status?: string | null
          created_at?: string
          email?: string
          id?: string
          kyc_status?: string | null
          last_login?: string | null
          phone_number?: string | null
          profile_image?: string | null
          referral_code?: string | null
          referred_by?: string | null
          username?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string | null
          id: string
          referral_code: string
          referred_id: string
          referrer_id: string
          reward_amount: number | null
          reward_claimed: boolean | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          referral_code: string
          referred_id: string
          referrer_id: string
          reward_amount?: number | null
          reward_claimed?: boolean | null
        }
        Update: {
          created_at?: string | null
          id?: string
          referral_code?: string
          referred_id?: string
          referrer_id?: string
          reward_amount?: number | null
          reward_claimed?: boolean | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          currency: string
          game_details: Json | null
          id: string
          payment_details: Json | null
          payment_method: string | null
          processed_at: string | null
          status: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string
          currency?: string
          game_details?: Json | null
          id?: string
          payment_details?: Json | null
          payment_method?: string | null
          processed_at?: string | null
          status?: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          currency?: string
          game_details?: Json | null
          id?: string
          payment_details?: Json | null
          payment_method?: string | null
          processed_at?: string | null
          status?: string
          type?: string
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
          role?: Database["public"]["Enums"]["app_role"]
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
      user_stats: {
        Row: {
          games_lost: number
          games_won: number
          id: string
          net_profit: number
          total_games: number
          total_wagered: number
          total_winnings: number
          updated_at: string
          user_id: string
          win_rate: number
        }
        Insert: {
          games_lost?: number
          games_won?: number
          id?: string
          net_profit?: number
          total_games?: number
          total_wagered?: number
          total_winnings?: number
          updated_at?: string
          user_id: string
          win_rate?: number
        }
        Update: {
          games_lost?: number
          games_won?: number
          id?: string
          net_profit?: number
          total_games?: number
          total_wagered?: number
          total_winnings?: number
          updated_at?: string
          user_id?: string
          win_rate?: number
        }
        Relationships: []
      }
      wallets: {
        Row: {
          balance: number
          bonus_balance: number
          currency: string
          id: string
          last_updated: string
          locked_balance: number
          total_deposits: number
          total_withdrawals: number
          user_id: string
        }
        Insert: {
          balance?: number
          bonus_balance?: number
          currency?: string
          id?: string
          last_updated?: string
          locked_balance?: number
          total_deposits?: number
          total_withdrawals?: number
          user_id: string
        }
        Update: {
          balance?: number
          bonus_balance?: number
          currency?: string
          id?: string
          last_updated?: string
          locked_balance?: number
          total_deposits?: number
          total_withdrawals?: number
          user_id?: string
        }
        Relationships: []
      }
      withdrawal_requests: {
        Row: {
          admin_notes: string | null
          amount: number
          created_at: string
          failure_reason: string | null
          id: string
          method: string
          payout_identifier: string
          payout_identifier_encrypted: string | null
          processed_at: string | null
          processed_by: string | null
          razorpay_payout_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          created_at?: string
          failure_reason?: string | null
          id?: string
          method: string
          payout_identifier: string
          payout_identifier_encrypted?: string | null
          processed_at?: string | null
          processed_by?: string | null
          razorpay_payout_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          created_at?: string
          failure_reason?: string | null
          id?: string
          method?: string
          payout_identifier?: string
          payout_identifier_encrypted?: string | null
          processed_at?: string | null
          processed_by?: string | null
          razorpay_payout_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      withdrawal_settings: {
        Row: {
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          setting_key: string
          setting_value?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_give_money: {
        Args: { p_admin_id: string; p_amount: number; p_target_user_id: string }
        Returns: Json
      }
      admin_mark_withdrawal_failed: {
        Args: {
          p_admin_id: string
          p_failure_reason: string
          p_request_id: string
        }
        Returns: Json
      }
      admin_mark_withdrawal_paid: {
        Args: {
          p_admin_id: string
          p_razorpay_payout_id?: string
          p_request_id: string
        }
        Returns: Json
      }
      admin_process_withdrawal: {
        Args: {
          p_action: string
          p_admin_id: string
          p_notes?: string
          p_request_id: string
        }
        Returns: Json
      }
      complete_multiplayer_round: {
        Args: { p_round_id: string }
        Returns: Json
      }
      create_withdrawal_request: {
        Args: {
          p_amount: number
          p_method: string
          p_payout_identifier: string
          p_user_id: string
        }
        Returns: Json
      }
      get_current_round: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      place_multiplayer_bet: {
        Args: {
          p_amount: number
          p_round_id: string
          p_side: string
          p_user_id: string
          p_username: string
        }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
