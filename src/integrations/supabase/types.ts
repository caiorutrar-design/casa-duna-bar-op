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
      bartenders: {
        Row: {
          active: boolean | null
          created_at: string | null
          id: string
          name: string
          pin: string
          pin_hash: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          name: string
          pin: string
          pin_hash?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          name?: string
          pin?: string
          pin_hash?: string | null
        }
        Relationships: []
      }
      cash_closures: {
        Row: {
          bartender_name: string
          card_actual: number
          card_credit_actual: number
          card_credit_expected: number
          card_debit_actual: number
          card_debit_expected: number
          card_expected: number
          cash_actual: number
          cash_expected: number
          closure_date: string
          created_at: string
          id: string
          observations: string | null
          payment_methods_used: Json | null
          pix_actual: number
          pix_expected: number
          total_difference: number
          total_sales: number
          updated_at: string
        }
        Insert: {
          bartender_name: string
          card_actual?: number
          card_credit_actual?: number
          card_credit_expected?: number
          card_debit_actual?: number
          card_debit_expected?: number
          card_expected?: number
          cash_actual?: number
          cash_expected?: number
          closure_date: string
          created_at?: string
          id?: string
          observations?: string | null
          payment_methods_used?: Json | null
          pix_actual?: number
          pix_expected?: number
          total_difference?: number
          total_sales?: number
          updated_at?: string
        }
        Update: {
          bartender_name?: string
          card_actual?: number
          card_credit_actual?: number
          card_credit_expected?: number
          card_debit_actual?: number
          card_debit_expected?: number
          card_expected?: number
          cash_actual?: number
          cash_expected?: number
          closure_date?: string
          created_at?: string
          id?: string
          observations?: string | null
          payment_methods_used?: Json | null
          pix_actual?: number
          pix_expected?: number
          total_difference?: number
          total_sales?: number
          updated_at?: string
        }
        Relationships: []
      }
      drinks: {
        Row: {
          active: boolean | null
          brand: string | null
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          item_number: number | null
          name: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          brand?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          item_number?: number | null
          name: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          brand?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          item_number?: number | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      ingredients: {
        Row: {
          brand: string | null
          cost_per_unit: number
          created_at: string | null
          current_stock: number
          id: string
          min_stock: number
          name: string
          unit: string
          updated_at: string | null
        }
        Insert: {
          brand?: string | null
          cost_per_unit?: number
          created_at?: string | null
          current_stock?: number
          id?: string
          min_stock?: number
          name: string
          unit: string
          updated_at?: string | null
        }
        Update: {
          brand?: string | null
          cost_per_unit?: number
          created_at?: string | null
          current_stock?: number
          id?: string
          min_stock?: number
          name?: string
          unit?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          drink_id: string
          id: string
          order_id: string
          quantity: number
          status: string
          unit_cost: number
        }
        Insert: {
          created_at?: string
          drink_id: string
          id?: string
          order_id: string
          quantity?: number
          status?: string
          unit_cost: number
        }
        Update: {
          created_at?: string
          drink_id?: string
          id?: string
          order_id?: string
          quantity?: number
          status?: string
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_drink_id_fkey"
            columns: ["drink_id"]
            isOneToOne: false
            referencedRelation: "drinks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          bartender_name: string | null
          closed_at: string | null
          created_at: string
          id: string
          payment_method: string | null
          status: string
          table_id: string
          total_cost: number | null
          updated_at: string
        }
        Insert: {
          bartender_name?: string | null
          closed_at?: string | null
          created_at?: string
          id?: string
          payment_method?: string | null
          status?: string
          table_id: string
          total_cost?: number | null
          updated_at?: string
        }
        Update: {
          bartender_name?: string | null
          closed_at?: string | null
          created_at?: string
          id?: string
          payment_method?: string | null
          status?: string
          table_id?: string
          total_cost?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          bartender_name: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          bartender_name: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          bartender_name?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      recipes: {
        Row: {
          created_at: string | null
          drink_id: string
          id: string
          ingredient_id: string
          quantity: number
        }
        Insert: {
          created_at?: string | null
          drink_id: string
          id?: string
          ingredient_id: string
          quantity: number
        }
        Update: {
          created_at?: string | null
          drink_id?: string
          id?: string
          ingredient_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "recipes_drink_id_fkey"
            columns: ["drink_id"]
            isOneToOne: false
            referencedRelation: "drinks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipes_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          bartender_name: string
          created_at: string | null
          drink_id: string
          id: string
          quantity: number
          total_cost: number | null
        }
        Insert: {
          bartender_name: string
          created_at?: string | null
          drink_id: string
          id?: string
          quantity?: number
          total_cost?: number | null
        }
        Update: {
          bartender_name?: string
          created_at?: string | null
          drink_id?: string
          id?: string
          quantity?: number
          total_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_drink_id_fkey"
            columns: ["drink_id"]
            isOneToOne: false
            referencedRelation: "drinks"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          created_at: string | null
          id: string
          ingredient_id: string
          quantity: number
          reason: string | null
          type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          ingredient_id: string
          quantity: number
          reason?: string | null
          type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          ingredient_id?: string
          quantity?: number
          reason?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
        ]
      }
      tables: {
        Row: {
          created_at: string
          id: string
          status: string
          table_number: number
        }
        Insert: {
          created_at?: string
          id?: string
          status?: string
          table_number: number
        }
        Update: {
          created_at?: string
          id?: string
          status?: string
          table_number?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_item_to_order: {
        Args: { p_drink_id: string; p_order_id: string; p_quantity?: number }
        Returns: Json
      }
      close_order: {
        Args: { p_bartender_name: string; p_order_id: string }
        Returns: Json
      }
      process_sale: {
        Args: {
          p_bartender_name: string
          p_drink_id: string
          p_quantity?: number
        }
        Returns: Json
      }
      update_ingredient_stock: {
        Args: { p_ingredient_id: string; p_quantity: number }
        Returns: undefined
      }
      verify_bartender_pin: {
        Args: { p_name: string; p_pin: string }
        Returns: Json
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
