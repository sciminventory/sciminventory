export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type TableDefinition<Row, Insert, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

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
          legal_name: string | null;
          tax_id: string | null;
          registration_number: string | null;
          vendor_category: string;
          onboarding_status: string;
          payment_terms_days: number;
          credit_limit: number;
          currency: string;
          delivery_capacity: number | null;
          delivery_methods: string[];
          service_areas: string[];
          cutoff_time: string | null;
          website: string | null;
          address_line: string | null;
          city: string | null;
          province: string | null;
          postal_code: string | null;
          country_code: string;
          approved_at: string | null;
          approved_by: string | null;
          risk_rating: string;
          notes: string | null;
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
          legal_name?: string | null;
          tax_id?: string | null;
          registration_number?: string | null;
          vendor_category?: string;
          onboarding_status?: string;
          payment_terms_days?: number;
          credit_limit?: number;
          currency?: string;
          delivery_capacity?: number | null;
          delivery_methods?: string[];
          service_areas?: string[];
          cutoff_time?: string | null;
          website?: string | null;
          address_line?: string | null;
          city?: string | null;
          province?: string | null;
          postal_code?: string | null;
          country_code?: string;
          approved_at?: string | null;
          approved_by?: string | null;
          risk_rating?: string;
          notes?: string | null;
        };
        Update: {
          code?: string;
          name?: string;
          contact_email?: string | null;
          phone?: string | null;
          status?: string;
          lead_time_days?: number | null;
          legal_name?: string | null;
          tax_id?: string | null;
          registration_number?: string | null;
          vendor_category?: string;
          onboarding_status?: string;
          payment_terms_days?: number;
          credit_limit?: number;
          currency?: string;
          delivery_capacity?: number | null;
          delivery_methods?: string[];
          service_areas?: string[];
          cutoff_time?: string | null;
          website?: string | null;
          address_line?: string | null;
          city?: string | null;
          province?: string | null;
          postal_code?: string | null;
          country_code?: string;
          approved_at?: string | null;
          approved_by?: string | null;
          risk_rating?: string;
          notes?: string | null;
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
          shipping_address: string | null;
          delivery_date: string | null;
          terms_and_conditions: string | null;
          version: number;
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
          shipping_address?: string | null;
          delivery_date?: string | null;
          terms_and_conditions?: string | null;
          version?: number;
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
          shipping_address: string | null;
          delivery_date: string | null;
          terms_and_conditions: string | null;
          version: number;
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
          shipping_address?: string | null;
          delivery_date?: string | null;
          terms_and_conditions?: string | null;
          version?: number;
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
          shipping_address?: string | null;
          delivery_date?: string | null;
          terms_and_conditions?: string | null;
          version?: number;
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
          supplier_id: string | null;
          purchase_order_id: string | null;
          vehicle_details: string | null;
          dispatched_at: string | null;
          expected_arrival_at: string | null;
          actual_arrival_at: string | null;
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
          supplier_id?: string | null;
          purchase_order_id?: string | null;
          vehicle_details?: string | null;
          dispatched_at?: string | null;
          expected_arrival_at?: string | null;
          actual_arrival_at?: string | null;
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
          supplier_id?: string | null;
          purchase_order_id?: string | null;
          vehicle_details?: string | null;
          dispatched_at?: string | null;
          expected_arrival_at?: string | null;
          actual_arrival_at?: string | null;
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
      vendor_users: TableDefinition<
        { id: string; organization_id: string; supplier_id: string; user_id: string; role: string; status: Database["public"]["Enums"]["membership_status"]; invited_by: string | null; invited_at: string; activated_at: string | null; created_at: string; updated_at: string },
        { id?: string; organization_id: string; supplier_id: string; user_id: string; role?: string; status?: Database["public"]["Enums"]["membership_status"]; invited_by?: string | null; invited_at?: string; activated_at?: string | null }
      >;
      vendor_contacts: TableDefinition<
        { id: string; organization_id: string; supplier_id: string; full_name: string; email: string; phone: string | null; job_title: string | null; is_primary: boolean; created_at: string; updated_at: string },
        { id?: string; organization_id: string; supplier_id: string; full_name: string; email: string; phone?: string | null; job_title?: string | null; is_primary?: boolean }
      >;
      vendor_addresses: TableDefinition<
        { id: string; organization_id: string; supplier_id: string; address_type: string; label: string; address_line: string; city: string; province: string | null; postal_code: string | null; country_code: string; is_primary: boolean; created_at: string; updated_at: string },
        { id?: string; organization_id: string; supplier_id: string; address_type?: string; label: string; address_line: string; city: string; province?: string | null; postal_code?: string | null; country_code?: string; is_primary?: boolean }
      >;
      vendor_documents: TableDefinition<
        { id: string; organization_id: string; supplier_id: string; document_type: string; title: string; storage_path: string; file_name: string; mime_type: string; file_size: number; status: string; expires_at: string | null; verified_at: string | null; verified_by: string | null; uploaded_by: string | null; created_at: string; updated_at: string },
        { id?: string; organization_id: string; supplier_id: string; document_type: string; title: string; storage_path: string; file_name: string; mime_type: string; file_size: number; status?: string; expires_at?: string | null; verified_at?: string | null; verified_by?: string | null; uploaded_by?: string | null }
      >;
      vendor_catalog_items: TableDefinition<
        { id: string; organization_id: string; supplier_id: string; product_id: string | null; vendor_item_code: string; description: string; unit_price: number; currency: string; minimum_order_quantity: number; lead_time_days: number; delivery_window_days: number; packaging_specs: string | null; status: string; valid_from: string | null; valid_until: string | null; created_at: string; updated_at: string },
        { id?: string; organization_id: string; supplier_id: string; product_id?: string | null; vendor_item_code: string; description: string; unit_price: number; currency?: string; minimum_order_quantity?: number; lead_time_days?: number; delivery_window_days?: number; packaging_specs?: string | null; status?: string; valid_from?: string | null; valid_until?: string | null }
      >;
      vendor_shipping_rules: TableDefinition<
        { id: string; organization_id: string; supplier_id: string; shipping_method: string; service_area: string; cutoff_time: string | null; delay_penalty_rate: number; instructions: string | null; is_active: boolean; created_at: string; updated_at: string },
        { id?: string; organization_id: string; supplier_id: string; shipping_method: string; service_area: string; cutoff_time?: string | null; delay_penalty_rate?: number; instructions?: string | null; is_active?: boolean }
      >;
      procurement_record_lines: TableDefinition<
        { id: string; organization_id: string; procurement_record_id: string; product_id: string | null; vendor_catalog_item_id: string | null; line_number: number; description: string; quantity: number; unit_price: number; tax_rate: number; promised_date: string | null; received_quantity: number; created_at: string; updated_at: string },
        { id?: string; organization_id: string; procurement_record_id: string; product_id?: string | null; vendor_catalog_item_id?: string | null; line_number: number; description: string; quantity: number; unit_price?: number; tax_rate?: number; promised_date?: string | null; received_quantity?: number }
      >;
      demand_forecasts: TableDefinition<
        { id: string; organization_id: string; product_id: string; warehouse_id: string; forecast_date: string; forecast_quantity: number; confidence: number | null; source: string; created_by: string; created_at: string; updated_at: string },
        { id?: string; organization_id: string; product_id: string; warehouse_id: string; forecast_date: string; forecast_quantity: number; confidence?: number | null; source?: string; created_by: string }
      >;
      procurement_record_links: TableDefinition<
        { id: string; organization_id: string; source_record_id: string; target_record_id: string; relation_type: string; created_by: string; created_at: string },
        { id?: string; organization_id: string; source_record_id: string; target_record_id: string; relation_type: string; created_by: string }
      >;
      purchase_order_acknowledgements: TableDefinition<
        { id: string; organization_id: string; purchase_order_id: string; supplier_id: string; response: string; proposed_amount: number | null; proposed_delivery_date: string | null; message: string | null; responded_by: string; responded_at: string },
        { id?: string; organization_id: string; purchase_order_id: string; supplier_id: string; response: string; proposed_amount?: number | null; proposed_delivery_date?: string | null; message?: string | null; responded_by: string; responded_at?: string }
      >;
      workflow_events: TableDefinition<
        { id: string; organization_id: string; supplier_id: string | null; entity_type: string; entity_id: string; from_status: string | null; to_status: string; message: string | null; actor_id: string | null; occurred_at: string },
        { id?: string; organization_id: string; supplier_id?: string | null; entity_type: string; entity_id: string; from_status?: string | null; to_status: string; message?: string | null; actor_id?: string | null; occurred_at?: string }
      >;
      shipment_lines: TableDefinition<
        { id: string; organization_id: string; shipment_id: string; purchase_order_line_id: string | null; product_id: string | null; description: string; quantity: number; received_quantity: number; created_at: string; updated_at: string },
        { id?: string; organization_id: string; shipment_id: string; purchase_order_line_id?: string | null; product_id?: string | null; description: string; quantity: number; received_quantity?: number }
      >;
      shipment_events: TableDefinition<
        { id: string; organization_id: string; shipment_id: string; status: string; location: string | null; latitude: number | null; longitude: number | null; message: string | null; recorded_by: string; occurred_at: string },
        { id?: string; organization_id: string; shipment_id: string; status: string; location?: string | null; latitude?: number | null; longitude?: number | null; message?: string | null; recorded_by: string; occurred_at?: string }
      >;
      goods_receipts: TableDefinition<
        { id: string; organization_id: string; shipment_id: string; purchase_order_id: string | null; warehouse_id: string; reference: string; status: string; received_by: string; received_at: string; notes: string | null; created_at: string; updated_at: string },
        { id?: string; organization_id: string; shipment_id: string; purchase_order_id?: string | null; warehouse_id: string; reference: string; status?: string; received_by: string; received_at?: string; notes?: string | null }
      >;
      goods_receipt_lines: TableDefinition<
        { id: string; organization_id: string; goods_receipt_id: string; shipment_line_id: string; product_id: string | null; expected_quantity: number; accepted_quantity: number; rejected_quantity: number; rejection_reason: string | null; quality_ok: boolean; condition_ok: boolean; packaging_ok: boolean; created_at: string },
        { id?: string; organization_id: string; goods_receipt_id: string; shipment_line_id: string; product_id?: string | null; expected_quantity: number; accepted_quantity?: number; rejected_quantity?: number; rejection_reason?: string | null; quality_ok?: boolean; condition_ok?: boolean; packaging_ok?: boolean }
      >;
      vendor_return_requests: TableDefinition<
        { id: string; organization_id: string; supplier_id: string; goods_receipt_line_id: string; reference: string; reason: string; quantity: number; resolution: string | null; status: string; created_by: string; created_at: string; updated_at: string },
        { id?: string; organization_id: string; supplier_id: string; goods_receipt_line_id: string; reference: string; reason: string; quantity: number; resolution?: string | null; status?: string; created_by: string }
      >;
      vendor_invoices: TableDefinition<
        { id: string; organization_id: string; supplier_id: string; purchase_order_id: string; invoice_number: string; invoice_date: string; due_date: string; subtotal: number; tax_amount: number; total_amount: number; currency: string; status: string; storage_path: string | null; mismatch_reason: string | null; submitted_by: string; submitted_at: string; approved_by: string | null; approved_at: string | null; created_at: string; updated_at: string },
        { id?: string; organization_id: string; supplier_id: string; purchase_order_id: string; invoice_number: string; invoice_date: string; due_date: string; subtotal: number; tax_amount?: number; total_amount: number; currency?: string; status?: string; storage_path?: string | null; mismatch_reason?: string | null; submitted_by: string; submitted_at?: string; approved_by?: string | null; approved_at?: string | null }
      >;
      vendor_invoice_lines: TableDefinition<
        { id: string; organization_id: string; invoice_id: string; purchase_order_line_id: string | null; description: string; quantity: number; unit_price: number; tax_rate: number; created_at: string },
        { id?: string; organization_id: string; invoice_id: string; purchase_order_line_id?: string | null; description: string; quantity: number; unit_price: number; tax_rate?: number }
      >;
      invoice_matches: TableDefinition<
        { id: string; organization_id: string; invoice_id: string; purchase_order_amount: number; received_amount: number; invoice_amount: number; price_variance: number; quantity_variance: number; result: string; details: Json; matched_by: string; matched_at: string },
        { id?: string; organization_id: string; invoice_id: string; purchase_order_amount: number; received_amount: number; invoice_amount: number; price_variance?: number; quantity_variance?: number; result: string; details?: Json; matched_by: string; matched_at?: string }
      >;
      payment_records: TableDefinition<
        { id: string; organization_id: string; supplier_id: string; invoice_id: string; reference: string; amount: number; currency: string; payment_method: string | null; status: string; scheduled_at: string | null; paid_at: string | null; recorded_by: string; created_at: string; updated_at: string },
        { id?: string; organization_id: string; supplier_id: string; invoice_id: string; reference: string; amount: number; currency?: string; payment_method?: string | null; status?: string; scheduled_at?: string | null; paid_at?: string | null; recorded_by: string }
      >;
      vendor_performance_snapshots: TableDefinition<
        { id: string; organization_id: string; supplier_id: string; period_start: string; period_end: string; on_time_delivery_rate: number; fulfillment_rate: number; quality_score: number; accuracy_score: number; response_time_hours: number; overall_score: number; order_count: number; calculated_at: string; calculated_by: string | null },
        { id?: string; organization_id: string; supplier_id: string; period_start: string; period_end: string; on_time_delivery_rate?: number; fulfillment_rate?: number; quality_score?: number; accuracy_score?: number; response_time_hours?: number; overall_score?: number; order_count?: number; calculated_at?: string; calculated_by?: string | null }
      >;
      vendor_reviews: TableDefinition<
        { id: string; organization_id: string; supplier_id: string; action: string; summary: string; review_date: string; next_review_date: string | null; created_by: string; created_at: string },
        { id?: string; organization_id: string; supplier_id: string; action: string; summary: string; review_date?: string; next_review_date?: string | null; created_by: string }
      >;
      vendor_improvement_plans: TableDefinition<
        { id: string; organization_id: string; supplier_id: string; title: string; objectives: string; due_date: string; status: string; owner_id: string; created_at: string; updated_at: string },
        { id?: string; organization_id: string; supplier_id: string; title: string; objectives: string; due_date: string; status?: string; owner_id: string }
      >;
      notifications: TableDefinition<
        { id: string; organization_id: string; supplier_id: string | null; user_id: string | null; audience: string; title: string; message: string; href: string | null; read_at: string | null; created_at: string },
        { id?: string; organization_id: string; supplier_id?: string | null; user_id?: string | null; audience: string; title: string; message: string; href?: string | null; read_at?: string | null }
      >;
      public_vendor_application_attempts: TableDefinition<
        { id: string; identifier_hash: string; attempted_at: string },
        { id?: string; identifier_hash: string; attempted_at?: string }
      >;
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
      activate_my_vendor_access: {
        Args: Record<string, never>;
        Returns: number;
      };
      is_active_vendor_user: {
        Args: { target_organization_id: string; target_supplier_id: string };
        Returns: boolean;
      };
      generate_reorder_requisitions: {
        Args: { target_organization_id: string };
        Returns: number;
      };
      vendor_update_my_profile: {
        Args: {
          target_organization_id: string; target_supplier_id: string; new_contact_email: string;
          new_phone: string; new_website: string; new_address_line: string; new_city: string;
          new_province: string; new_postal_code: string; new_delivery_capacity: number;
          new_delivery_methods: string[]; new_service_areas: string[];
        };
        Returns: undefined;
      };
      acknowledge_purchase_order: {
        Args: {
          target_organization_id: string; target_supplier_id: string; target_purchase_order_id: string;
          target_response: string; target_proposed_amount?: number | null;
          target_proposed_delivery_date?: string | null; target_message?: string | null;
        };
        Returns: string;
      };
      record_goods_receipt: {
        Args: {
          target_organization_id: string;
          target_shipment_line_id: string;
          target_accepted_quantity: number;
          target_rejected_quantity: number;
          target_reference: string;
          target_quality_ok: boolean;
          target_condition_ok: boolean;
          target_packaging_ok: boolean;
          target_rejection_reason?: string | null;
        };
        Returns: string;
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
