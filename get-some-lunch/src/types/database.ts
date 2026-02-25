export type Frequency =
  | "daily"
  | "weekly"
  | "biweekly"
  | "monthly"
  | "rarely"
  | "never";

export type SessionStatus =
  | "gathering"
  | "suggesting"
  | "voting"
  | "decided"
  | "completed";

export type GroupRole = "admin" | "member";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          email: string;
          created_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          email: string;
          created_at?: string;
        };
        Update: {
          display_name?: string | null;
          email?: string;
        };
      };
      groups: {
        Row: {
          id: string;
          name: string;
          office_address: string | null;
          lat: number | null;
          lng: number | null;
          invite_code: string;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          office_address?: string | null;
          lat?: number | null;
          lng?: number | null;
          invite_code?: string;
          created_by: string;
          created_at?: string;
        };
        Update: {
          name?: string;
          office_address?: string | null;
          lat?: number | null;
          lng?: number | null;
        };
      };
      group_members: {
        Row: {
          group_id: string;
          user_id: string;
          role: GroupRole;
          joined_at: string;
        };
        Insert: {
          group_id: string;
          user_id: string;
          role?: GroupRole;
          joined_at?: string;
        };
        Update: {
          role?: GroupRole;
        };
      };
      restaurants: {
        Row: {
          id: string;
          name: string;
          address: string | null;
          category: string | null;
          lat: number | null;
          lng: number | null;
          foursquare_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          address?: string | null;
          category?: string | null;
          lat?: number | null;
          lng?: number | null;
          foursquare_id?: string | null;
          created_at?: string;
        };
        Update: {
          name?: string;
          address?: string | null;
          category?: string | null;
        };
      };
      group_restaurants: {
        Row: {
          id: string;
          group_id: string;
          restaurant_id: string;
          added_by: string;
          added_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          restaurant_id: string;
          added_by: string;
          added_at?: string;
        };
        Update: Record<string, never>;
      };
      preferences: {
        Row: {
          id: string;
          user_id: string;
          group_restaurant_id: string;
          frequency: Frequency;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          group_restaurant_id: string;
          frequency?: Frequency;
          updated_at?: string;
        };
        Update: {
          frequency?: Frequency;
          updated_at?: string;
        };
      };
      sessions: {
        Row: {
          id: string;
          group_id: string;
          session_date: string;
          status: SessionStatus;
          winner_group_restaurant_id: string | null;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          session_date?: string;
          status?: SessionStatus;
          winner_group_restaurant_id?: string | null;
          created_by: string;
          created_at?: string;
        };
        Update: {
          status?: SessionStatus;
          winner_group_restaurant_id?: string | null;
        };
      };
      session_members: {
        Row: {
          session_id: string;
          user_id: string;
          joined_at: string;
        };
        Insert: {
          session_id: string;
          user_id: string;
          joined_at?: string;
        };
        Update: Record<string, never>;
      };
      candidates: {
        Row: {
          id: string;
          session_id: string;
          group_restaurant_id: string;
          score: number;
        };
        Insert: {
          id?: string;
          session_id: string;
          group_restaurant_id: string;
          score: number;
        };
        Update: Record<string, never>;
      };
      votes: {
        Row: {
          id: string;
          candidate_id: string;
          user_id: string;
          rank: number;
        };
        Insert: {
          id?: string;
          candidate_id: string;
          user_id: string;
          rank: number;
        };
        Update: {
          rank?: number;
        };
      };
      visits: {
        Row: {
          id: string;
          session_id: string;
          restaurant_id: string;
          visit_date: string;
          group_id: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          restaurant_id: string;
          visit_date?: string;
          group_id: string;
        };
        Update: Record<string, never>;
      };
      visit_ratings: {
        Row: {
          id: string;
          visit_id: string;
          user_id: string;
          rating: number;
          note: string | null;
        };
        Insert: {
          id?: string;
          visit_id: string;
          user_id: string;
          rating: number;
          note?: string | null;
        };
        Update: {
          rating?: number;
          note?: string | null;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
