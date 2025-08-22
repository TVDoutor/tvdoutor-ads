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
      profiles: {
        Row: {
          id: string
          display_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
          role: Database["public"]["Enums"]["role_kind"]
          phone: string | null
          organization: string | null
        }
        Insert: {
          id: string
          display_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
          role?: Database["public"]["Enums"]["role_kind"]
          phone?: string | null
          organization?: string | null
        }
        Update: {
          id?: string
          display_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
          role?: Database["public"]["Enums"]["role_kind"]
          phone?: string | null
          organization?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      user_roles: {
        Row: {
          id: string
          user_id: string
          role: Database["public"]["Enums"]["app_role"]
          created_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          user_id: string
          role?: Database["public"]["Enums"]["app_role"]
          created_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          created_at?: string
          created_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      venues: {
        Row: {
          id: string
          name: string
          address: string | null
          city: string | null
          state: string | null
          postal_code: string | null
          country: string | null
          latitude: number | null
          longitude: number | null
          venue_type: string | null
          capacity: number | null
          description: string | null
          amenities: Json | null
          contact_email: string | null
          contact_phone: string | null
          website: string | null
          social_media: Json | null
          operating_hours: Json | null
          pricing_tier: string | null
          status: string
          created_at: string
          updated_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          name: string
          address?: string | null
          city?: string | null
          state?: string | null
          postal_code?: string | null
          country?: string | null
          latitude?: number | null
          longitude?: number | null
          venue_type?: string | null
          capacity?: number | null
          description?: string | null
          amenities?: Json | null
          contact_email?: string | null
          contact_phone?: string | null
          website?: string | null
          social_media?: Json | null
          operating_hours?: Json | null
          pricing_tier?: string | null
          status?: string
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          name?: string
          address?: string | null
          city?: string | null
          state?: string | null
          postal_code?: string | null
          country?: string | null
          latitude?: number | null
          longitude?: number | null
          venue_type?: string | null
          capacity?: number | null
          description?: string | null
          amenities?: Json | null
          contact_email?: string | null
          contact_phone?: string | null
          website?: string | null
          social_media?: Json | null
          operating_hours?: Json | null
          pricing_tier?: string | null
          status?: string
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "venues_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      screens: {
        Row: {
          id: string
          venue_id: string
          name: string
          screen_type: string | null
          size_width: number | null
          size_height: number | null
          resolution: string | null
          location_description: string | null
          visibility_rating: number | null
          traffic_rating: number | null
          demographics: Json | null
          peak_hours: Json | null
          base_rate: number | null
          currency: string
          status: string
          installation_date: string | null
          last_maintenance: string | null
          created_at: string
          updated_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          venue_id: string
          name: string
          screen_type?: string | null
          size_width?: number | null
          size_height?: number | null
          resolution?: string | null
          location_description?: string | null
          visibility_rating?: number | null
          traffic_rating?: number | null
          demographics?: Json | null
          peak_hours?: Json | null
          base_rate?: number | null
          currency?: string
          status?: string
          installation_date?: string | null
          last_maintenance?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          venue_id?: string
          name?: string
          screen_type?: string | null
          size_width?: number | null
          size_height?: number | null
          resolution?: string | null
          location_description?: string | null
          visibility_rating?: number | null
          traffic_rating?: number | null
          demographics?: Json | null
          peak_hours?: Json | null
          base_rate?: number | null
          currency?: string
          status?: string
          installation_date?: string | null
          last_maintenance?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "screens_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screens_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          }
        ]
      }
      proposals: {
        Row: {
          id: string
          created_by: string | null
          customer_name: string
          customer_email: string | null
          city: string | null
          class: Database["public"]["Enums"]["class_band"] | null
          filters: Json
          quote: Json
          screens: Json
          pdf_path: string | null
          pdf_url: string | null
          clicksign_document_key: string | null
          clicksign_sign_url: string | null
          pipedrive_deal_id: number | null
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          created_by?: string | null
          customer_name: string
          customer_email?: string | null
          city?: string | null
          class?: Database["public"]["Enums"]["class_band"] | null
          filters: Json
          quote: Json
          screens: Json
          pdf_path?: string | null
          pdf_url?: string | null
          clicksign_document_key?: string | null
          clicksign_sign_url?: string | null
          pipedrive_deal_id?: number | null
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          created_by?: string | null
          customer_name?: string
          customer_email?: string | null
          city?: string | null
          class?: Database["public"]["Enums"]["class_band"] | null
          filters?: Json
          quote?: Json
          screens?: Json
          pdf_path?: string | null
          pdf_url?: string | null
          clicksign_document_key?: string | null
          clicksign_sign_url?: string | null
          pipedrive_deal_id?: number | null
          status?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      screen_rates: {
        Row: {
          id: string
          screen_id: string
          rate_type: string
          duration_hours: number
          price: number
          currency: string
          effective_from: string
          effective_until: string | null
          created_at: string
          updated_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          screen_id: string
          rate_type: string
          duration_hours: number
          price: number
          currency?: string
          effective_from: string
          effective_until?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          screen_id?: string
          rate_type?: string
          duration_hours?: number
          price?: number
          currency?: string
          effective_from?: string
          effective_until?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "screen_rates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screen_rates_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "screens"
            referencedColumns: ["id"]
          }
        ]
      }
      price_rules: {
        Row: {
          id: string
          city: string | null
          class: Database["public"]["Enums"]["class_band"] | null
          base_monthly: number
          uplift: number
          created_at: string
          min_months: number | null
          setup_fee: number | null
          logistics_km_price: number | null
          city_norm: string | null
          created_by: string | null
        }
        Insert: {
          id?: string
          city?: string | null
          class?: Database["public"]["Enums"]["class_band"] | null
          base_monthly?: number
          uplift?: number
          created_at?: string
          min_months?: number | null
          setup_fee?: number | null
          logistics_km_price?: number | null
          city_norm?: string | null
          created_by?: string | null
        }
        Update: {
          id?: string
          city?: string | null
          class?: Database["public"]["Enums"]["class_band"] | null
          base_monthly?: number
          uplift?: number
          created_at?: string
          min_months?: number | null
          setup_fee?: number | null
          logistics_km_price?: number | null
          city_norm?: string | null
          created_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "price_rules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      screen_availability: {
        Row: {
          id: string
          screen_id: string
          date: string
          start_time: string
          end_time: string
          is_available: boolean
          reason: string | null
          created_at: string
          updated_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          screen_id: string
          date: string
          start_time: string
          end_time: string
          is_available?: boolean
          reason?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          screen_id?: string
          date?: string
          start_time?: string
          end_time?: string
          is_available?: boolean
          reason?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "screen_availability_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screen_availability_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "screens"
            referencedColumns: ["id"]
          }
        ]
      }
      screen_bookings: {
        Row: {
          id: string
          screen_id: string
          proposal_id: string
          booking_date: string
          start_time: string
          end_time: string
          duration_hours: number
          rate_applied: number
          total_cost: number
          currency: string
          status: string
          booking_reference: string | null
          notes: string | null
          created_at: string
          updated_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          screen_id: string
          proposal_id: string
          booking_date: string
          start_time: string
          end_time: string
          duration_hours: number
          rate_applied: number
          total_cost: number
          currency?: string
          status?: string
          booking_reference?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          screen_id?: string
          proposal_id?: string
          booking_date?: string
          start_time?: string
          end_time?: string
          duration_hours?: number
          rate_applied?: number
          total_cost?: number
          currency?: string
          status?: string
          booking_reference?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "screen_bookings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screen_bookings_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screen_bookings_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "screens"
            referencedColumns: ["id"]
          }
        ]
      }
      venue_audience_monthly: {
        Row: {
          id: string
          venue_id: string
          month: string
          audience: number
          created_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          venue_id: string
          month: string
          audience: number
          created_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          venue_id?: string
          month?: string
          audience?: number
          created_at?: string
          created_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "venue_audience_monthly_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_audience_monthly_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      stg_billboard_data: {
        Row: {
          raw_id: string
          board_name: string | null
          display_name: string | null
          facing: string | null
          screen_facing: string | null
          board_format: string | null
          category: string | null
          venue_type_parent: string | null
          venue_type_child: string | null
          venue_type_grandchildren: string | null
          latitude: number | null
          longitude: number | null
          country: string | null
          state: string | null
          district: string | null
          active: string | null
          available: string | null
          screen_start_time: string | null
          screen_end_time: string | null
          spot_duration_secs: number | null
          spots_per_hour: number | null
          no_of_clients_per_loop: number | null
          minimum_spots_per_day: number | null
          maximum_spots_per_day: number | null
          mode_of_operation: string | null
          spots_reserved_for_mw: string | null
          expose_to_max: string | null
          expose_to_mad: string | null
          standard_rates_month: number | null
          selling_rate_month: number | null
          asset_url: string | null
          cpm: number | null
          audiences_monthly: number | null
          imported_at: string
          imported_by: string | null
        }
        Insert: {
          raw_id?: string
          board_name?: string | null
          display_name?: string | null
          facing?: string | null
          screen_facing?: string | null
          board_format?: string | null
          category?: string | null
          venue_type_parent?: string | null
          venue_type_child?: string | null
          venue_type_grandchildren?: string | null
          latitude?: number | null
          longitude?: number | null
          country?: string | null
          state?: string | null
          district?: string | null
          active?: string | null
          available?: string | null
          screen_start_time?: string | null
          screen_end_time?: string | null
          spot_duration_secs?: number | null
          spots_per_hour?: number | null
          no_of_clients_per_loop?: number | null
          minimum_spots_per_day?: number | null
          maximum_spots_per_day?: number | null
          mode_of_operation?: string | null
          spots_reserved_for_mw?: string | null
          expose_to_max?: string | null
          expose_to_mad?: string | null
          standard_rates_month?: number | null
          selling_rate_month?: number | null
          asset_url?: string | null
          cpm?: number | null
          audiences_monthly?: number | null
          imported_at?: string
          imported_by?: string | null
        }
        Update: {
          raw_id?: string
          board_name?: string | null
          display_name?: string | null
          facing?: string | null
          screen_facing?: string | null
          board_format?: string | null
          category?: string | null
          venue_type_parent?: string | null
          venue_type_child?: string | null
          venue_type_grandchildren?: string | null
          latitude?: number | null
          longitude?: number | null
          country?: string | null
          state?: string | null
          district?: string | null
          active?: string | null
          available?: string | null
          screen_start_time?: string | null
          screen_end_time?: string | null
          spot_duration_secs?: number | null
          spots_per_hour?: number | null
          no_of_clients_per_loop?: number | null
          minimum_spots_per_day?: number | null
          maximum_spots_per_day?: number | null
          mode_of_operation?: string | null
          spots_reserved_for_mw?: string | null
          expose_to_max?: string | null
          expose_to_mad?: string | null
          standard_rates_month?: number | null
          selling_rate_month?: number | null
          asset_url?: string | null
          cpm?: number | null
          audiences_monthly?: number | null
          imported_at?: string
          imported_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stg_billboard_data_imported_by_fkey"
            columns: ["imported_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      stg_ponto: {
        Row: {
          raw_id: string
          codigo_de_ponto: string | null
          ponto_de_cuidado: string | null
          audiencia: number | null
          imported_at: string
          imported_by: string | null
          screen_id: string | null
        }
        Insert: {
          raw_id?: string
          codigo_de_ponto?: string | null
          ponto_de_cuidado?: string | null
          audiencia?: number | null
          imported_at?: string
          imported_by?: string | null
          screen_id?: string | null
        }
        Update: {
          raw_id?: string
          codigo_de_ponto?: string | null
          ponto_de_cuidado?: string | null
          audiencia?: number | null
          imported_at?: string
          imported_by?: string | null
          screen_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stg_ponto_imported_by_fkey"
            columns: ["imported_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stg_ponto_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "screens"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      ensure_profile: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_user_role: {
        Args: {
          _user_id?: string
        }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _user_id: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_super_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
    Enums: {
      app_role: "super_admin" | "admin" | "user"
      class_band: "A" | "B" | "C" | "D" | "ND"
      role_kind: "super_admin" | "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

