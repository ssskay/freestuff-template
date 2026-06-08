/**
 * Supabase Database Types
 * Hand-maintained to match supabase/schema.sql.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      resources: {
        Row: {
          id: string
          slug: string
          name: string
          description: string
          url: string
          category: string
          eligibility: string[]
          last_verified: string
          notes: string | null
          source: string | null
          added_at: string
          added_by: string
          upvotes: number
          is_active: boolean
          annual_value: number | null
          date_added: string | null
          hidden_gem: boolean
        }
        Insert: {
          id?: string
          slug: string
          name: string
          description: string
          url: string
          category: string
          eligibility?: string[]
          last_verified?: string
          notes?: string | null
          source?: string | null
          added_at?: string
          added_by?: string
          upvotes?: number
          is_active?: boolean
          annual_value?: number | null
          date_added?: string | null
          hidden_gem?: boolean
        }
        Update: Partial<Database['public']['Tables']['resources']['Insert']>
        Relationships: []
      }
      votes: {
        Row: {
          id: string
          resource_id: string
          fingerprint: string
          voted_at: string
        }
        Insert: {
          id?: string
          resource_id: string
          fingerprint: string
          voted_at?: string
        }
        Update: Partial<Database['public']['Tables']['votes']['Insert']>
        Relationships: []
      }
      pending_resources: {
        Row: {
          id: string
          name: string
          description: string | null
          url: string
          category: string | null
          eligibility: string[]
          notes: string | null
          submitted_by: string | null
          submitted_at: string
          status: 'pending' | 'approved' | 'rejected'
          agent_source: 'verify' | 'discover' | 'draft' | null
          reviewed_at: string | null
          reviewer_notes: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          url: string
          category?: string | null
          eligibility?: string[]
          notes?: string | null
          submitted_by?: string | null
          submitted_at?: string
          status?: 'pending' | 'approved' | 'rejected'
          agent_source?: 'verify' | 'discover' | 'draft' | null
          reviewed_at?: string | null
          reviewer_notes?: string | null
        }
        Update: Partial<Database['public']['Tables']['pending_resources']['Insert']>
        Relationships: []
      }
      resource_reports: {
        Row: {
          id: string
          resource_id: string | null
          issue_type: 'broken-link' | 'wrong-info' | 'outdated' | 'eligibility' | 'other'
          details: string | null
          email: string | null
          created_at: string
          status: 'pending' | 'reviewed' | 'fixed'
        }
        Insert: {
          id?: string
          resource_id?: string | null
          issue_type: 'broken-link' | 'wrong-info' | 'outdated' | 'eligibility' | 'other'
          details?: string | null
          email?: string | null
          created_at?: string
          status?: 'pending' | 'reviewed' | 'fixed'
        }
        Update: Partial<Database['public']['Tables']['resource_reports']['Insert']>
        Relationships: []
      }
    }
    Functions: {
      upvote_resource: {
        Args: { p_id: string; p_fingerprint: string }
        Returns: { success: boolean; upvotes: number; message: string }[]
      }
      remove_upvote: {
        Args: { p_id: string; p_fingerprint: string }
        Returns: { success: boolean; upvotes: number; message: string }[]
      }
      report_issue: {
        Args: {
          p_id: string
          p_issue_type: string
          p_details: string | null
          p_email: string | null
        }
        Returns: boolean
      }
      subscribe_email: {
        Args: { p_email: string; p_source: string | null }
        Returns: boolean
      }
    }
    Views: { [_ in never]: never }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}
