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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          color_label: string | null
          created_at: string
          created_by: string
          description: string | null
          end_at: string
          id: string
          is_all_day: boolean
          kind: string
          location: string | null
          resource_code: string
          start_at: string
          status: string
          ticket_id: string | null
          title: string
          updated_at: string
          visibility: string
        }
        Insert: {
          color_label?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          end_at: string
          id?: string
          is_all_day?: boolean
          kind?: string
          location?: string | null
          resource_code: string
          start_at: string
          status?: string
          ticket_id?: string | null
          title: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          color_label?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          end_at?: string
          id?: string
          is_all_day?: boolean
          kind?: string
          location?: string | null
          resource_code?: string
          start_at?: string
          status?: string
          ticket_id?: string | null
          title?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_resource_code_fkey"
            columns: ["resource_code"]
            isOneToOne: false
            referencedRelation: "schedule_resources"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "activities_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: string
        }
        Relationships: []
      }
      assets: {
        Row: {
          asset_tag: string | null
          assigned_profile_id: string | null
          created_at: string
          id: string
          metadata: Json
          name: string
          serial_number: string | null
          status: string
          type: string | null
          updated_at: string
        }
        Insert: {
          asset_tag?: string | null
          assigned_profile_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          name: string
          serial_number?: string | null
          status?: string
          type?: string | null
          updated_at?: string
        }
        Update: {
          asset_tag?: string | null
          assigned_profile_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          name?: string
          serial_number?: string | null
          status?: string
          type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assets_assigned_profile_id_fkey"
            columns: ["assigned_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hc_audit_cases: {
        Row: {
          case_number: string
          closed_at: string | null
          current_stage: string
          id: string
          opened_at: string
          status: string
          summary: string | null
          tax_type: string
          tax_year: number | null
          taxpayer_user_id: string
        }
        Insert: {
          case_number: string
          closed_at?: string | null
          current_stage: string
          id?: string
          opened_at?: string
          status: string
          summary?: string | null
          tax_type: string
          tax_year?: number | null
          taxpayer_user_id: string
        }
        Update: {
          case_number?: string
          closed_at?: string | null
          current_stage?: string
          id?: string
          opened_at?: string
          status?: string
          summary?: string | null
          tax_type?: string
          tax_year?: number | null
          taxpayer_user_id?: string
        }
        Relationships: []
      }
      hc_audit_events: {
        Row: {
          action: string
          actor_id: string | null
          correlation_id: string
          id: number
          metadata: Json
          occurred_at: string
          resource_id: string
          resource_type: string
          result: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          correlation_id?: string
          id?: never
          metadata?: Json
          occurred_at?: string
          resource_id: string
          resource_type: string
          result?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          correlation_id?: string
          id?: never
          metadata?: Json
          occurred_at?: string
          resource_id?: string
          resource_type?: string
          result?: string
        }
        Relationships: []
      }
      hc_certificate_requests: {
        Row: {
          certificate_id: string | null
          certificate_type: string
          decided_at: string | null
          declaration_id: string | null
          id: string
          notes: string | null
          status: string
          submitted_at: string
          user_id: string
        }
        Insert: {
          certificate_id?: string | null
          certificate_type: string
          decided_at?: string | null
          declaration_id?: string | null
          id?: string
          notes?: string | null
          status?: string
          submitted_at?: string
          user_id: string
        }
        Update: {
          certificate_id?: string | null
          certificate_type?: string
          decided_at?: string | null
          declaration_id?: string | null
          id?: string
          notes?: string | null
          status?: string
          submitted_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hc_certificate_requests_certificate_id_fkey"
            columns: ["certificate_id"]
            isOneToOne: false
            referencedRelation: "hc_certificates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hc_certificate_requests_declaration_id_fkey"
            columns: ["declaration_id"]
            isOneToOne: false
            referencedRelation: "hc_declarations"
            referencedColumns: ["id"]
          },
        ]
      }
      hc_certificates: {
        Row: {
          declaration_id: string
          document_sha256: string
          id: string
          issued_at: string
          revoked_at: string | null
          serial: string
          type: string
          verification_token_hash: string
        }
        Insert: {
          declaration_id: string
          document_sha256: string
          id?: string
          issued_at?: string
          revoked_at?: string | null
          serial: string
          type: string
          verification_token_hash: string
        }
        Update: {
          declaration_id?: string
          document_sha256?: string
          id?: string
          issued_at?: string
          revoked_at?: string | null
          serial?: string
          type?: string
          verification_token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "hc_certificates_declaration_id_fkey"
            columns: ["declaration_id"]
            isOneToOne: false
            referencedRelation: "hc_declarations"
            referencedColumns: ["id"]
          },
        ]
      }
      hc_declarations: {
        Row: {
          balance_due_cop: number
          calculation: Json | null
          created_at: string
          document_sha256: string | null
          filed_at: string | null
          id: string
          payload: Json
          period: string
          status: Database["public"]["Enums"]["hc_declaration_status"]
          tax_type: string
          tax_year: number
          taxpayer_user_id: string
          updated_at: string
        }
        Insert: {
          balance_due_cop?: number
          calculation?: Json | null
          created_at?: string
          document_sha256?: string | null
          filed_at?: string | null
          id?: string
          payload?: Json
          period: string
          status?: Database["public"]["Enums"]["hc_declaration_status"]
          tax_type: string
          tax_year: number
          taxpayer_user_id: string
          updated_at?: string
        }
        Update: {
          balance_due_cop?: number
          calculation?: Json | null
          created_at?: string
          document_sha256?: string | null
          filed_at?: string | null
          id?: string
          payload?: Json
          period?: string
          status?: Database["public"]["Enums"]["hc_declaration_status"]
          tax_type?: string
          tax_year?: number
          taxpayer_user_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      hc_establishments: {
        Row: {
          address: string
          created_at: string
          id: string
          is_main: boolean
          municipality: string
          name: string
          registration_id: string
          status: string
        }
        Insert: {
          address: string
          created_at?: string
          id?: string
          is_main?: boolean
          municipality?: string
          name: string
          registration_id: string
          status?: string
        }
        Update: {
          address?: string
          created_at?: string
          id?: string
          is_main?: boolean
          municipality?: string
          name?: string
          registration_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "hc_establishments_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "hc_taxpayer_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      hc_filing_calendar: {
        Row: {
          created_at: string
          due_date: string | null
          id: string
          legal_reference: string | null
          period: string
          status: string
          tax_type: string
          tax_year: number
        }
        Insert: {
          created_at?: string
          due_date?: string | null
          id?: string
          legal_reference?: string | null
          period: string
          status?: string
          tax_type: string
          tax_year: number
        }
        Update: {
          created_at?: string
          due_date?: string | null
          id?: string
          legal_reference?: string | null
          period?: string
          status?: string
          tax_type?: string
          tax_year?: number
        }
        Relationships: []
      }
      hc_ica_tariffs: {
        Row: {
          activity: string
          ciiu: string
          created_at: string
          id: string
          legal_reference: string
          rate_per_thousand: number
          status: string
          valid_from: string
          valid_to: string | null
        }
        Insert: {
          activity: string
          ciiu: string
          created_at?: string
          id?: string
          legal_reference: string
          rate_per_thousand: number
          status: string
          valid_from: string
          valid_to?: string | null
        }
        Update: {
          activity?: string
          ciiu?: string
          created_at?: string
          id?: string
          legal_reference?: string
          rate_per_thousand?: number
          status?: string
          valid_from?: string
          valid_to?: string | null
        }
        Relationships: []
      }
      hc_legal_sources: {
        Row: {
          code: string
          created_at: string
          id: string
          norm_number: string | null
          norm_type: string
          norm_year: number | null
          notes: string | null
          source_url: string | null
          status: string
          title: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          norm_number?: string | null
          norm_type: string
          norm_year?: number | null
          notes?: string | null
          source_url?: string | null
          status: string
          title: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          norm_number?: string | null
          norm_type?: string
          norm_year?: number | null
          notes?: string | null
          source_url?: string | null
          status?: string
          title?: string
        }
        Relationships: []
      }
      hc_payment_agreements: {
        Row: {
          created_at: string
          debt_reference: string | null
          debt_type: string
          id: string
          interest_cop: number
          principal_cop: number
          requested_installments: number
          schedule: Json
          status: string
          submitted_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          debt_reference?: string | null
          debt_type: string
          id?: string
          interest_cop?: number
          principal_cop: number
          requested_installments: number
          schedule?: Json
          status?: string
          submitted_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          debt_reference?: string | null
          debt_type?: string
          id?: string
          interest_cop?: number
          principal_cop?: number
          requested_installments?: number
          schedule?: Json
          status?: string
          submitted_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      hc_payment_requests: {
        Row: {
          amount_cop: number
          checkout_url: string | null
          created_at: string
          declaration_id: string
          id: string
          idempotency_key: string
          provider: string | null
          reference: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_cop: number
          checkout_url?: string | null
          created_at?: string
          declaration_id: string
          id?: string
          idempotency_key?: string
          provider?: string | null
          reference: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_cop?: number
          checkout_url?: string | null
          created_at?: string
          declaration_id?: string
          id?: string
          idempotency_key?: string
          provider?: string | null
          reference?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hc_payment_requests_declaration_id_fkey"
            columns: ["declaration_id"]
            isOneToOne: false
            referencedRelation: "hc_declarations"
            referencedColumns: ["id"]
          },
        ]
      }
      hc_payments: {
        Row: {
          amount_cop: number
          created_at: string
          declaration_id: string
          id: string
          provider: string
          provider_payload_hash: string | null
          provider_payment_id: string
          reference: string
          status: string
          verified_at: string | null
        }
        Insert: {
          amount_cop: number
          created_at?: string
          declaration_id: string
          id?: string
          provider: string
          provider_payload_hash?: string | null
          provider_payment_id: string
          reference: string
          status: string
          verified_at?: string | null
        }
        Update: {
          amount_cop?: number
          created_at?: string
          declaration_id?: string
          id?: string
          provider?: string
          provider_payload_hash?: string | null
          provider_payment_id?: string
          reference?: string
          status?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hc_payments_declaration_id_fkey"
            columns: ["declaration_id"]
            isOneToOne: false
            referencedRelation: "hc_declarations"
            referencedColumns: ["id"]
          },
        ]
      }
      hc_paz_y_salvo_requests: {
        Row: {
          certificate_id: string | null
          decided_at: string | null
          id: string
          notes: string | null
          property_account_id: string | null
          request_type: string
          status: string
          submitted_at: string
          user_id: string
        }
        Insert: {
          certificate_id?: string | null
          decided_at?: string | null
          id?: string
          notes?: string | null
          property_account_id?: string | null
          request_type?: string
          status?: string
          submitted_at?: string
          user_id: string
        }
        Update: {
          certificate_id?: string | null
          decided_at?: string | null
          id?: string
          notes?: string | null
          property_account_id?: string | null
          request_type?: string
          status?: string
          submitted_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hc_paz_y_salvo_requests_certificate_id_fkey"
            columns: ["certificate_id"]
            isOneToOne: false
            referencedRelation: "hc_certificates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hc_paz_y_salvo_requests_property_account_id_fkey"
            columns: ["property_account_id"]
            isOneToOne: false
            referencedRelation: "hc_property_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      hc_profiles: {
        Row: {
          created_at: string
          document_number_hash: string
          document_type: string
          email: string
          full_name: string
          identity_verified_at: string | null
          phone_e164: string
          role: Database["public"]["Enums"]["hc_app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          document_number_hash: string
          document_type: string
          email: string
          full_name: string
          identity_verified_at?: string | null
          phone_e164: string
          role?: Database["public"]["Enums"]["hc_app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          document_number_hash?: string
          document_type?: string
          email?: string
          full_name?: string
          identity_verified_at?: string | null
          phone_e164?: string
          role?: Database["public"]["Enums"]["hc_app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      hc_property_accounts: {
        Row: {
          address: string
          assessed_value_cop: number | null
          cadastral_number_hash: string
          environmental_surcharge_cop: number
          firefighter_surcharge_cop: number
          id: string
          metadata: Json
          property_number: string
          source_system: string
          tax_balance_cop: number
          tax_year: number
          updated_at: string
          user_id: string
        }
        Insert: {
          address: string
          assessed_value_cop?: number | null
          cadastral_number_hash: string
          environmental_surcharge_cop?: number
          firefighter_surcharge_cop?: number
          id?: string
          metadata?: Json
          property_number: string
          source_system?: string
          tax_balance_cop?: number
          tax_year: number
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string
          assessed_value_cop?: number | null
          cadastral_number_hash?: string
          environmental_surcharge_cop?: number
          firefighter_surcharge_cop?: number
          id?: string
          metadata?: Json
          property_number?: string
          source_system?: string
          tax_balance_cop?: number
          tax_year?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      hc_refund_requests: {
        Row: {
          amount_cop: number
          bank_account_masked: string | null
          created_at: string
          decision_reference: string | null
          id: string
          reason: string
          status: string
          submitted_at: string | null
          tax_type: string
          tax_year: number | null
          user_id: string
        }
        Insert: {
          amount_cop: number
          bank_account_masked?: string | null
          created_at?: string
          decision_reference?: string | null
          id?: string
          reason: string
          status?: string
          submitted_at?: string | null
          tax_type: string
          tax_year?: number | null
          user_id: string
        }
        Update: {
          amount_cop?: number
          bank_account_masked?: string | null
          created_at?: string
          decision_reference?: string | null
          id?: string
          reason?: string
          status?: string
          submitted_at?: string | null
          tax_type?: string
          tax_year?: number | null
          user_id?: string
        }
        Relationships: []
      }
      hc_revenue_catalog: {
        Row: {
          category: string
          code: string
          id: string
          implementation_phase: number
          implementation_status: string
          name: string
          notes: string | null
        }
        Insert: {
          category: string
          code: string
          id?: string
          implementation_phase?: number
          implementation_status: string
          name: string
          notes?: string | null
        }
        Update: {
          category?: string
          code?: string
          id?: string
          implementation_phase?: number
          implementation_status?: string
          name?: string
          notes?: string | null
        }
        Relationships: []
      }
      hc_signature_evidence: {
        Row: {
          auth_method: string
          declaration_id: string
          document_sha256: string
          evidence: Json
          id: string
          signed_at: string
          signer_user_id: string
        }
        Insert: {
          auth_method: string
          declaration_id: string
          document_sha256: string
          evidence?: Json
          id?: string
          signed_at?: string
          signer_user_id: string
        }
        Update: {
          auth_method?: string
          declaration_id?: string
          document_sha256?: string
          evidence?: Json
          id?: string
          signed_at?: string
          signer_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hc_signature_evidence_declaration_id_fkey"
            columns: ["declaration_id"]
            isOneToOne: false
            referencedRelation: "hc_declarations"
            referencedColumns: ["id"]
          },
        ]
      }
      hc_system_integrations: {
        Row: {
          code: string
          display_name: string
          last_checked_at: string
          notes: string | null
          provider: string | null
          status: string
        }
        Insert: {
          code: string
          display_name: string
          last_checked_at?: string
          notes?: string | null
          provider?: string | null
          status: string
        }
        Update: {
          code?: string
          display_name?: string
          last_checked_at?: string
          notes?: string | null
          provider?: string | null
          status?: string
        }
        Relationships: []
      }
      hc_tax_parameters: {
        Row: {
          created_at: string
          id: string
          key: string
          legal_reference: string
          numeric_value: number | null
          status: string
          tax_year: number
          text_value: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          legal_reference: string
          numeric_value?: number | null
          status: string
          tax_year: number
          text_value?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          legal_reference?: string
          numeric_value?: number | null
          status?: string
          tax_year?: number
          text_value?: string | null
        }
        Relationships: []
      }
      hc_taxpayer_activities: {
        Row: {
          ciiu: string
          id: string
          is_primary: boolean
          registration_id: string
          valid_from: string
          valid_to: string | null
        }
        Insert: {
          ciiu: string
          id?: string
          is_primary?: boolean
          registration_id: string
          valid_from?: string
          valid_to?: string | null
        }
        Update: {
          ciiu?: string
          id?: string
          is_primary?: boolean
          registration_id?: string
          valid_from?: string
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hc_taxpayer_activities_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "hc_taxpayer_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      hc_taxpayer_registrations: {
        Row: {
          business_name: string
          created_at: string
          data_policy_accepted_at: string
          data_policy_version: string
          department: string
          fiscal_address: string
          id: string
          municipality: string
          person_type: string
          status: string
          tax_identifier_hash: string
          updated_at: string
          user_id: string
          verified_at: string | null
        }
        Insert: {
          business_name: string
          created_at?: string
          data_policy_accepted_at: string
          data_policy_version: string
          department?: string
          fiscal_address: string
          id?: string
          municipality?: string
          person_type: string
          status?: string
          tax_identifier_hash: string
          updated_at?: string
          user_id: string
          verified_at?: string | null
        }
        Update: {
          business_name?: string
          created_at?: string
          data_policy_accepted_at?: string
          data_policy_version?: string
          department?: string
          fiscal_address?: string
          id?: string
          municipality?: string
          person_type?: string
          status?: string
          tax_identifier_hash?: string
          updated_at?: string
          user_id?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      hc_taxpayer_relationships: {
        Row: {
          created_at: string
          evidence_sha256: string | null
          id: string
          professional_card: string | null
          registration_id: string
          related_document_hash: string | null
          related_email: string | null
          related_name: string | null
          related_user_id: string | null
          relation_type: string
          valid_from: string
          valid_to: string | null
        }
        Insert: {
          created_at?: string
          evidence_sha256?: string | null
          id?: string
          professional_card?: string | null
          registration_id: string
          related_document_hash?: string | null
          related_email?: string | null
          related_name?: string | null
          related_user_id?: string | null
          relation_type: string
          valid_from?: string
          valid_to?: string | null
        }
        Update: {
          created_at?: string
          evidence_sha256?: string | null
          id?: string
          professional_card?: string | null
          registration_id?: string
          related_document_hash?: string | null
          related_email?: string | null
          related_name?: string | null
          related_user_id?: string | null
          relation_type?: string
          valid_from?: string
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hc_taxpayer_relationships_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "hc_taxpayer_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      hc_user_notifications: {
        Row: {
          action_url: string | null
          body: string
          created_at: string
          id: string
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          body: string
          created_at?: string
          id?: string
          read_at?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          body?: string
          created_at?: string
          id?: string
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      import_jobs: {
        Row: {
          created_at: string
          created_by: string
          error_rows: number
          errors: Json
          file_name: string | null
          id: string
          import_type: string
          status: string
          total_rows: number
          valid_rows: number
        }
        Insert: {
          created_at?: string
          created_by: string
          error_rows?: number
          errors?: Json
          file_name?: string | null
          id?: string
          import_type: string
          status?: string
          total_rows?: number
          valid_rows?: number
        }
        Update: {
          created_at?: string
          created_by?: string
          error_rows?: number
          errors?: Json
          file_name?: string | null
          id?: string
          import_type?: string
          status?: string
          total_rows?: number
          valid_rows?: number
        }
        Relationships: [
          {
            foreignKeyName: "import_jobs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      institutional_emails: {
        Row: {
          aliases: string[] | null
          created_at: string
          display_name: string | null
          email: string
          id: string
          metadata: Json
          profile_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          aliases?: string[] | null
          created_at?: string
          display_name?: string | null
          email: string
          id?: string
          metadata?: Json
          profile_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          aliases?: string[] | null
          created_at?: string
          display_name?: string | null
          email?: string
          id?: string
          metadata?: Json
          profile_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "institutional_emails_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_articles: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          created_by?: string | null
          id?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_articles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      launch_admin_emails: {
        Row: {
          created_at: string
          email: string
          label: string | null
          role_code: string
          team_code: string | null
        }
        Insert: {
          created_at?: string
          email: string
          label?: string | null
          role_code: string
          team_code?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          label?: string | null
          role_code?: string
          team_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "launch_admin_emails_role_code_fkey"
            columns: ["role_code"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "launch_admin_emails_team_code_fkey"
            columns: ["team_code"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["code"]
          },
        ]
      }
      modules: {
        Row: {
          code: string
          description: string | null
          is_active: boolean
          label: string
          nav_order: number
          required_permission: string | null
        }
        Insert: {
          code: string
          description?: string | null
          is_active?: boolean
          label: string
          nav_order?: number
          required_permission?: string | null
        }
        Update: {
          code?: string
          description?: string | null
          is_active?: boolean
          label?: string
          nav_order?: number
          required_permission?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "modules_required_permission_fkey"
            columns: ["required_permission"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["code"]
          },
        ]
      }
      notification_delivery_queue: {
        Row: {
          attempts: number
          channel: string
          created_at: string
          destination: string | null
          id: string
          last_attempt_at: string | null
          last_error: string | null
          locked_at: string | null
          max_attempts: number
          next_attempt_at: string | null
          notification_id: string | null
          payload: Json
          processed_by: string | null
          profile_id: string | null
          provider: string
          sent_at: string | null
          status: string
          ticket_id: string | null
        }
        Insert: {
          attempts?: number
          channel: string
          created_at?: string
          destination?: string | null
          id?: string
          last_attempt_at?: string | null
          last_error?: string | null
          locked_at?: string | null
          max_attempts?: number
          next_attempt_at?: string | null
          notification_id?: string | null
          payload?: Json
          processed_by?: string | null
          profile_id?: string | null
          provider?: string
          sent_at?: string | null
          status?: string
          ticket_id?: string | null
        }
        Update: {
          attempts?: number
          channel?: string
          created_at?: string
          destination?: string | null
          id?: string
          last_attempt_at?: string | null
          last_error?: string | null
          locked_at?: string | null
          max_attempts?: number
          next_attempt_at?: string | null
          notification_id?: string | null
          payload?: Json
          processed_by?: string | null
          profile_id?: string | null
          provider?: string
          sent_at?: string | null
          status?: string
          ticket_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_delivery_queue_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_delivery_queue_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_delivery_queue_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_delivery_queue_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          body: string | null
          channel: string
          created_at: string
          delivered_at: string | null
          event_type: string | null
          id: string
          metadata: Json
          profile_id: string
          read_at: string | null
          severity: string
          ticket_id: string | null
          title: string
        }
        Insert: {
          action_url?: string | null
          body?: string | null
          channel?: string
          created_at?: string
          delivered_at?: string | null
          event_type?: string | null
          id?: string
          metadata?: Json
          profile_id: string
          read_at?: string | null
          severity?: string
          ticket_id?: string | null
          title: string
        }
        Update: {
          action_url?: string | null
          body?: string | null
          channel?: string
          created_at?: string
          delivered_at?: string | null
          event_type?: string | null
          id?: string
          metadata?: Json
          profile_id?: string
          read_at?: string | null
          severity?: string
          ticket_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          code: string
          description: string
        }
        Insert: {
          code: string
          description: string
        }
        Update: {
          code?: string
          description?: string
        }
        Relationships: []
      }
      profile_roles: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          profile_id: string
          role_code: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          profile_id: string
          role_code: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          profile_id?: string
          role_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_roles_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_roles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_roles_role_code_fkey"
            columns: ["role_code"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["code"]
          },
        ]
      }
      profile_teams: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          profile_id: string
          team_code: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          profile_id: string
          team_code: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          profile_id?: string
          team_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_teams_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_teams_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_teams_team_code_fkey"
            columns: ["team_code"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["code"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          phone: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          permission_code: string
          role_code: string
        }
        Insert: {
          permission_code: string
          role_code: string
        }
        Update: {
          permission_code?: string
          role_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_code_fkey"
            columns: ["permission_code"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "role_permissions_role_code_fkey"
            columns: ["role_code"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["code"]
          },
        ]
      }
      roles: {
        Row: {
          code: string
          created_at: string
          description: string | null
          is_admin: boolean
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          is_admin?: boolean
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          is_admin?: boolean
          name?: string
        }
        Relationships: []
      }
      schedule_resources: {
        Row: {
          code: string
          created_at: string
          display_order: number
          initials: string
          is_active: boolean
          name: string
          profile_id: string | null
          role_label: string
          team_code: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          display_order?: number
          initials: string
          is_active?: boolean
          name: string
          profile_id?: string | null
          role_label: string
          team_code?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          display_order?: number
          initials?: string
          is_active?: boolean
          name?: string
          profile_id?: string | null
          role_label?: string
          team_code?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_resources_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_resources_team_code_fkey"
            columns: ["team_code"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["code"]
          },
        ]
      }
      services: {
        Row: {
          category: string | null
          code: string
          created_at: string
          description: string | null
          icon_key: string | null
          id: string
          is_active: boolean
          is_requestable: boolean
          name: string
          team_code: string
          updated_at: string
          visual_order: number
        }
        Insert: {
          category?: string | null
          code: string
          created_at?: string
          description?: string | null
          icon_key?: string | null
          id?: string
          is_active?: boolean
          is_requestable?: boolean
          name: string
          team_code: string
          updated_at?: string
          visual_order?: number
        }
        Update: {
          category?: string | null
          code?: string
          created_at?: string
          description?: string | null
          icon_key?: string | null
          id?: string
          is_active?: boolean
          is_requestable?: boolean
          name?: string
          team_code?: string
          updated_at?: string
          visual_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "services_team_code_fkey"
            columns: ["team_code"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["code"]
          },
        ]
      }
      teams: {
        Row: {
          code: string
          description: string | null
          is_operational: boolean
          name: string
        }
        Insert: {
          code: string
          description?: string | null
          is_operational?: boolean
          name: string
        }
        Update: {
          code?: string
          description?: string | null
          is_operational?: boolean
          name?: string
        }
        Relationships: []
      }
      ticket_attachments: {
        Row: {
          activity_id: string | null
          created_at: string
          description: string | null
          drive_download_url: string | null
          drive_file_id: string | null
          drive_folder_id: string | null
          drive_url: string | null
          file_name: string
          id: string
          message_id: string | null
          metadata: Json
          mime_type: string | null
          size_bytes: number | null
          source: string
          ticket_id: string | null
          uploaded_by: string | null
        }
        Insert: {
          activity_id?: string | null
          created_at?: string
          description?: string | null
          drive_download_url?: string | null
          drive_file_id?: string | null
          drive_folder_id?: string | null
          drive_url?: string | null
          file_name: string
          id?: string
          message_id?: string | null
          metadata?: Json
          mime_type?: string | null
          size_bytes?: number | null
          source?: string
          ticket_id?: string | null
          uploaded_by?: string | null
        }
        Update: {
          activity_id?: string | null
          created_at?: string
          description?: string | null
          drive_download_url?: string | null
          drive_file_id?: string | null
          drive_folder_id?: string | null
          drive_url?: string | null
          file_name?: string
          id?: string
          message_id?: string | null
          metadata?: Json
          mime_type?: string | null
          size_bytes?: number | null
          source?: string
          ticket_id?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_attachments_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_attachments_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "schedule_activities_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "ticket_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_attachments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_attachments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_counters: {
        Row: {
          current_number: number
          year: number
        }
        Insert: {
          current_number?: number
          year: number
        }
        Update: {
          current_number?: number
          year?: number
        }
        Relationships: []
      }
      ticket_messages: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          ticket_id: string
          visibility: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          ticket_id: string
          visibility?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          ticket_id?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          assigned_resource_code: string | null
          assigned_team_code: string
          closed_at: string | null
          created_at: string
          description: string
          estimated_due_at: string | null
          estimated_minutes: number | null
          id: string
          payload: Json
          preferred_date: string | null
          priority: string
          requester_id: string
          requires_schedule: boolean
          resolved_at: string | null
          service_id: string
          status: string
          ticket_number: string
          title: string
          updated_at: string
          work_mode: string | null
          workload_score: number
          workload_warning: string | null
        }
        Insert: {
          assigned_resource_code?: string | null
          assigned_team_code: string
          closed_at?: string | null
          created_at?: string
          description: string
          estimated_due_at?: string | null
          estimated_minutes?: number | null
          id?: string
          payload?: Json
          preferred_date?: string | null
          priority?: string
          requester_id: string
          requires_schedule?: boolean
          resolved_at?: string | null
          service_id: string
          status?: string
          ticket_number: string
          title: string
          updated_at?: string
          work_mode?: string | null
          workload_score?: number
          workload_warning?: string | null
        }
        Update: {
          assigned_resource_code?: string | null
          assigned_team_code?: string
          closed_at?: string | null
          created_at?: string
          description?: string
          estimated_due_at?: string | null
          estimated_minutes?: number | null
          id?: string
          payload?: Json
          preferred_date?: string | null
          priority?: string
          requester_id?: string
          requires_schedule?: boolean
          resolved_at?: string | null
          service_id?: string
          status?: string
          ticket_number?: string
          title?: string
          updated_at?: string
          work_mode?: string | null
          workload_score?: number
          workload_warning?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_assigned_resource_code_fkey"
            columns: ["assigned_resource_code"]
            isOneToOne: false
            referencedRelation: "schedule_resources"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "tickets_assigned_team_code_fkey"
            columns: ["assigned_team_code"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "tickets_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      user_tutorial_status: {
        Row: {
          created_at: string
          last_step: number
          profile_id: string
          seen_at: string | null
          tutorial_code: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          last_step?: number
          profile_id: string
          seen_at?: string | null
          tutorial_code?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          last_step?: number
          profile_id?: string
          seen_at?: string | null
          tutorial_code?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_tutorial_status_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      schedule_activities_public: {
        Row: {
          color_label: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          end_at: string | null
          id: string | null
          initials: string | null
          is_all_day: boolean | null
          kind: string | null
          location: string | null
          profile_id: string | null
          resource_code: string | null
          resource_name: string | null
          role_label: string | null
          start_at: string | null
          status: string | null
          team_code: string | null
          ticket_id: string | null
          title: string | null
          updated_at: string | null
          visibility: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_resource_code_fkey"
            columns: ["resource_code"]
            isOneToOne: false
            referencedRelation: "schedule_resources"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "activities_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_resources_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_resources_team_code_fkey"
            columns: ["team_code"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["code"]
          },
        ]
      }
      ticket_attachments_secure: {
        Row: {
          activity_id: string | null
          created_at: string | null
          description: string | null
          drive_download_url: string | null
          drive_file_id: string | null
          drive_folder_id: string | null
          drive_url: string | null
          file_name: string | null
          id: string | null
          message_id: string | null
          metadata: Json | null
          mime_type: string | null
          size_bytes: number | null
          source: string | null
          ticket_id: string | null
          ticket_number: string | null
          ticket_title: string | null
          uploaded_by: string | null
          uploaded_by_email: string | null
          uploaded_by_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_attachments_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_attachments_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "schedule_activities_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "ticket_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_attachments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_attachments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets_secure: {
        Row: {
          assigned_resource_code: string | null
          assigned_resource_name: string | null
          assigned_team_code: string | null
          created_at: string | null
          description: string | null
          estimated_due_at: string | null
          estimated_minutes: number | null
          id: string | null
          payload: Json | null
          preferred_date: string | null
          priority: string | null
          requester_id: string | null
          requires_schedule: boolean | null
          service_category: string | null
          service_code: string | null
          service_icon_key: string | null
          service_name: string | null
          service_team_code: string | null
          status: string | null
          ticket_number: string | null
          title: string | null
          updated_at: string | null
          work_mode: string | null
          workload_score: number | null
          workload_warning: string | null
        }
        Relationships: [
          {
            foreignKeyName: "services_team_code_fkey"
            columns: ["service_team_code"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "tickets_assigned_resource_code_fkey"
            columns: ["assigned_resource_code"]
            isOneToOne: false
            referencedRelation: "schedule_resources"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "tickets_assigned_team_code_fkey"
            columns: ["assigned_team_code"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "tickets_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      admin_upsert_profile: {
        Args: {
          p_actor_id: string
          p_email: string
          p_full_name: string
          p_profile_id: string
          p_role_code: string
          p_team_code: string
        }
        Returns: undefined
      }
      app_bootstrap: { Args: never; Returns: Json }
      can_access_team: { Args: { p_team: string }; Returns: boolean }
      create_activity: {
        Args: {
          p_end_at: string
          p_kind?: string
          p_resource_code: string
          p_start_at: string
          p_title: string
        }
        Returns: Json
      }
      create_activity_for_ticket_v2: {
        Args: {
          p_description?: string
          p_end_at: string
          p_kind?: string
          p_location?: string
          p_resource_code: string
          p_start_at: string
          p_ticket_id: string
          p_title: string
        }
        Returns: Json
      }
      create_activity_v2: {
        Args: {
          p_color_label?: string
          p_description?: string
          p_end_at: string
          p_is_all_day?: boolean
          p_kind?: string
          p_location?: string
          p_resource_code: string
          p_start_at: string
          p_title: string
          p_visibility?: string
        }
        Returns: Json
      }
      create_ticket: {
        Args: {
          p_description: string
          p_payload?: Json
          p_preferred_date?: string
          p_service_code: string
          p_title: string
        }
        Returns: Json
      }
      current_profile_id: { Args: never; Returns: string }
      ensure_launch_profile: { Args: never; Returns: undefined }
      get_my_tutorial_status: {
        Args: { p_tutorial_code?: string }
        Returns: Json
      }
      has_permission: { Args: { p_permission: string }; Returns: boolean }
      has_permission_for_user: {
        Args: { p_permission: string; p_user_id: string }
        Returns: boolean
      }
      has_role: { Args: { p_role: string }; Returns: boolean }
      hc_calculate_ica: {
        Args: {
          p_activities: Json
          p_apply_notices?: boolean
          p_tax_year?: number
        }
        Returns: Json
      }
      hc_calculate_reteica: {
        Args: { p_tax_year?: number; p_transactions: Json }
        Returns: Json
      }
      hc_create_declaration: {
        Args: {
          p_balance_due_cop: number
          p_calculation: Json
          p_payload: Json
          p_period: string
          p_tax_type: string
          p_tax_year?: number
        }
        Returns: string
      }
      hc_dashboard_summary: { Args: never; Returns: Json }
      hc_issue_filing_certificate: {
        Args: { p_declaration_id: string }
        Returns: Json
      }
      hc_prepare_declaration_for_signature: {
        Args: { p_declaration_id: string }
        Returns: Database["public"]["Enums"]["hc_declaration_status"]
      }
      hc_register_taxpayer: { Args: { p_data: Json }; Returns: string }
      hc_registry_snapshot: { Args: never; Returns: Json }
      hc_request_payment: {
        Args: { p_declaration_id: string }
        Returns: string
      }
      hc_sign_declaration: {
        Args: {
          p_auth_method?: string
          p_declaration_id: string
          p_document_sha256: string
        }
        Returns: Database["public"]["Enums"]["hc_declaration_status"]
      }
      hc_submit_certificate_request: {
        Args: { p_certificate_type: string; p_declaration_id?: string }
        Returns: string
      }
      hc_submit_payment_agreement: {
        Args: {
          p_debt_type: string
          p_principal_cop: number
          p_requested_installments: number
        }
        Returns: string
      }
      hc_submit_paz_y_salvo: {
        Args: { p_property_account_id: string; p_request_type?: string }
        Returns: string
      }
      hc_submit_refund_request: {
        Args: {
          p_amount_cop: number
          p_reason: string
          p_tax_type: string
          p_tax_year: number
        }
        Returns: string
      }
      is_admin: { Args: never; Returns: boolean }
      mark_tutorial_seen: { Args: { p_tutorial_code?: string }; Returns: Json }
      next_ticket_number: { Args: never; Returns: string }
      profile_initials: {
        Args: { p_email: string; p_full_name: string }
        Returns: string
      }
      refresh_schedule_resource_names: { Args: never; Returns: Json }
      resource_week_load: {
        Args: { p_anchor_date?: string; p_resource_code: string }
        Returns: Json
      }
      service_default_minutes: {
        Args: {
          p_service_code: string
          p_service_name?: string
          p_work_mode?: string
        }
        Returns: number
      }
    }
    Enums: {
      hc_app_role:
        | "citizen"
        | "accountant"
        | "hacienda_reviewer"
        | "hacienda_admin"
        | "auditor"
      hc_declaration_status:
        | "DRAFT"
        | "IDENTITY_VERIFIED"
        | "READY_TO_SIGN"
        | "SIGNED"
        | "PAYMENT_PENDING"
        | "PAID"
        | "FILED"
        | "CERTIFICATE_AVAILABLE"
        | "REJECTED"
        | "CANCELLED"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      hc_app_role: [
        "citizen",
        "accountant",
        "hacienda_reviewer",
        "hacienda_admin",
        "auditor",
      ],
      hc_declaration_status: [
        "DRAFT",
        "IDENTITY_VERIFIED",
        "READY_TO_SIGN",
        "SIGNED",
        "PAYMENT_PENDING",
        "PAID",
        "FILED",
        "CERTIFICATE_AVAILABLE",
        "REJECTED",
        "CANCELLED",
      ],
    },
  },
} as const
