export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          email: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          email?: string | null;
          avatar_url?: string | null;
        };
        Update: {
          full_name?: string | null;
          email?: string | null;
          avatar_url?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: { id?: string; name: string; slug: string; created_by: string };
        Update: { name?: string; slug?: string; updated_at?: string };
        Relationships: [];
      };
      organization_memberships: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          role: Database["public"]["Enums"]["organization_role"];
          status: Database["public"]["Enums"]["membership_status"];
          invited_by: string | null;
          invited_at: string | null;
          activated_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          role?: Database["public"]["Enums"]["organization_role"];
          status?: Database["public"]["Enums"]["membership_status"];
          invited_by?: string | null;
          invited_at?: string | null;
          activated_at?: string | null;
        };
        Update: {
          role?: Database["public"]["Enums"]["organization_role"];
          status?: Database["public"]["Enums"]["membership_status"];
          invited_by?: string | null;
          invited_at?: string | null;
          activated_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      warehouses: {
        Row: {
          id: string;
          organization_id: string;
          code: string;
          name: string;
          city: string | null;
          country_code: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          code: string;
          name: string;
          city?: string | null;
          country_code?: string | null;
          is_active?: boolean;
        };
        Update: {
          code?: string;
          name?: string;
          city?: string | null;
          country_code?: string | null;
          is_active?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      warehouse_assignments: {
        Row: {
          id: string;
          organization_id: string;
          warehouse_id: string;
          membership_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          warehouse_id: string;
          membership_id: string;
        };
        Update: never;
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          organization_id: string;
          sku: string;
          name: string;
          category: string | null;
          unit_of_measure: string;
          reorder_point: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          sku: string;
          name: string;
          category?: string | null;
          unit_of_measure?: string;
          reorder_point?: number;
          is_active?: boolean;
        };
        Update: {
          sku?: string;
          name?: string;
          category?: string | null;
          unit_of_measure?: string;
          reorder_point?: number;
          is_active?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      suppliers: {
        Row: {
          id: string;
          organization_id: string;
          code: string;
          name: string;
          contact_email: string | null;
          phone: string | null;
          status: string;
          lead_time_days: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          code: string;
          name: string;
          contact_email?: string | null;
          phone?: string | null;
          status?: string;
          lead_time_days?: number | null;
        };
        Update: {
          code?: string;
          name?: string;
          contact_email?: string | null;
          phone?: string | null;
          status?: string;
          lead_time_days?: number | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      warehouse_locations: {
        Row: {
          id: string;
          organization_id: string;
          warehouse_id: string;
          code: string;
          name: string;
          location_type: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          warehouse_id: string;
          code: string;
          name: string;
          location_type?: string;
          is_active?: boolean;
        };
        Update: {
          code?: string;
          name?: string;
          location_type?: string;
          is_active?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      inventory_balances: {
        Row: {
          id: string;
          organization_id: string;
          warehouse_id: string;
          product_id: string;
          on_hand: number;
          reserved: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          warehouse_id: string;
          product_id: string;
          on_hand?: number;
          reserved?: number;
        };
        Update: { on_hand?: number; reserved?: number; updated_at?: string };
        Relationships: [];
      };
      inventory_movements: {
        Row: {
          id: string;
          organization_id: string;
          warehouse_id: string;
          product_id: string;
          movement_type: Database["public"]["Enums"]["inventory_movement_type"];
          quantity: number;
          reference: string;
          notes: string | null;
          created_by: string;
          occurred_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          warehouse_id: string;
          product_id: string;
          movement_type: Database["public"]["Enums"]["inventory_movement_type"];
          quantity: number;
          reference: string;
          notes?: string | null;
          created_by: string;
        };
        Update: never;
        Relationships: [];
      };
      inventory_operations: {
        Row: {
          id: string;
          organization_id: string;
          operation_type: Database["public"]["Enums"]["inventory_operation_type"];
          reference: string;
          title: string;
          source_warehouse_id: string | null;
          destination_warehouse_id: string | null;
          status: string;
          quantity: number | null;
          due_at: string | null;
          notes: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          operation_type: Database["public"]["Enums"]["inventory_operation_type"];
          reference: string;
          title: string;
          source_warehouse_id?: string | null;
          destination_warehouse_id?: string | null;
          status?: string;
          quantity?: number | null;
          due_at?: string | null;
          notes?: string | null;
          created_by: string;
        };
        Update: {
          title?: string;
          source_warehouse_id?: string | null;
          destination_warehouse_id?: string | null;
          status?: string;
          quantity?: number | null;
          due_at?: string | null;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      warehouse_tasks: {
        Row: {
          id: string;
          organization_id: string;
          warehouse_id: string;
          task_type: Database["public"]["Enums"]["warehouse_task_type"];
          reference: string;
          title: string;
          status: string;
          quantity: number | null;
          due_at: string | null;
          notes: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          warehouse_id: string;
          task_type: Database["public"]["Enums"]["warehouse_task_type"];
          reference: string;
          title: string;
          status?: string;
          quantity?: number | null;
          due_at?: string | null;
          notes?: string | null;
          created_by: string;
        };
        Update: {
          title?: string;
          status?: string;
          quantity?: number | null;
          due_at?: string | null;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      procurement_records: {
        Row: {
          id: string;
          organization_id: string;
          record_type: Database["public"]["Enums"]["procurement_record_type"];
          reference: string;
          title: string;
          supplier_id: string | null;
          warehouse_id: string | null;
          status: string;
          amount: number | null;
          currency: string;
          due_at: string | null;
          notes: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          record_type: Database["public"]["Enums"]["procurement_record_type"];
          reference: string;
          title: string;
          supplier_id?: string | null;
          warehouse_id?: string | null;
          status?: string;
          amount?: number | null;
          currency?: string;
          due_at?: string | null;
          notes?: string | null;
          created_by: string;
        };
        Update: {
          title?: string;
          supplier_id?: string | null;
          warehouse_id?: string | null;
          status?: string;
          amount?: number | null;
          currency?: string;
          due_at?: string | null;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      shipments: {
        Row: {
          id: string;
          organization_id: string;
          reference: string;
          title: string;
          carrier: string | null;
          tracking_number: string | null;
          warehouse_id: string | null;
          status: string;
          due_at: string | null;
          notes: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          reference: string;
          title: string;
          carrier?: string | null;
          tracking_number?: string | null;
          warehouse_id?: string | null;
          status?: string;
          due_at?: string | null;
          notes?: string | null;
          created_by: string;
        };
        Update: {
          title?: string;
          carrier?: string | null;
          tracking_number?: string | null;
          warehouse_id?: string | null;
          status?: string;
          due_at?: string | null;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      documents: {
        Row: {
          id: string;
          organization_id: string;
          reference: string;
          title: string;
          document_type: string;
          storage_path: string | null;
          file_name: string | null;
          mime_type: string | null;
          file_size: number | null;
          status: string;
          notes: string | null;
          uploaded_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          reference: string;
          title: string;
          document_type?: string;
          storage_path?: string | null;
          file_name?: string | null;
          mime_type?: string | null;
          file_size?: number | null;
          status?: string;
          notes?: string | null;
          uploaded_by: string;
        };
        Update: {
          title?: string;
          document_type?: string;
          storage_path?: string | null;
          file_name?: string | null;
          mime_type?: string | null;
          file_size?: number | null;
          status?: string;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      job_openings: {
        Row: {
          id: string; organization_id: string; reference: string; title: string;
          department: string; location: string | null; employment_type: string;
          status: Database["public"]["Enums"]["job_status"]; description: string;
          required_skills: string[]; preferred_skills: string[];
          min_years_experience: number; education_level: string; created_by: string;
          opened_at: string | null; closed_at: string | null; created_at: string; updated_at: string;
        };
        Insert: {
          id?: string; organization_id: string; reference: string; title: string;
          department: string; location?: string | null; employment_type?: string;
          status?: Database["public"]["Enums"]["job_status"]; description: string;
          required_skills?: string[]; preferred_skills?: string[];
          min_years_experience?: number; education_level?: string; created_by: string;
          opened_at?: string | null; closed_at?: string | null;
        };
        Update: {
          title?: string; department?: string; location?: string | null; employment_type?: string;
          status?: Database["public"]["Enums"]["job_status"]; description?: string;
          required_skills?: string[]; preferred_skills?: string[];
          min_years_experience?: number; education_level?: string;
          opened_at?: string | null; closed_at?: string | null; updated_at?: string;
        };
        Relationships: [];
      };
      applicants: {
        Row: {
          id: string; organization_id: string; full_name: string; email: string;
          phone: string | null; location: string | null; source: string;
          consent_at: string; created_by: string | null; created_at: string; updated_at: string;
        };
        Insert: {
          id?: string; organization_id: string; full_name: string; email: string;
          phone?: string | null; location?: string | null; source?: string;
          consent_at?: string; created_by?: string | null;
        };
        Update: {
          full_name?: string; email?: string; phone?: string | null;
          location?: string | null; source?: string; updated_at?: string;
        };
        Relationships: [];
      };
      job_applications: {
        Row: {
          id: string; organization_id: string; job_id: string; applicant_id: string;
          stage: Database["public"]["Enums"]["application_stage"];
          application_reference: string; cover_letter: string | null; submission_channel: string;
          resume_text: string; resume_storage_path: string | null; resume_file_name: string | null;
          screening_consent_at: string | null;
          years_experience: number; education_level: string; declared_skills: string[];
          recruiter_notes: string | null; applied_at: string; updated_at: string;
        };
        Insert: {
          id?: string; organization_id: string; job_id: string; applicant_id: string;
          stage?: Database["public"]["Enums"]["application_stage"];
          application_reference?: string; cover_letter?: string | null; submission_channel?: string;
          resume_text: string; resume_storage_path?: string | null; resume_file_name?: string | null;
          screening_consent_at?: string | null;
          years_experience?: number; education_level?: string; declared_skills?: string[];
          recruiter_notes?: string | null; applied_at?: string;
        };
        Update: {
          stage?: Database["public"]["Enums"]["application_stage"];
          application_reference?: string; cover_letter?: string | null; submission_channel?: string;
          resume_text?: string; resume_storage_path?: string | null; resume_file_name?: string | null;
          screening_consent_at?: string | null;
          years_experience?: number; education_level?: string; declared_skills?: string[];
          recruiter_notes?: string | null; updated_at?: string;
        };
        Relationships: [];
      };
      public_application_attempts: {
        Row: { id: string; identifier_hash: string; attempted_at: string };
        Insert: { id?: string; identifier_hash: string; attempted_at?: string };
        Update: { identifier_hash?: string; attempted_at?: string };
        Relationships: [];
      };
      screening_runs: {
        Row: {
          id: string; organization_id: string; job_id: string;
          status: Database["public"]["Enums"]["screening_run_status"];
          model_name: string; model_version: string; weights: Json;
          application_count: number; error_message: string | null; created_by: string;
          created_at: string; completed_at: string | null;
        };
        Insert: {
          id?: string; organization_id: string; job_id: string;
          status?: Database["public"]["Enums"]["screening_run_status"];
          model_name?: string; model_version: string; weights?: Json;
          application_count?: number; error_message?: string | null; created_by: string;
          completed_at?: string | null;
        };
        Update: {
          status?: Database["public"]["Enums"]["screening_run_status"];
          model_name?: string; model_version?: string; weights?: Json;
          application_count?: number; error_message?: string | null; completed_at?: string | null;
        };
        Relationships: [];
      };
      screening_scores: {
        Row: {
          id: string; organization_id: string; screening_run_id: string; application_id: string;
          rank: number; overall_score: number; semantic_score: number; skills_score: number;
          experience_score: number; education_score: number; matched_skills: string[];
          missing_skills: string[]; explanation: Json; created_at: string;
        };
        Insert: {
          id?: string; organization_id: string; screening_run_id: string; application_id: string;
          rank: number; overall_score: number; semantic_score: number; skills_score: number;
          experience_score: number; education_score: number; matched_skills?: string[];
          missing_skills?: string[]; explanation?: Json;
        };
        Update: never;
        Relationships: [];
      };
      audit_events: {
        Row: {
          id: string;
          organization_id: string;
          actor_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          metadata: Json;
          occurred_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          actor_id?: string | null;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          metadata?: Json;
        };
        Update: never;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_organization: {
        Args: { organization_name: string; organization_slug: string };
        Returns: string;
      };
      is_active_member: {
        Args: { target_organization_id: string };
        Returns: boolean;
      };
      has_org_role: {
        Args: {
          target_organization_id: string;
          allowed_roles: Database["public"]["Enums"]["organization_role"][];
        };
        Returns: boolean;
      };
      can_manage_profile: {
        Args: { target_user_id: string };
        Returns: boolean;
      };
      activate_my_invited_memberships: {
        Args: Record<string, never>;
        Returns: number;
      };
      admin_add_invited_membership: {
        Args: {
          target_organization_id: string;
          target_user_id: string;
          target_role: Database["public"]["Enums"]["organization_role"];
        };
        Returns: string;
      };
      admin_update_membership: {
        Args: {
          target_membership_id: string;
          new_role: Database["public"]["Enums"]["organization_role"];
          new_status: Database["public"]["Enums"]["membership_status"];
        };
        Returns: undefined;
      };
      admin_update_organization: {
        Args: {
          target_organization_id: string;
          new_name: string;
          new_slug: string;
        };
        Returns: undefined;
      };
      admin_upsert_warehouse: {
        Args: {
          target_organization_id: string;
          target_warehouse_id: string | null;
          warehouse_code: string;
          warehouse_name: string;
          warehouse_city: string;
          warehouse_country_code: string;
          warehouse_is_active: boolean;
        };
        Returns: string;
      };
      admin_set_warehouse_assignment: {
        Args: {
          target_warehouse_id: string;
          target_membership_id: string;
          should_assign: boolean;
        };
        Returns: undefined;
      };
      post_inventory_movement: {
        Args: {
          target_organization_id: string;
          target_warehouse_id: string;
          target_product_id: string;
          target_movement_type: Database["public"]["Enums"]["inventory_movement_type"];
          target_quantity: number;
          target_reference: string;
          target_notes?: string | null;
        };
        Returns: string;
      };
    };
    Enums: {
      organization_role:
        | "owner"
        | "admin"
        | "procurement_manager"
        | "buyer"
        | "warehouse_manager"
        | "operator"
        | "viewer"
        | "hr_manager"
        | "recruiter";
      membership_status: "invited" | "active" | "suspended";
      inventory_movement_type:
        | "receipt"
        | "issue"
        | "adjustment"
        | "transfer_in"
        | "transfer_out";
      inventory_operation_type: "transfer" | "cycle_count";
      warehouse_task_type: "receiving" | "putaway" | "picking";
      procurement_record_type:
        | "requisition"
        | "rfq"
        | "quotation"
        | "purchase_order";
      job_status: "draft" | "open" | "paused" | "closed" | "archived";
      application_stage:
        | "applied"
        | "screening"
        | "shortlisted"
        | "interview"
        | "offer"
        | "hired"
        | "rejected"
        | "withdrawn";
      screening_run_status: "processing" | "completed" | "failed";
    };
    CompositeTypes: Record<string, never>;
  };
};
