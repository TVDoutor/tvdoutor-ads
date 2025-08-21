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
          email: string | null
          full_name: string | null
          display_name: string | null
          avatar_url: string | null
          role: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string | null
          full_name?: string | null
          display_name?: string | null
          avatar_url?: string | null
          role?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          full_name?: string | null
          display_name?: string | null
          avatar_url?: string | null
          role?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
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
          user_id: string
          title: string
          description: string | null
          campaign_start_date: string
          campaign_end_date: string
          budget: number | null
          currency: string
          target_audience: Json | null
          geographic_targeting: Json | null
          content_requirements: Json | null
          status: string
          created_at: string
          updated_at: string
          approved_at: string | null
          approved_by: string | null
          rejection_reason: string | null
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description?: string | null
          campaign_start_date: string
          campaign_end_date: string
          budget?: number | null
          currency?: string
          target_audience?: Json | null
          geographic_targeting?: Json | null
          content_requirements?: Json | null
          status?: string
          created_at?: string
          updated_at?: string
          approved_at?: string | null
          approved_by?: string | null
          rejection_reason?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string | null
          campaign_start_date?: string
          campaign_end_date?: string
          budget?: number | null
          currency?: string
          target_audience?: Json | null
          geographic_targeting?: Json | null
          content_requirements?: Json | null
          status?: string
          created_at?: string
          updated_at?: string
          approved_at?: string | null
          approved_by?: string | null
          rejection_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposals_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_user_id_fkey"
            columns: ["user_id"]
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
          name: string
          description: string | null
          rule_type: string
          conditions: Json
          discount_type: string
          discount_value: number
          min_duration: number | null
          max_duration: number | null
          valid_from: string
          valid_until: string | null
          is_active: boolean
          priority: number
          created_at: string
          updated_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          rule_type: string
          conditions: Json
          discount_type: string
          discount_value: number
          min_duration?: number | null
          max_duration?: number | null
          valid_from: string
          valid_until?: string | null
          is_active?: boolean
          priority?: number
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          rule_type?: string
          conditions?: Json
          discount_type?: string
          discount_value?: number
          min_duration?: number | null
          max_duration?: number | null
          valid_from?: string
          valid_until?: string | null
          is_active?: boolean
          priority?: number
          created_at?: string
          updated_at?: string
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
