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
      audit_cases: {
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
        Relationships: [
          {
            foreignKeyName: "audit_cases_taxpayer_user_id_fkey"
            columns: ["taxpayer_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      audit_events: {
        Row: {
          action: string
          actor_user_id: string | null
          event_hash: string
          id: string
          metadata: Json
          occurred_at: string
          previous_hash: string | null
          resource_id: string
          resource_type: string
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          event_hash: string
          id?: string
          metadata?: Json
          occurred_at?: string
          previous_hash?: string | null
          resource_id: string
          resource_type: string
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          event_hash?: string
          id?: string
          metadata?: Json
          occurred_at?: string
          previous_hash?: string | null
          resource_id?: string
          resource_type?: string
        }
        Relationships: []
      }
      certificate_requests: {
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
            foreignKeyName: "certificate_requests_certificate_id_fkey"
            columns: ["certificate_id"]
            isOneToOne: false
            referencedRelation: "certificates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificate_requests_declaration_id_fkey"
            columns: ["declaration_id"]
            isOneToOne: false
            referencedRelation: "declarations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificate_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      certificates: {
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
            foreignKeyName: "certificates_declaration_id_fkey"
            columns: ["declaration_id"]
            isOneToOne: false
            referencedRelation: "declarations"
            referencedColumns: ["id"]
          },
        ]
      }
      declarations: {
        Row: {
          balance_due_cop: number
          calculation: Json | null
          created_at: string
          document_sha256: string | null
          filed_at: string | null
          id: string
          payload: Json
          period: string
          rule_version_id: string | null
          status: Database["public"]["Enums"]["declaration_status"]
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
          rule_version_id?: string | null
          status?: Database["public"]["Enums"]["declaration_status"]
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
          rule_version_id?: string | null
          status?: Database["public"]["Enums"]["declaration_status"]
          tax_type?: string
          tax_year?: number
          taxpayer_user_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "declarations_rule_version_id_fkey"
            columns: ["rule_version_id"]
            isOneToOne: false
            referencedRelation: "tax_rule_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "declarations_taxpayer_user_id_fkey"
            columns: ["taxpayer_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      document_artifacts: {
        Row: {
          artifact_type: string
          created_at: string
          declaration_id: string | null
          id: string
          mime_type: string
          owner_user_id: string
          retention_class: string
          sha256: string
          size_bytes: number
          storage_key: string
        }
        Insert: {
          artifact_type: string
          created_at?: string
          declaration_id?: string | null
          id?: string
          mime_type: string
          owner_user_id: string
          retention_class: string
          sha256: string
          size_bytes: number
          storage_key: string
        }
        Update: {
          artifact_type?: string
          created_at?: string
          declaration_id?: string | null
          id?: string
          mime_type?: string
          owner_user_id?: string
          retention_class?: string
          sha256?: string
          size_bytes?: number
          storage_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_artifacts_declaration_id_fkey"
            columns: ["declaration_id"]
            isOneToOne: false
            referencedRelation: "declarations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_artifacts_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      establishments: {
        Row: {
          address: string
          closed_at: string | null
          created_at: string
          id: string
          name: string
          opened_at: string | null
          registration_id: string
          status: string
        }
        Insert: {
          address: string
          closed_at?: string | null
          created_at?: string
          id?: string
          name: string
          opened_at?: string | null
          registration_id: string
          status?: string
        }
        Update: {
          address?: string
          closed_at?: string | null
          created_at?: string
          id?: string
          name?: string
          opened_at?: string | null
          registration_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "establishments_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "taxpayer_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      filing_calendar: {
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
      ica_tariffs: {
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
      legal_sources: {
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
      payment_agreements: {
        Row: {
          created_at: string
          debt_reference: string | null
          debt_type: string
          id: string
          interest_cop: number
          legal_rule_version: string | null
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
          legal_rule_version?: string | null
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
          legal_rule_version?: string | null
          principal_cop?: number
          requested_installments?: number
          schedule?: Json
          status?: string
          submitted_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_agreements_legal_rule_version_fkey"
            columns: ["legal_rule_version"]
            isOneToOne: false
            referencedRelation: "tax_rule_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_agreements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      payment_requests: {
        Row: {
          amount_cop: number
          checkout_url: string | null
          created_at: string
          declaration_id: string
          id: string
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
          provider?: string | null
          reference?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_requests_declaration_id_fkey"
            columns: ["declaration_id"]
            isOneToOne: false
            referencedRelation: "declarations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      payments: {
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
            foreignKeyName: "payments_declaration_id_fkey"
            columns: ["declaration_id"]
            isOneToOne: false
            referencedRelation: "declarations"
            referencedColumns: ["id"]
          },
        ]
      }
      paz_y_salvo_requests: {
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
            foreignKeyName: "paz_y_salvo_requests_certificate_id_fkey"
            columns: ["certificate_id"]
            isOneToOne: false
            referencedRelation: "certificates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paz_y_salvo_requests_property_account_id_fkey"
            columns: ["property_account_id"]
            isOneToOne: false
            referencedRelation: "property_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paz_y_salvo_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          document_number_hash: string
          document_type: string
          email: string
          full_name: string
          identity_verified_at: string | null
          phone_e164: string
          role: Database["public"]["Enums"]["app_role"]
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
          role?: Database["public"]["Enums"]["app_role"]
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
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      property_accounts: {
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
        Relationships: [
          {
            foreignKeyName: "property_accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      refund_requests: {
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
        Relationships: [
          {
            foreignKeyName: "refund_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      revenue_catalog: {
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
      signature_evidence: {
        Row: {
          auth_method: string
          declaration_id: string
          document_sha256: string
          evidence: Json
          id: string
          ip_hash: string | null
          otp_challenge_id: string | null
          signed_at: string
          signer_user_id: string
          user_agent_hash: string | null
        }
        Insert: {
          auth_method: string
          declaration_id: string
          document_sha256: string
          evidence?: Json
          id?: string
          ip_hash?: string | null
          otp_challenge_id?: string | null
          signed_at: string
          signer_user_id: string
          user_agent_hash?: string | null
        }
        Update: {
          auth_method?: string
          declaration_id?: string
          document_sha256?: string
          evidence?: Json
          id?: string
          ip_hash?: string | null
          otp_challenge_id?: string | null
          signed_at?: string
          signer_user_id?: string
          user_agent_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "signature_evidence_declaration_id_fkey"
            columns: ["declaration_id"]
            isOneToOne: false
            referencedRelation: "declarations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signature_evidence_signer_user_id_fkey"
            columns: ["signer_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      system_integrations: {
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
      tax_parameters: {
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
      tax_rule_versions: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          id: string
          legal_reference: string
          rules: Json
          status: string
          tax_type: string
          valid_from: string
          valid_to: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          legal_reference: string
          rules: Json
          status: string
          tax_type: string
          valid_from: string
          valid_to?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          legal_reference?: string
          rules?: Json
          status?: string
          tax_type?: string
          valid_from?: string
          valid_to?: string | null
        }
        Relationships: []
      }
      taxpayer_activities: {
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
            foreignKeyName: "taxpayer_activities_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "taxpayer_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      taxpayer_registrations: {
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
          department: string
          fiscal_address: string
          id?: string
          municipality: string
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
        Relationships: [
          {
            foreignKeyName: "taxpayer_registrations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      taxpayer_relationships: {
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
            foreignKeyName: "taxpayer_relationships_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "taxpayer_registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "taxpayer_relationships_related_user_id_fkey"
            columns: ["related_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_notifications: {
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
        Relationships: [
          {
            foreignKeyName: "user_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_ica: {
        Args: {
          p_activities: Json
          p_apply_notices?: boolean
          p_tax_year?: number
        }
        Returns: Json
      }
      calculate_reteica: {
        Args: { p_tax_year?: number; p_transactions: Json }
        Returns: Json
      }
      create_declaration: {
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
      dashboard_summary: { Args: never; Returns: Json }
      issue_filing_certificate: {
        Args: { p_declaration_id: string }
        Returns: Json
      }
      prepare_declaration_for_signature: {
        Args: { p_declaration_id: string }
        Returns: Database["public"]["Enums"]["declaration_status"]
      }
      register_taxpayer: { Args: { p_data: Json }; Returns: string }
      request_payment: { Args: { p_declaration_id: string }; Returns: string }
      sign_declaration: {
        Args: {
          p_auth_method?: string
          p_declaration_id: string
          p_document_sha256: string
        }
        Returns: Database["public"]["Enums"]["declaration_status"]
      }
      verify_certificate: {
        Args: { p_token: string }
        Returns: {
          document_sha256: string
          issued_at: string
          revoked: boolean
          serial: string
          type: string
        }[]
      }
    }
    Enums: {
      app_role:
        | "citizen"
        | "accountant"
        | "hacienda_reviewer"
        | "hacienda_admin"
        | "auditor"
      declaration_status:
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
      app_role: [
        "citizen",
        "accountant",
        "hacienda_reviewer",
        "hacienda_admin",
        "auditor",
      ],
      declaration_status: [
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
