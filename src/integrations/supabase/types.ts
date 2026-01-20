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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      acoes_especiais: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          created_by: string | null
          descricao: string | null
          id: string
          nome_acao: string
          percentual_desconto: number | null
          preco_adicional: number | null
          servico_id: string
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          created_by?: string | null
          descricao?: string | null
          id?: string
          nome_acao: string
          percentual_desconto?: number | null
          preco_adicional?: number | null
          servico_id: string
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          created_by?: string | null
          descricao?: string | null
          id?: string
          nome_acao?: string
          percentual_desconto?: number | null
          preco_adicional?: number | null
          servico_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "acoes_especiais_servico_id_fkey"
            columns: ["servico_id"]
            isOneToOne: false
            referencedRelation: "servicos_especiais"
            referencedColumns: ["id"]
          },
        ]
      }
      agencia_contatos: {
        Row: {
          agencia_id: string
          cargo: string | null
          created_at: string | null
          email_contato: string | null
          id: string
          nome_contato: string
          telefone_contato: string | null
        }
        Insert: {
          agencia_id: string
          cargo?: string | null
          created_at?: string | null
          email_contato?: string | null
          id?: string
          nome_contato: string
          telefone_contato?: string | null
        }
        Update: {
          agencia_id?: string
          cargo?: string | null
          created_at?: string | null
          email_contato?: string | null
          id?: string
          nome_contato?: string
          telefone_contato?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agencia_contatos_agencia_id_fkey"
            columns: ["agencia_id"]
            isOneToOne: false
            referencedRelation: "_audit_agencias_state_unmapped"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agencia_contatos_agencia_id_fkey"
            columns: ["agencia_id"]
            isOneToOne: false
            referencedRelation: "agencias"
            referencedColumns: ["id"]
          },
        ]
      }
      agencia_deals: {
        Row: {
          agencia_id: string
          created_at: string | null
          data_fim: string | null
          data_inicio: string | null
          id: string
          nome_deal: string
          status: string | null
          updated_at: string | null
          valor_estimado: number | null
        }
        Insert: {
          agencia_id: string
          created_at?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          id?: string
          nome_deal: string
          status?: string | null
          updated_at?: string | null
          valor_estimado?: number | null
        }
        Update: {
          agencia_id?: string
          created_at?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          id?: string
          nome_deal?: string
          status?: string | null
          updated_at?: string | null
          valor_estimado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "agencia_deals_agencia_id_fkey"
            columns: ["agencia_id"]
            isOneToOne: false
            referencedRelation: "_audit_agencias_state_unmapped"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agencia_deals_agencia_id_fkey"
            columns: ["agencia_id"]
            isOneToOne: false
            referencedRelation: "agencias"
            referencedColumns: ["id"]
          },
        ]
      }
      agencia_projeto_equipe: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          created_by: string | null
          data_entrada: string | null
          data_saida: string | null
          id: string
          papel: string | null
          pessoa_id: string
          projeto_id: string
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          created_by?: string | null
          data_entrada?: string | null
          data_saida?: string | null
          id?: string
          papel?: string | null
          pessoa_id: string
          projeto_id: string
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          created_by?: string | null
          data_entrada?: string | null
          data_saida?: string | null
          id?: string
          papel?: string | null
          pessoa_id?: string
          projeto_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agencia_projeto_equipe_pessoa_id_fkey"
            columns: ["pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoas_projeto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agencia_projeto_equipe_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "agencia_projetos"
            referencedColumns: ["id"]
          },
        ]
      }
      agencia_projeto_marcos: {
        Row: {
          created_at: string | null
          created_by: string | null
          data_conclusao: string | null
          data_prevista: string
          descricao: string | null
          id: string
          nome_marco: string
          ordem: number | null
          projeto_id: string
          responsavel_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          data_conclusao?: string | null
          data_prevista: string
          descricao?: string | null
          id?: string
          nome_marco: string
          ordem?: number | null
          projeto_id: string
          responsavel_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          data_conclusao?: string | null
          data_prevista?: string
          descricao?: string | null
          id?: string
          nome_marco?: string
          ordem?: number | null
          projeto_id?: string
          responsavel_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agencia_projeto_marcos_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "agencia_projetos"
            referencedColumns: ["id"]
          },
        ]
      }
      agencia_projetos: {
        Row: {
          agencia_id: string
          arquivos_anexos: Json | null
          briefing: string | null
          client_id: string | null
          cliente_final: string | null
          created_at: string | null
          data_fim: string | null
          data_inicio: string | null
          deal_id: string | null
          descricao: string | null
          id: string
          nome_projeto: string
          objetivos: string[] | null
          orcamento_projeto: number | null
          prioridade: string | null
          progresso: number | null
          responsavel_projeto: string | null
          status_projeto: string | null
          tags: string[] | null
          updated_at: string | null
          valor_gasto: number | null
        }
        Insert: {
          agencia_id: string
          arquivos_anexos?: Json | null
          briefing?: string | null
          client_id?: string | null
          cliente_final?: string | null
          created_at?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          deal_id?: string | null
          descricao?: string | null
          id?: string
          nome_projeto: string
          objetivos?: string[] | null
          orcamento_projeto?: number | null
          prioridade?: string | null
          progresso?: number | null
          responsavel_projeto?: string | null
          status_projeto?: string | null
          tags?: string[] | null
          updated_at?: string | null
          valor_gasto?: number | null
        }
        Update: {
          agencia_id?: string
          arquivos_anexos?: Json | null
          briefing?: string | null
          client_id?: string | null
          cliente_final?: string | null
          created_at?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          deal_id?: string | null
          descricao?: string | null
          id?: string
          nome_projeto?: string
          objetivos?: string[] | null
          orcamento_projeto?: number | null
          prioridade?: string | null
          progresso?: number | null
          responsavel_projeto?: string | null
          status_projeto?: string | null
          tags?: string[] | null
          updated_at?: string | null
          valor_gasto?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "agencia_projetos_agencia_id_fkey"
            columns: ["agencia_id"]
            isOneToOne: false
            referencedRelation: "_audit_agencias_state_unmapped"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agencia_projetos_agencia_id_fkey"
            columns: ["agencia_id"]
            isOneToOne: false
            referencedRelation: "agencias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agencia_projetos_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "agencia_deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agencia_projetos_responsavel_projeto_fkey"
            columns: ["responsavel_projeto"]
            isOneToOne: false
            referencedRelation: "pessoas_projeto"
            referencedColumns: ["id"]
          },
        ]
      }
      agencias: {
        Row: {
          cep: string | null
          cidade: string | null
          cnpj: string
          codigo_agencia: string
          created_at: string | null
          email_empresa: string | null
          estado: string | null
          estado_uf: string | null
          id: string
          nome_agencia: string
          numero: string | null
          rua_av: string | null
          site: string | null
          taxa_porcentagem: number | null
          telefone_empresa: string | null
          updated_at: string | null
        }
        Insert: {
          cep?: string | null
          cidade?: string | null
          cnpj: string
          codigo_agencia: string
          created_at?: string | null
          email_empresa?: string | null
          estado?: string | null
          estado_uf?: string | null
          id?: string
          nome_agencia: string
          numero?: string | null
          rua_av?: string | null
          site?: string | null
          taxa_porcentagem?: number | null
          telefone_empresa?: string | null
          updated_at?: string | null
        }
        Update: {
          cep?: string | null
          cidade?: string | null
          cnpj?: string
          codigo_agencia?: string
          created_at?: string | null
          email_empresa?: string | null
          estado?: string | null
          estado_uf?: string | null
          id?: string
          nome_agencia?: string
          numero?: string | null
          rua_av?: string | null
          site?: string | null
          taxa_porcentagem?: number | null
          telefone_empresa?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      audience_estimates: {
        Row: {
          city_norm: string
          clinic_count: number
          estimated_patients_monthly: number
          id: number
          last_updated_at: string | null
          specialty: string
        }
        Insert: {
          city_norm: string
          clinic_count?: number
          estimated_patients_monthly?: number
          id?: number
          last_updated_at?: string | null
          specialty: string
        }
        Update: {
          city_norm?: string
          clinic_count?: number
          estimated_patients_monthly?: number
          id?: number
          last_updated_at?: string | null
          specialty?: string
        }
        Relationships: []
      }
      audit_constraints_log: {
        Row: {
          changed_at: string | null
          changed_by: string | null
          column_name: string
          constraint_name: string
          id: number
          new_reference: string | null
          old_reference: string | null
          table_name: string
        }
        Insert: {
          changed_at?: string | null
          changed_by?: string | null
          column_name: string
          constraint_name: string
          id?: number
          new_reference?: string | null
          old_reference?: string | null
          table_name: string
        }
        Update: {
          changed_at?: string | null
          changed_by?: string | null
          column_name?: string
          constraint_name?: string
          id?: number
          new_reference?: string | null
          old_reference?: string | null
          table_name?: string
        }
        Relationships: []
      }
      audit_orphans_log: {
        Row: {
          column_name: string
          detected_at: string | null
          id: number
          orphan_value: string | null
          table_name: string
        }
        Insert: {
          column_name: string
          detected_at?: string | null
          id?: number
          orphan_value?: string | null
          table_name: string
        }
        Update: {
          column_name?: string
          detected_at?: string | null
          id?: number
          orphan_value?: string | null
          table_name?: string
        }
        Relationships: []
      }
      audit_screens_deleted: {
        Row: {
          city: string | null
          code: string | null
          created_at: string | null
          deleted_at: string | null
          id: number | null
          name: string | null
          state: string | null
        }
        Insert: {
          city?: string | null
          code?: string | null
          created_at?: string | null
          deleted_at?: string | null
          id?: number | null
          name?: string | null
          state?: string | null
        }
        Update: {
          city?: string | null
          code?: string | null
          created_at?: string | null
          deleted_at?: string | null
          id?: number | null
          name?: string | null
          state?: string | null
        }
        Relationships: []
      }
      br_states: {
        Row: {
          created_at: string
          nome: string
          regiao: string
          uf: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          nome: string
          regiao: string
          uf: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          nome?: string
          regiao?: string
          uf?: string
          updated_at?: string
        }
        Relationships: []
      }
      br_states_fullname: {
        Row: {
          name: string
          uf: string
        }
        Insert: {
          name: string
          uf: string
        }
        Update: {
          name?: string
          uf?: string
        }
        Relationships: []
      }
      campaign_screens: {
        Row: {
          campaign_id: number
          created_at: string | null
          created_by: string | null
          id: number
          quantity: number | null
          screen_id: number
        }
        Insert: {
          campaign_id: number
          created_at?: string | null
          created_by?: string | null
          id?: number
          quantity?: number | null
          screen_id: number
        }
        Update: {
          campaign_id?: number
          created_at?: string | null
          created_by?: string | null
          id?: number
          quantity?: number | null
          screen_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "campaign_screens_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_screens_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "_audit_screens_state_unmapped"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_screens_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "screen_proposal_popularity"
            referencedColumns: ["screen_id"]
          },
          {
            foreignKeyName: "campaign_screens_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "screens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_screens_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "screens_enriched"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_screens_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "v_proposal_items"
            referencedColumns: ["screen_id"]
          },
          {
            foreignKeyName: "campaign_screens_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "v_proposal_pdf"
            referencedColumns: ["screen_id"]
          },
          {
            foreignKeyName: "campaign_screens_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "v_screens_enriched"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_screens_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "vw_inventory_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_screens_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "vw_screens_front"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_screens_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "vw_screens_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_screens_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "vw_screens_inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_screens_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "vw_screens_pretty"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          agencia_id: string | null
          budget: number | null
          created_at: string | null
          created_by: string | null
          customer_name: string | null
          end_date: string | null
          id: number
          name: string
          notes: string | null
          projeto_id: string | null
          start_date: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          agencia_id?: string | null
          budget?: number | null
          created_at?: string | null
          created_by?: string | null
          customer_name?: string | null
          end_date?: string | null
          id?: number
          name: string
          notes?: string | null
          projeto_id?: string | null
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          agencia_id?: string | null
          budget?: number | null
          created_at?: string | null
          created_by?: string | null
          customer_name?: string | null
          end_date?: string | null
          id?: number
          name?: string
          notes?: string | null
          projeto_id?: string | null
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      cep_geocode: {
        Row: {
          cep_int: number
          formatted_address: string | null
          lat: number | null
          lng: number | null
          partial_match: boolean | null
          place_id: string | null
          source: string
          updated_at: string
        }
        Insert: {
          cep_int: number
          formatted_address?: string | null
          lat?: number | null
          lng?: number | null
          partial_match?: boolean | null
          place_id?: string | null
          source?: string
          updated_at?: string
        }
        Update: {
          cep_int?: number
          formatted_address?: string | null
          lat?: number | null
          lng?: number | null
          partial_match?: boolean | null
          place_id?: string | null
          source?: string
          updated_at?: string
        }
        Relationships: []
      }
      cep_geocode_stg: {
        Row: {
          cep_int: number | null
          formatted_address: string | null
          generated_at: string | null
          lat: number | null
          lng: number | null
          partial_match: boolean | null
          place_id: string | null
          source: string | null
          status: string | null
        }
        Insert: {
          cep_int?: number | null
          formatted_address?: string | null
          generated_at?: string | null
          lat?: number | null
          lng?: number | null
          partial_match?: boolean | null
          place_id?: string | null
          source?: string | null
          status?: string | null
        }
        Update: {
          cep_int?: number | null
          formatted_address?: string | null
          generated_at?: string | null
          lat?: number | null
          lng?: number | null
          partial_match?: boolean | null
          place_id?: string | null
          source?: string | null
          status?: string | null
        }
        Relationships: []
      }
      classes: {
        Row: {
          id: number
          name: string
        }
        Insert: {
          id?: number
          name: string
        }
        Update: {
          id?: number
          name?: string
        }
        Relationships: []
      }
      email_logs: {
        Row: {
          created_at: string | null
          created_by: string | null
          customer_name: string | null
          email_type: string
          error_message: string | null
          id: number
          log_id: number | null
          proposal_id: number | null
          proposal_type: string | null
          recipient_email: string
          recipient_type: string
          sent_at: string | null
          status: string | null
          subject: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          customer_name?: string | null
          email_type: string
          error_message?: string | null
          id?: number
          log_id?: number | null
          proposal_id?: number | null
          proposal_type?: string | null
          recipient_email: string
          recipient_type: string
          sent_at?: string | null
          status?: string | null
          subject: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          customer_name?: string | null
          email_type?: string
          error_message?: string | null
          id?: number
          log_id?: number | null
          proposal_id?: number | null
          proposal_type?: string | null
          recipient_email?: string
          recipient_type?: string
          sent_at?: string | null
          status?: string | null
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposal_kpis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_logs_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_logs_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_proposal_items"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "email_logs_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_proposal_pdf"
            referencedColumns: ["proposal_id"]
          },
        ]
      }
      farmacias: {
        Row: {
          bairro: string | null
          cep: string | null
          cidade: string | null
          cnpj: string
          complemento: string | null
          created_at: string | null
          endereco: string | null
          fantasia: string
          google_formatted_address: string | null
          grupo: string | null
          id: number
          lat: number | null
          latitude: number | null
          lng: number | null
          localizacao: unknown
          longitude: number | null
          nome: string | null
          numero: string | null
          tipo_logradouro: string | null
          uf: string | null
        }
        Insert: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj: string
          complemento?: string | null
          created_at?: string | null
          endereco?: string | null
          fantasia: string
          google_formatted_address?: string | null
          grupo?: string | null
          id?: number
          lat?: number | null
          latitude?: number | null
          lng?: number | null
          localizacao?: unknown
          longitude?: number | null
          nome?: string | null
          numero?: string | null
          tipo_logradouro?: string | null
          uf?: string | null
        }
        Update: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string
          complemento?: string | null
          created_at?: string | null
          endereco?: string | null
          fantasia?: string
          google_formatted_address?: string | null
          grupo?: string | null
          id?: number
          lat?: number | null
          latitude?: number | null
          lng?: number | null
          localizacao?: unknown
          longitude?: number | null
          nome?: string | null
          numero?: string | null
          tipo_logradouro?: string | null
          uf?: string | null
        }
        Relationships: []
      }
      grupos_cpm: {
        Row: {
          ativo: boolean | null
          cpm_valor: number | null
          created_at: string | null
          created_by: string | null
          descricao: string | null
          id: string
          nome_grupo: string
          tags_excluir: string[] | null
          tags_incluir: string[] | null
          tipo_selecao: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          cpm_valor?: number | null
          created_at?: string | null
          created_by?: string | null
          descricao?: string | null
          id?: string
          nome_grupo: string
          tags_excluir?: string[] | null
          tags_incluir?: string[] | null
          tipo_selecao: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          cpm_valor?: number | null
          created_at?: string | null
          created_by?: string | null
          descricao?: string | null
          id?: string
          nome_grupo?: string
          tags_excluir?: string[] | null
          tags_incluir?: string[] | null
          tipo_selecao?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      holidays: {
        Row: {
          city: string | null
          day: string
          id: number
          name: string | null
          scope: string | null
          state: string | null
          state_uf: string | null
        }
        Insert: {
          city?: string | null
          day: string
          id?: number
          name?: string | null
          scope?: string | null
          state?: string | null
          state_uf?: string | null
        }
        Update: {
          city?: string | null
          day?: string
          id?: number
          name?: string | null
          scope?: string | null
          state?: string | null
          state_uf?: string | null
        }
        Relationships: []
      }
      impact_models: {
        Row: {
          active: boolean | null
          color_scheme: Json | null
          created_at: string | null
          created_by: string | null
          description: string | null
          examples: string[] | null
          id: number
          multiplier: number
          name: string
          traffic_level: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          active?: boolean | null
          color_scheme?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          examples?: string[] | null
          id?: number
          multiplier?: number
          name: string
          traffic_level: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          active?: boolean | null
          color_scheme?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          examples?: string[] | null
          id?: number
          multiplier?: number
          name?: string
          traffic_level?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      networks: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      pessoas_projeto: {
        Row: {
          agencia_id: string | null
          cargo: string | null
          created_at: string
          email: string | null
          id: string
          nome: string
          telefone: string | null
          updated_at: string
        }
        Insert: {
          agencia_id?: string | null
          cargo?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome: string
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          agencia_id?: string | null
          cargo?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
          telefone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pessoas_projeto_agencia_id_fkey"
            columns: ["agencia_id"]
            isOneToOne: false
            referencedRelation: "_audit_agencias_state_unmapped"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pessoas_projeto_agencia_id_fkey"
            columns: ["agencia_id"]
            isOneToOne: false
            referencedRelation: "agencias"
            referencedColumns: ["id"]
          },
        ]
      }
      price_rules: {
        Row: {
          audience: number | null
          base_monthly: number
          city: string | null
          city_norm: string | null
          cpm: number | null
          created_at: string | null
          created_by: string | null
          id: number
          logistics_km_price: number | null
          min_months: number | null
          screen_id: number | null
          setup_fee: number | null
          tipo_insercao:
            | Database["public"]["Enums"]["tipo_insercao_enum"]
            | null
          tipo_insercao_manual: string | null
          uplift: number
          venue_id: number | null
        }
        Insert: {
          audience?: number | null
          base_monthly?: number
          city?: string | null
          city_norm?: string | null
          cpm?: number | null
          created_at?: string | null
          created_by?: string | null
          id?: number
          logistics_km_price?: number | null
          min_months?: number | null
          screen_id?: number | null
          setup_fee?: number | null
          tipo_insercao?:
            | Database["public"]["Enums"]["tipo_insercao_enum"]
            | null
          tipo_insercao_manual?: string | null
          uplift?: number
          venue_id?: number | null
        }
        Update: {
          audience?: number | null
          base_monthly?: number
          city?: string | null
          city_norm?: string | null
          cpm?: number | null
          created_at?: string | null
          created_by?: string | null
          id?: number
          logistics_km_price?: number | null
          min_months?: number | null
          screen_id?: number | null
          setup_fee?: number | null
          tipo_insercao?:
            | Database["public"]["Enums"]["tipo_insercao_enum"]
            | null
          tipo_insercao_manual?: string | null
          uplift?: number
          venue_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "price_rules_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "_audit_screens_state_unmapped"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_rules_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "screen_proposal_popularity"
            referencedColumns: ["screen_id"]
          },
          {
            foreignKeyName: "price_rules_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "screens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_rules_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "screens_enriched"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_rules_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "v_proposal_items"
            referencedColumns: ["screen_id"]
          },
          {
            foreignKeyName: "price_rules_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "v_proposal_pdf"
            referencedColumns: ["screen_id"]
          },
          {
            foreignKeyName: "price_rules_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "v_screens_enriched"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_rules_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "vw_inventory_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_rules_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "vw_screens_front"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_rules_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "vw_screens_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_rules_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "vw_screens_inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_rules_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "vw_screens_pretty"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_rules_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "_audit_venues_state_unmapped"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_rules_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "mv_venue_farmacia_distancia"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "price_rules_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "safe_venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_rules_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "screens_enriched"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "price_rules_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_rules_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "view_detalhes_profissionais"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "price_rules_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "vw_inventory_full"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "price_rules_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "vw_screens_full"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "price_rules_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "vw_venue_specialties"
            referencedColumns: ["venue_id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string | null
          full_name: string | null
          id: string
          organization: string | null
          phone: string | null
          role: string
          super_admin: boolean
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          organization?: string | null
          phone?: string | null
          role?: string
          super_admin?: boolean
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          organization?: string | null
          phone?: string | null
          role?: string
          super_admin?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_role_fkey"
            columns: ["role"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["name"]
          },
        ]
      }
      profissionais_saude: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          created_by: string | null
          email: string | null
          id: string
          nome: string
          registro_profissional: string
          telefone: string | null
          tipo_profissional: string
          tipo_registro: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          id?: string
          nome: string
          registro_profissional: string
          telefone?: string | null
          tipo_profissional: string
          tipo_registro?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          id?: string
          nome?: string
          registro_profissional?: string
          telefone?: string | null
          tipo_profissional?: string
          tipo_registro?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profissional_especialidades: {
        Row: {
          profissional_id: string
          specialty_id: string
        }
        Insert: {
          profissional_id: string
          specialty_id: string
        }
        Update: {
          profissional_id?: string
          specialty_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_prof"
            columns: ["profissional_id"]
            isOneToOne: false
            referencedRelation: "profissionais_saude"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_prof"
            columns: ["profissional_id"]
            isOneToOne: false
            referencedRelation: "view_detalhes_profissionais"
            referencedColumns: ["profissional_id"]
          },
          {
            foreignKeyName: "fk_spec"
            columns: ["specialty_id"]
            isOneToOne: false
            referencedRelation: "specialties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_spec"
            columns: ["specialty_id"]
            isOneToOne: false
            referencedRelation: "vw_venue_specialties"
            referencedColumns: ["specialty_id"]
          },
        ]
      }
      profissional_venue: {
        Row: {
          cargo_na_unidade: string | null
          created_at: string | null
          id: string
          profissional_id: string
          venue_id: number
        }
        Insert: {
          cargo_na_unidade?: string | null
          created_at?: string | null
          id?: string
          profissional_id: string
          venue_id: number
        }
        Update: {
          cargo_na_unidade?: string | null
          created_at?: string | null
          id?: string
          profissional_id?: string
          venue_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "profissional_venue_profissional_fkey"
            columns: ["profissional_id"]
            isOneToOne: false
            referencedRelation: "profissionais_saude"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profissional_venue_profissional_fkey"
            columns: ["profissional_id"]
            isOneToOne: false
            referencedRelation: "view_detalhes_profissionais"
            referencedColumns: ["profissional_id"]
          },
          {
            foreignKeyName: "profissional_venue_venue_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "_audit_venues_state_unmapped"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profissional_venue_venue_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "mv_venue_farmacia_distancia"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "profissional_venue_venue_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "safe_venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profissional_venue_venue_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "screens_enriched"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "profissional_venue_venue_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profissional_venue_venue_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "view_detalhes_profissionais"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "profissional_venue_venue_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "vw_inventory_full"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "profissional_venue_venue_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "vw_screens_full"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "profissional_venue_venue_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "vw_venue_specialties"
            referencedColumns: ["venue_id"]
          },
        ]
      }
      proposal_screens: {
        Row: {
          created_at: string | null
          custom_cpm: number | null
          daily_traffic_override: number | null
          hours_on_override: number | null
          id: number
          proposal_id: number
          quantidade: number | null
          screen_id: number
        }
        Insert: {
          created_at?: string | null
          custom_cpm?: number | null
          daily_traffic_override?: number | null
          hours_on_override?: number | null
          id?: number
          proposal_id: number
          quantidade?: number | null
          screen_id: number
        }
        Update: {
          created_at?: string | null
          custom_cpm?: number | null
          daily_traffic_override?: number | null
          hours_on_override?: number | null
          id?: number
          proposal_id?: number
          quantidade?: number | null
          screen_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "proposal_screens_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposal_kpis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_screens_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_screens_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_proposal_items"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_screens_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_proposal_pdf"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_screens_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "_audit_screens_state_unmapped"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_screens_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "screen_proposal_popularity"
            referencedColumns: ["screen_id"]
          },
          {
            foreignKeyName: "proposal_screens_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "screens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_screens_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "screens_enriched"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_screens_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "v_proposal_items"
            referencedColumns: ["screen_id"]
          },
          {
            foreignKeyName: "proposal_screens_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "v_proposal_pdf"
            referencedColumns: ["screen_id"]
          },
          {
            foreignKeyName: "proposal_screens_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "v_screens_enriched"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_screens_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "vw_inventory_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_screens_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "vw_screens_front"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_screens_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "vw_screens_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_screens_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "vw_screens_inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_screens_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "vw_screens_pretty"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_snapshots: {
        Row: {
          created_at: string | null
          payload: Json
          proposal_id: number
        }
        Insert: {
          created_at?: string | null
          payload: Json
          proposal_id: number
        }
        Update: {
          created_at?: string | null
          payload?: Json
          proposal_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "proposal_snapshots_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: true
            referencedRelation: "proposal_kpis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_snapshots_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: true
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_snapshots_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: true
            referencedRelation: "v_proposal_items"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_snapshots_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: true
            referencedRelation: "v_proposal_pdf"
            referencedColumns: ["proposal_id"]
          },
        ]
      }
      proposals: {
        Row: {
          agencia_id: string | null
          city: string | null
          clicksign_document_key: string | null
          clicksign_sign_url: string | null
          client_id: string | null
          cpm_mode: string | null
          cpm_value: number | null
          created_at: string | null
          created_by: string | null
          customer_email: string | null
          customer_name: string
          days_business: number | null
          days_calendar: number | null
          dias_uteis_mes_base: number | null
          discount_fixed: number | null
          discount_pct: number | null
          email_sent_at: string | null
          end_date: string | null
          film_seconds: number | null
          filters: Json
          gross_business: number | null
          gross_calendar: number | null
          horas_operacao_dia: number | null
          id: number
          impact_formula: string | null
          impacts_business: number | null
          impacts_calendar: number | null
          insertions_per_hour: number | null
          net_business: number | null
          net_calendar: number | null
          notes: string | null
          pdf_path: string | null
          pdf_url: string | null
          pipedrive_deal_id: number | null
          projeto_id: string | null
          proposal_type: string | null
          quote: Json
          start_date: string | null
          status: string | null
          status_updated_at: string | null
          updated_at: string | null
        }
        Insert: {
          agencia_id?: string | null
          city?: string | null
          clicksign_document_key?: string | null
          clicksign_sign_url?: string | null
          client_id?: string | null
          cpm_mode?: string | null
          cpm_value?: number | null
          created_at?: string | null
          created_by?: string | null
          customer_email?: string | null
          customer_name: string
          days_business?: number | null
          days_calendar?: number | null
          dias_uteis_mes_base?: number | null
          discount_fixed?: number | null
          discount_pct?: number | null
          email_sent_at?: string | null
          end_date?: string | null
          film_seconds?: number | null
          filters: Json
          gross_business?: number | null
          gross_calendar?: number | null
          horas_operacao_dia?: number | null
          id?: number
          impact_formula?: string | null
          impacts_business?: number | null
          impacts_calendar?: number | null
          insertions_per_hour?: number | null
          net_business?: number | null
          net_calendar?: number | null
          notes?: string | null
          pdf_path?: string | null
          pdf_url?: string | null
          pipedrive_deal_id?: number | null
          projeto_id?: string | null
          proposal_type?: string | null
          quote: Json
          start_date?: string | null
          status?: string | null
          status_updated_at?: string | null
          updated_at?: string | null
        }
        Update: {
          agencia_id?: string | null
          city?: string | null
          clicksign_document_key?: string | null
          clicksign_sign_url?: string | null
          client_id?: string | null
          cpm_mode?: string | null
          cpm_value?: number | null
          created_at?: string | null
          created_by?: string | null
          customer_email?: string | null
          customer_name?: string
          days_business?: number | null
          days_calendar?: number | null
          dias_uteis_mes_base?: number | null
          discount_fixed?: number | null
          discount_pct?: number | null
          email_sent_at?: string | null
          end_date?: string | null
          film_seconds?: number | null
          filters?: Json
          gross_business?: number | null
          gross_calendar?: number | null
          horas_operacao_dia?: number | null
          id?: number
          impact_formula?: string | null
          impacts_business?: number | null
          impacts_calendar?: number | null
          insertions_per_hour?: number | null
          net_business?: number | null
          net_calendar?: number | null
          notes?: string | null
          pdf_path?: string | null
          pdf_url?: string | null
          pipedrive_deal_id?: number | null
          projeto_id?: string | null
          proposal_type?: string | null
          quote?: Json
          start_date?: string | null
          status?: string | null
          status_updated_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposals_agencia_id_fkey"
            columns: ["agencia_id"]
            isOneToOne: false
            referencedRelation: "_audit_agencias_state_unmapped"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_agencia_id_fkey"
            columns: ["agencia_id"]
            isOneToOne: false
            referencedRelation: "agencias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "agencia_projetos"
            referencedColumns: ["id"]
          },
        ]
      }
      proposta_servicos_especiais: {
        Row: {
          acao_id: string | null
          audiencia_mes_base: number | null
          created_at: string | null
          desconto_percentual: number | null
          id: string
          insercoes_hora_linha: number | null
          observacoes: string | null
          proposta_id: number
          qtd_telas: number | null
          quantidade: number | null
          servico_id: string
          tipo_servico_proposta: string | null
          valor_manual_insercao_avulsa: number
          valor_manual_insercao_especial: number | null
        }
        Insert: {
          acao_id?: string | null
          audiencia_mes_base?: number | null
          created_at?: string | null
          desconto_percentual?: number | null
          id?: string
          insercoes_hora_linha?: number | null
          observacoes?: string | null
          proposta_id: number
          qtd_telas?: number | null
          quantidade?: number | null
          servico_id: string
          tipo_servico_proposta?: string | null
          valor_manual_insercao_avulsa: number
          valor_manual_insercao_especial?: number | null
        }
        Update: {
          acao_id?: string | null
          audiencia_mes_base?: number | null
          created_at?: string | null
          desconto_percentual?: number | null
          id?: string
          insercoes_hora_linha?: number | null
          observacoes?: string | null
          proposta_id?: number
          qtd_telas?: number | null
          quantidade?: number | null
          servico_id?: string
          tipo_servico_proposta?: string | null
          valor_manual_insercao_avulsa?: number
          valor_manual_insercao_especial?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "proposta_servicos_especiais_acao_id_fkey"
            columns: ["acao_id"]
            isOneToOne: false
            referencedRelation: "acoes_especiais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposta_servicos_especiais_proposta_id_fkey"
            columns: ["proposta_id"]
            isOneToOne: false
            referencedRelation: "proposal_kpis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposta_servicos_especiais_proposta_id_fkey"
            columns: ["proposta_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposta_servicos_especiais_proposta_id_fkey"
            columns: ["proposta_id"]
            isOneToOne: false
            referencedRelation: "v_proposal_items"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposta_servicos_especiais_proposta_id_fkey"
            columns: ["proposta_id"]
            isOneToOne: false
            referencedRelation: "v_proposal_pdf"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposta_servicos_especiais_servico_id_fkey"
            columns: ["servico_id"]
            isOneToOne: false
            referencedRelation: "servicos_especiais"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string | null
          description: string | null
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          name?: string
        }
        Relationships: []
      }
      screen_availability: {
        Row: {
          available_from: string
          available_period: unknown
          available_to: string
          created_at: string | null
          created_by: string | null
          id: number
          screen_id: number
        }
        Insert: {
          available_from: string
          available_period?: unknown
          available_to: string
          created_at?: string | null
          created_by?: string | null
          id?: number
          screen_id: number
        }
        Update: {
          available_from?: string
          available_period?: unknown
          available_to?: string
          created_at?: string | null
          created_by?: string | null
          id?: number
          screen_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "screen_availability_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "_audit_screens_state_unmapped"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screen_availability_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "screen_proposal_popularity"
            referencedColumns: ["screen_id"]
          },
          {
            foreignKeyName: "screen_availability_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "screens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screen_availability_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "screens_enriched"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screen_availability_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "v_proposal_items"
            referencedColumns: ["screen_id"]
          },
          {
            foreignKeyName: "screen_availability_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "v_proposal_pdf"
            referencedColumns: ["screen_id"]
          },
          {
            foreignKeyName: "screen_availability_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "v_screens_enriched"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screen_availability_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "vw_inventory_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screen_availability_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "vw_screens_front"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screen_availability_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "vw_screens_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screen_availability_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "vw_screens_inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screen_availability_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "vw_screens_pretty"
            referencedColumns: ["id"]
          },
        ]
      }
      screen_bookings: {
        Row: {
          booked_from: string
          booked_period: unknown
          booked_to: string
          created_at: string | null
          created_by: string | null
          id: number
          screen_id: number
          status: string | null
        }
        Insert: {
          booked_from: string
          booked_period?: unknown
          booked_to: string
          created_at?: string | null
          created_by?: string | null
          id?: number
          screen_id: number
          status?: string | null
        }
        Update: {
          booked_from?: string
          booked_period?: unknown
          booked_to?: string
          created_at?: string | null
          created_by?: string | null
          id?: number
          screen_id?: number
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "screen_bookings_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "_audit_screens_state_unmapped"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screen_bookings_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "screen_proposal_popularity"
            referencedColumns: ["screen_id"]
          },
          {
            foreignKeyName: "screen_bookings_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "screens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screen_bookings_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "screens_enriched"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screen_bookings_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "v_proposal_items"
            referencedColumns: ["screen_id"]
          },
          {
            foreignKeyName: "screen_bookings_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "v_proposal_pdf"
            referencedColumns: ["screen_id"]
          },
          {
            foreignKeyName: "screen_bookings_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "v_screens_enriched"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screen_bookings_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "vw_inventory_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screen_bookings_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "vw_screens_front"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screen_bookings_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "vw_screens_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screen_bookings_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "vw_screens_inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screen_bookings_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "vw_screens_pretty"
            referencedColumns: ["id"]
          },
        ]
      }
      screen_classes: {
        Row: {
          class_id: number
          screen_id: number
        }
        Insert: {
          class_id: number
          screen_id: number
        }
        Update: {
          class_id?: number
          screen_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "screen_classes_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screen_classes_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "_audit_screens_state_unmapped"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screen_classes_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "screen_proposal_popularity"
            referencedColumns: ["screen_id"]
          },
          {
            foreignKeyName: "screen_classes_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "screens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screen_classes_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "screens_enriched"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screen_classes_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "v_proposal_items"
            referencedColumns: ["screen_id"]
          },
          {
            foreignKeyName: "screen_classes_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "v_proposal_pdf"
            referencedColumns: ["screen_id"]
          },
          {
            foreignKeyName: "screen_classes_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "v_screens_enriched"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screen_classes_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "vw_inventory_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screen_classes_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "vw_screens_front"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screen_classes_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "vw_screens_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screen_classes_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "vw_screens_inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screen_classes_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "vw_screens_pretty"
            referencedColumns: ["id"]
          },
        ]
      }
      screen_rates: {
        Row: {
          cpm: number | null
          created_at: string | null
          effective_from: string | null
          effective_to: string | null
          id: number
          max_spots_per_day: number | null
          min_spots_per_day: number | null
          mode_of_operation: string | null
          rate_period: unknown
          screen_id: number | null
          selling_rate_month: number | null
          spot_duration_secs: number | null
          spots_per_hour: number | null
          standard_rate_month: number | null
        }
        Insert: {
          cpm?: number | null
          created_at?: string | null
          effective_from?: string | null
          effective_to?: string | null
          id?: number
          max_spots_per_day?: number | null
          min_spots_per_day?: number | null
          mode_of_operation?: string | null
          rate_period?: unknown
          screen_id?: number | null
          selling_rate_month?: number | null
          spot_duration_secs?: number | null
          spots_per_hour?: number | null
          standard_rate_month?: number | null
        }
        Update: {
          cpm?: number | null
          created_at?: string | null
          effective_from?: string | null
          effective_to?: string | null
          id?: number
          max_spots_per_day?: number | null
          min_spots_per_day?: number | null
          mode_of_operation?: string | null
          rate_period?: unknown
          screen_id?: number | null
          selling_rate_month?: number | null
          spot_duration_secs?: number | null
          spots_per_hour?: number | null
          standard_rate_month?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "screen_rates_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "_audit_screens_state_unmapped"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screen_rates_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "screen_proposal_popularity"
            referencedColumns: ["screen_id"]
          },
          {
            foreignKeyName: "screen_rates_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "screens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screen_rates_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "screens_enriched"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screen_rates_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "v_proposal_items"
            referencedColumns: ["screen_id"]
          },
          {
            foreignKeyName: "screen_rates_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "v_proposal_pdf"
            referencedColumns: ["screen_id"]
          },
          {
            foreignKeyName: "screen_rates_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "v_screens_enriched"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screen_rates_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "vw_inventory_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screen_rates_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "vw_screens_front"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screen_rates_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "vw_screens_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screen_rates_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "vw_screens_inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screen_rates_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "vw_screens_pretty"
            referencedColumns: ["id"]
          },
        ]
      }
      screens: {
        Row: {
          active: boolean | null
          address_norm: string | null
          address_raw: string | null
          asset_url: string | null
          base_daily_traffic: number | null
          board_format: string | null
          category: string | null
          cep: string | null
          cep_norm: string | null
          city: string | null
          city_norm: string | null
          class: Database["public"]["Enums"]["class_band"] | null
          code: string | null
          created_at: string | null
          display_name: string | null
          endereco_completo: string | null
          facing: string | null
          geo: unknown
          geom: unknown
          geom_geog: unknown
          google_formatted_address: string | null
          google_place_id: string | null
          id: number
          lat: number | null
          lng: number | null
          name: string | null
          screen_end_time: string | null
          screen_facing: string | null
          screen_start_time: string | null
          specialty: string[] | null
          spots_per_hour: number | null
          state: string | null
          state_norm: string | null
          state_uf: string | null
          tag: string
          updated_at: string | null
          venue_id: number | null
          venue_type_child: string | null
          venue_type_grandchildren: string
          venue_type_parent: string | null
        }
        Insert: {
          active?: boolean | null
          address_norm?: string | null
          address_raw?: string | null
          asset_url?: string | null
          base_daily_traffic?: number | null
          board_format?: string | null
          category?: string | null
          cep?: string | null
          cep_norm?: string | null
          city?: string | null
          city_norm?: string | null
          class?: Database["public"]["Enums"]["class_band"] | null
          code?: string | null
          created_at?: string | null
          display_name?: string | null
          endereco_completo?: string | null
          facing?: string | null
          geo?: unknown
          geom?: unknown
          geom_geog?: unknown
          google_formatted_address?: string | null
          google_place_id?: string | null
          id?: number
          lat?: number | null
          lng?: number | null
          name?: string | null
          screen_end_time?: string | null
          screen_facing?: string | null
          screen_start_time?: string | null
          specialty?: string[] | null
          spots_per_hour?: number | null
          state?: string | null
          state_norm?: string | null
          state_uf?: string | null
          tag?: string
          updated_at?: string | null
          venue_id?: number | null
          venue_type_child?: string | null
          venue_type_grandchildren?: string
          venue_type_parent?: string | null
        }
        Update: {
          active?: boolean | null
          address_norm?: string | null
          address_raw?: string | null
          asset_url?: string | null
          base_daily_traffic?: number | null
          board_format?: string | null
          category?: string | null
          cep?: string | null
          cep_norm?: string | null
          city?: string | null
          city_norm?: string | null
          class?: Database["public"]["Enums"]["class_band"] | null
          code?: string | null
          created_at?: string | null
          display_name?: string | null
          endereco_completo?: string | null
          facing?: string | null
          geo?: unknown
          geom?: unknown
          geom_geog?: unknown
          google_formatted_address?: string | null
          google_place_id?: string | null
          id?: number
          lat?: number | null
          lng?: number | null
          name?: string | null
          screen_end_time?: string | null
          screen_facing?: string | null
          screen_start_time?: string | null
          specialty?: string[] | null
          spots_per_hour?: number | null
          state?: string | null
          state_norm?: string | null
          state_uf?: string | null
          tag?: string
          updated_at?: string | null
          venue_id?: number | null
          venue_type_child?: string | null
          venue_type_grandchildren?: string
          venue_type_parent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "screens_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "_audit_venues_state_unmapped"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screens_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "mv_venue_farmacia_distancia"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "screens_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "safe_venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screens_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "screens_enriched"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "screens_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screens_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "view_detalhes_profissionais"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "screens_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "vw_inventory_full"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "screens_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "vw_screens_full"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "screens_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "vw_venue_specialties"
            referencedColumns: ["venue_id"]
          },
        ]
      }
      screens_backup_20250919: {
        Row: {
          active: boolean | null
          address_norm: string | null
          address_raw: string | null
          asset_url: string | null
          base_daily_traffic: number | null
          board_format: string | null
          category: string | null
          cep: string | null
          city: string | null
          city_norm: string | null
          class: Database["public"]["Enums"]["class_band"] | null
          code: string | null
          created_at: string | null
          display_name: string | null
          facing: string | null
          geom: unknown
          google_formatted_address: string | null
          google_place_id: string | null
          id: number | null
          lat: number | null
          lng: number | null
          name: string | null
          screen_end_time: string | null
          screen_facing: string | null
          screen_start_time: string | null
          specialty: string[] | null
          spots_per_hour: number | null
          state: string | null
          state_norm: string | null
          state_uf: string | null
          tag: string | null
          updated_at: string | null
          venue_id: number | null
          venue_type_child: string | null
          venue_type_grandchildren: string | null
          venue_type_parent: string | null
        }
        Insert: {
          active?: boolean | null
          address_norm?: string | null
          address_raw?: string | null
          asset_url?: string | null
          base_daily_traffic?: number | null
          board_format?: string | null
          category?: string | null
          cep?: string | null
          city?: string | null
          city_norm?: string | null
          class?: Database["public"]["Enums"]["class_band"] | null
          code?: string | null
          created_at?: string | null
          display_name?: string | null
          facing?: string | null
          geom?: unknown
          google_formatted_address?: string | null
          google_place_id?: string | null
          id?: number | null
          lat?: number | null
          lng?: number | null
          name?: string | null
          screen_end_time?: string | null
          screen_facing?: string | null
          screen_start_time?: string | null
          specialty?: string[] | null
          spots_per_hour?: number | null
          state?: string | null
          state_norm?: string | null
          state_uf?: string | null
          tag?: string | null
          updated_at?: string | null
          venue_id?: number | null
          venue_type_child?: string | null
          venue_type_grandchildren?: string | null
          venue_type_parent?: string | null
        }
        Update: {
          active?: boolean | null
          address_norm?: string | null
          address_raw?: string | null
          asset_url?: string | null
          base_daily_traffic?: number | null
          board_format?: string | null
          category?: string | null
          cep?: string | null
          city?: string | null
          city_norm?: string | null
          class?: Database["public"]["Enums"]["class_band"] | null
          code?: string | null
          created_at?: string | null
          display_name?: string | null
          facing?: string | null
          geom?: unknown
          google_formatted_address?: string | null
          google_place_id?: string | null
          id?: number | null
          lat?: number | null
          lng?: number | null
          name?: string | null
          screen_end_time?: string | null
          screen_facing?: string | null
          screen_start_time?: string | null
          specialty?: string[] | null
          spots_per_hour?: number | null
          state?: string | null
          state_norm?: string | null
          state_uf?: string | null
          tag?: string | null
          updated_at?: string | null
          venue_id?: number | null
          venue_type_child?: string | null
          venue_type_grandchildren?: string | null
          venue_type_parent?: string | null
        }
        Relationships: []
      }
      screens_backup_20250919_144453: {
        Row: {
          active: boolean | null
          address_norm: string | null
          address_raw: string | null
          asset_url: string | null
          base_daily_traffic: number | null
          board_format: string | null
          category: string | null
          cep: string | null
          city: string | null
          city_norm: string | null
          class: Database["public"]["Enums"]["class_band"] | null
          code: string | null
          created_at: string | null
          display_name: string | null
          facing: string | null
          geom: unknown
          google_formatted_address: string | null
          google_place_id: string | null
          id: number | null
          lat: number | null
          lng: number | null
          name: string | null
          screen_end_time: string | null
          screen_facing: string | null
          screen_start_time: string | null
          specialty: string[] | null
          spots_per_hour: number | null
          state: string | null
          state_norm: string | null
          state_uf: string | null
          tag: string | null
          updated_at: string | null
          venue_id: number | null
          venue_type_child: string | null
          venue_type_grandchildren: string | null
          venue_type_parent: string | null
        }
        Insert: {
          active?: boolean | null
          address_norm?: string | null
          address_raw?: string | null
          asset_url?: string | null
          base_daily_traffic?: number | null
          board_format?: string | null
          category?: string | null
          cep?: string | null
          city?: string | null
          city_norm?: string | null
          class?: Database["public"]["Enums"]["class_band"] | null
          code?: string | null
          created_at?: string | null
          display_name?: string | null
          facing?: string | null
          geom?: unknown
          google_formatted_address?: string | null
          google_place_id?: string | null
          id?: number | null
          lat?: number | null
          lng?: number | null
          name?: string | null
          screen_end_time?: string | null
          screen_facing?: string | null
          screen_start_time?: string | null
          specialty?: string[] | null
          spots_per_hour?: number | null
          state?: string | null
          state_norm?: string | null
          state_uf?: string | null
          tag?: string | null
          updated_at?: string | null
          venue_id?: number | null
          venue_type_child?: string | null
          venue_type_grandchildren?: string | null
          venue_type_parent?: string | null
        }
        Update: {
          active?: boolean | null
          address_norm?: string | null
          address_raw?: string | null
          asset_url?: string | null
          base_daily_traffic?: number | null
          board_format?: string | null
          category?: string | null
          cep?: string | null
          city?: string | null
          city_norm?: string | null
          class?: Database["public"]["Enums"]["class_band"] | null
          code?: string | null
          created_at?: string | null
          display_name?: string | null
          facing?: string | null
          geom?: unknown
          google_formatted_address?: string | null
          google_place_id?: string | null
          id?: number | null
          lat?: number | null
          lng?: number | null
          name?: string | null
          screen_end_time?: string | null
          screen_facing?: string | null
          screen_start_time?: string | null
          specialty?: string[] | null
          spots_per_hour?: number | null
          state?: string | null
          state_norm?: string | null
          state_uf?: string | null
          tag?: string | null
          updated_at?: string | null
          venue_id?: number | null
          venue_type_child?: string | null
          venue_type_grandchildren?: string | null
          venue_type_parent?: string | null
        }
        Relationships: []
      }
      screens_backup_geo_utc_now: {
        Row: {
          active: boolean | null
          address_norm: string | null
          address_raw: string | null
          asset_url: string | null
          base_daily_traffic: number | null
          board_format: string | null
          category: string | null
          cep: string | null
          cep_norm: string | null
          city: string | null
          city_norm: string | null
          class: Database["public"]["Enums"]["class_band"] | null
          code: string | null
          created_at: string | null
          display_name: string | null
          facing: string | null
          geom: unknown
          google_formatted_address: string | null
          google_place_id: string | null
          id: number | null
          lat: number | null
          lng: number | null
          name: string | null
          screen_end_time: string | null
          screen_facing: string | null
          screen_start_time: string | null
          specialty: string[] | null
          spots_per_hour: number | null
          state: string | null
          state_norm: string | null
          state_uf: string | null
          tag: string | null
          updated_at: string | null
          venue_id: number | null
          venue_type_child: string | null
          venue_type_grandchildren: string | null
          venue_type_parent: string | null
        }
        Insert: {
          active?: boolean | null
          address_norm?: string | null
          address_raw?: string | null
          asset_url?: string | null
          base_daily_traffic?: number | null
          board_format?: string | null
          category?: string | null
          cep?: string | null
          cep_norm?: string | null
          city?: string | null
          city_norm?: string | null
          class?: Database["public"]["Enums"]["class_band"] | null
          code?: string | null
          created_at?: string | null
          display_name?: string | null
          facing?: string | null
          geom?: unknown
          google_formatted_address?: string | null
          google_place_id?: string | null
          id?: number | null
          lat?: number | null
          lng?: number | null
          name?: string | null
          screen_end_time?: string | null
          screen_facing?: string | null
          screen_start_time?: string | null
          specialty?: string[] | null
          spots_per_hour?: number | null
          state?: string | null
          state_norm?: string | null
          state_uf?: string | null
          tag?: string | null
          updated_at?: string | null
          venue_id?: number | null
          venue_type_child?: string | null
          venue_type_grandchildren?: string | null
          venue_type_parent?: string | null
        }
        Update: {
          active?: boolean | null
          address_norm?: string | null
          address_raw?: string | null
          asset_url?: string | null
          base_daily_traffic?: number | null
          board_format?: string | null
          category?: string | null
          cep?: string | null
          cep_norm?: string | null
          city?: string | null
          city_norm?: string | null
          class?: Database["public"]["Enums"]["class_band"] | null
          code?: string | null
          created_at?: string | null
          display_name?: string | null
          facing?: string | null
          geom?: unknown
          google_formatted_address?: string | null
          google_place_id?: string | null
          id?: number | null
          lat?: number | null
          lng?: number | null
          name?: string | null
          screen_end_time?: string | null
          screen_facing?: string | null
          screen_start_time?: string | null
          specialty?: string[] | null
          spots_per_hour?: number | null
          state?: string | null
          state_norm?: string | null
          state_uf?: string | null
          tag?: string | null
          updated_at?: string | null
          venue_id?: number | null
          venue_type_child?: string | null
          venue_type_grandchildren?: string | null
          venue_type_parent?: string | null
        }
        Relationships: []
      }
      servicos_especiais: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          created_by: string | null
          descricao: string | null
          id: string
          nome_servico: string
          preco_base: number
          tipo_cobranca: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          created_by?: string | null
          descricao?: string | null
          id?: string
          nome_servico: string
          preco_base?: number
          tipo_cobranca?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          created_by?: string | null
          descricao?: string | null
          id?: string
          nome_servico?: string
          preco_base?: number
          tipo_cobranca?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      spatial_ref_sys: {
        Row: {
          auth_name: string | null
          auth_srid: number | null
          proj4text: string | null
          srid: number
          srtext: string | null
        }
        Insert: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid: number
          srtext?: string | null
        }
        Update: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid?: number
          srtext?: string | null
        }
        Relationships: []
      }
      specialties: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      specialty_term_map: {
        Row: {
          created_at: string | null
          id: string
          specialty_id: string
          term_norm: string
          term_original: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          specialty_id: string
          term_norm: string
          term_original: string
        }
        Update: {
          created_at?: string | null
          id?: string
          specialty_id?: string
          term_norm?: string
          term_original?: string
        }
        Relationships: [
          {
            foreignKeyName: "specialty_term_map_specialty_id_fkey"
            columns: ["specialty_id"]
            isOneToOne: false
            referencedRelation: "specialties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "specialty_term_map_specialty_id_fkey"
            columns: ["specialty_id"]
            isOneToOne: false
            referencedRelation: "vw_venue_specialties"
            referencedColumns: ["specialty_id"]
          },
        ]
      }
      staging_screens: {
        Row: {
          address_raw: string | null
          base_daily_traffic: string | null
          category: string | null
          cep: string | null
          city: string | null
          class: string | null
          code: string | null
          display_name: string | null
          imported_at: string | null
          lat: string | null
          lng: string | null
          specialty: string | null
          state: string | null
        }
        Insert: {
          address_raw?: string | null
          base_daily_traffic?: string | null
          category?: string | null
          cep?: string | null
          city?: string | null
          class?: string | null
          code?: string | null
          display_name?: string | null
          imported_at?: string | null
          lat?: string | null
          lng?: string | null
          specialty?: string | null
          state?: string | null
        }
        Update: {
          address_raw?: string | null
          base_daily_traffic?: string | null
          category?: string | null
          cep?: string | null
          city?: string | null
          class?: string | null
          code?: string | null
          display_name?: string | null
          imported_at?: string | null
          lat?: string | null
          lng?: string | null
          specialty?: string | null
          state?: string | null
        }
        Relationships: []
      }
      stg_billboard_data: {
        Row: {
          active: string | null
          asset_url: string | null
          audiences_monthly: number | null
          available: string | null
          board_format: string | null
          board_name: string | null
          category: string | null
          country: string | null
          cpm: number | null
          display_name: string | null
          district: string | null
          expose_to_mad: string | null
          expose_to_max: string | null
          facing: string | null
          imported_at: string | null
          imported_by: string | null
          latitude: number | null
          longitude: number | null
          maximum_spots_per_day: number | null
          minimum_spots_per_day: number | null
          mode_of_operation: string | null
          no_of_clients_per_loop: number | null
          raw_id: number
          screen_end_time: string | null
          screen_facing: string | null
          screen_start_time: string | null
          selling_rate_month: number | null
          spot_duration_secs: number | null
          spots_per_hour: number | null
          spots_reserved_for_mw: string | null
          standard_rates_month: number | null
          state: string | null
          venue_type_child: string | null
          venue_type_grandchildren: string | null
          venue_type_parent: string | null
        }
        Insert: {
          active?: string | null
          asset_url?: string | null
          audiences_monthly?: number | null
          available?: string | null
          board_format?: string | null
          board_name?: string | null
          category?: string | null
          country?: string | null
          cpm?: number | null
          display_name?: string | null
          district?: string | null
          expose_to_mad?: string | null
          expose_to_max?: string | null
          facing?: string | null
          imported_at?: string | null
          imported_by?: string | null
          latitude?: number | null
          longitude?: number | null
          maximum_spots_per_day?: number | null
          minimum_spots_per_day?: number | null
          mode_of_operation?: string | null
          no_of_clients_per_loop?: number | null
          raw_id?: number
          screen_end_time?: string | null
          screen_facing?: string | null
          screen_start_time?: string | null
          selling_rate_month?: number | null
          spot_duration_secs?: number | null
          spots_per_hour?: number | null
          spots_reserved_for_mw?: string | null
          standard_rates_month?: number | null
          state?: string | null
          venue_type_child?: string | null
          venue_type_grandchildren?: string | null
          venue_type_parent?: string | null
        }
        Update: {
          active?: string | null
          asset_url?: string | null
          audiences_monthly?: number | null
          available?: string | null
          board_format?: string | null
          board_name?: string | null
          category?: string | null
          country?: string | null
          cpm?: number | null
          display_name?: string | null
          district?: string | null
          expose_to_mad?: string | null
          expose_to_max?: string | null
          facing?: string | null
          imported_at?: string | null
          imported_by?: string | null
          latitude?: number | null
          longitude?: number | null
          maximum_spots_per_day?: number | null
          minimum_spots_per_day?: number | null
          mode_of_operation?: string | null
          no_of_clients_per_loop?: number | null
          raw_id?: number
          screen_end_time?: string | null
          screen_facing?: string | null
          screen_start_time?: string | null
          selling_rate_month?: number | null
          spot_duration_secs?: number | null
          spots_per_hour?: number | null
          spots_reserved_for_mw?: string | null
          standard_rates_month?: number | null
          state?: string | null
          venue_type_child?: string | null
          venue_type_grandchildren?: string | null
          venue_type_parent?: string | null
        }
        Relationships: []
      }
      stg_ponto: {
        Row: {
          audiencia: number | null
          codigo_de_ponto: string | null
          imported_at: string | null
          imported_by: string | null
          ponto_de_cuidado: string | null
          raw_id: number
          screen_id: number | null
        }
        Insert: {
          audiencia?: number | null
          codigo_de_ponto?: string | null
          imported_at?: string | null
          imported_by?: string | null
          ponto_de_cuidado?: string | null
          raw_id?: number
          screen_id?: number | null
        }
        Update: {
          audiencia?: number | null
          codigo_de_ponto?: string | null
          imported_at?: string | null
          imported_by?: string | null
          ponto_de_cuidado?: string | null
          raw_id?: number
          screen_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stg_ponto_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "_audit_screens_state_unmapped"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stg_ponto_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "screen_proposal_popularity"
            referencedColumns: ["screen_id"]
          },
          {
            foreignKeyName: "stg_ponto_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "screens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stg_ponto_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "screens_enriched"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stg_ponto_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "v_proposal_items"
            referencedColumns: ["screen_id"]
          },
          {
            foreignKeyName: "stg_ponto_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "v_proposal_pdf"
            referencedColumns: ["screen_id"]
          },
          {
            foreignKeyName: "stg_ponto_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "v_screens_enriched"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stg_ponto_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "vw_inventory_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stg_ponto_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "vw_screens_front"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stg_ponto_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "vw_screens_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stg_ponto_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "vw_screens_inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stg_ponto_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "vw_screens_pretty"
            referencedColumns: ["id"]
          },
        ]
      }
      stg_screens_new: {
        Row: {
          "ACEITA CONVÊNIO": string | null
          AUDIÊNCIA: string | null
          "CAPITAL/INTERIOR": string | null
          CEP: string | null
          CIDADE: string | null
          CLASSE: string | null
          code_norm: string | null
          "CÓDIGO DE PONTO": string | null
          display_name: string | null
          endereco_completo: string | null
          "ESPECIALIDADE 1": string | null
          "ESPECIALIDADE 2": string | null
          "ESPECIALIDADE 3": string | null
          "ESPECIALIDADE 4": string | null
          "ESPECIALIDADE 5": string | null
          "ESPECIALIDADES ATENDIDAS": string | null
          LATITUDE: string | null
          LONGITUDE: string | null
          "Nome do Ponto": string | null
          PROGRAMÁTICA: string | null
          REDE: string | null
          REGIÃO: string | null
          RESTRIÇÕES: string | null
          "Tipo de Espaço": string | null
          UF: string | null
        }
        Insert: {
          "ACEITA CONVÊNIO"?: string | null
          AUDIÊNCIA?: string | null
          "CAPITAL/INTERIOR"?: string | null
          CEP?: string | null
          CIDADE?: string | null
          CLASSE?: string | null
          code_norm?: string | null
          "CÓDIGO DE PONTO"?: string | null
          display_name?: string | null
          endereco_completo?: string | null
          "ESPECIALIDADE 1"?: string | null
          "ESPECIALIDADE 2"?: string | null
          "ESPECIALIDADE 3"?: string | null
          "ESPECIALIDADE 4"?: string | null
          "ESPECIALIDADE 5"?: string | null
          "ESPECIALIDADES ATENDIDAS"?: string | null
          LATITUDE?: string | null
          LONGITUDE?: string | null
          "Nome do Ponto"?: string | null
          PROGRAMÁTICA?: string | null
          REDE?: string | null
          REGIÃO?: string | null
          RESTRIÇÕES?: string | null
          "Tipo de Espaço"?: string | null
          UF?: string | null
        }
        Update: {
          "ACEITA CONVÊNIO"?: string | null
          AUDIÊNCIA?: string | null
          "CAPITAL/INTERIOR"?: string | null
          CEP?: string | null
          CIDADE?: string | null
          CLASSE?: string | null
          code_norm?: string | null
          "CÓDIGO DE PONTO"?: string | null
          display_name?: string | null
          endereco_completo?: string | null
          "ESPECIALIDADE 1"?: string | null
          "ESPECIALIDADE 2"?: string | null
          "ESPECIALIDADE 3"?: string | null
          "ESPECIALIDADE 4"?: string | null
          "ESPECIALIDADE 5"?: string | null
          "ESPECIALIDADES ATENDIDAS"?: string | null
          LATITUDE?: string | null
          LONGITUDE?: string | null
          "Nome do Ponto"?: string | null
          PROGRAMÁTICA?: string | null
          REDE?: string | null
          REGIÃO?: string | null
          RESTRIÇÕES?: string | null
          "Tipo de Espaço"?: string | null
          UF?: string | null
        }
        Relationships: []
      }
      stg_venue_specialties_pairs: {
        Row: {
          code: string | null
          spec: string | null
        }
        Insert: {
          code?: string | null
          spec?: string | null
        }
        Update: {
          code?: string | null
          spec?: string | null
        }
        Relationships: []
      }
      stg_venue_specs_raw: {
        Row: {
          code: string | null
          raw: string | null
        }
        Insert: {
          code?: string | null
          raw?: string | null
        }
        Update: {
          code?: string | null
          raw?: string | null
        }
        Relationships: []
      }
      tmp_ceps_uf: {
        Row: {
          cep: string | null
          cidade_norm: string | null
          logradouro_norm: string | null
        }
        Insert: {
          cep?: string | null
          cidade_norm?: string | null
          logradouro_norm?: string | null
        }
        Update: {
          cep?: string | null
          cidade_norm?: string | null
          logradouro_norm?: string | null
        }
        Relationships: []
      }
      user_profiles_secure: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          display_name: string | null
          email: string | null
          id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
        }
        Relationships: []
      }
      user_role_assignments: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_session_history: {
        Row: {
          created_at: string | null
          duration_minutes: number | null
          ended_at: string | null
          ended_by: string | null
          id: string
          ip_address: unknown
          session_token: string
          started_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          duration_minutes?: number | null
          ended_at?: string | null
          ended_by?: string | null
          id?: string
          ip_address?: unknown
          session_token: string
          started_at: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          duration_minutes?: number | null
          ended_at?: string | null
          ended_by?: string | null
          id?: string
          ip_address?: unknown
          session_token?: string
          started_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          ip_address: unknown
          is_active: boolean | null
          last_seen_at: string
          session_token: string
          started_at: string
          updated_at: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          ip_address?: unknown
          is_active?: boolean | null
          last_seen_at?: string
          session_token: string
          started_at?: string
          updated_at?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          ip_address?: unknown
          is_active?: boolean | null
          last_seen_at?: string
          session_token?: string
          started_at?: string
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      venue_audience_monthly: {
        Row: {
          audience: number
          created_at: string | null
          created_by: string | null
          id: number
          month: string
          venue_id: number | null
        }
        Insert: {
          audience: number
          created_at?: string | null
          created_by?: string | null
          id?: number
          month: string
          venue_id?: number | null
        }
        Update: {
          audience?: number
          created_at?: string | null
          created_by?: string | null
          id?: number
          month?: string
          venue_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "venue_audience_monthly_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "_audit_venues_state_unmapped"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_audience_monthly_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "mv_venue_farmacia_distancia"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_audience_monthly_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "safe_venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_audience_monthly_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "screens_enriched"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_audience_monthly_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_audience_monthly_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "view_detalhes_profissionais"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_audience_monthly_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "vw_inventory_full"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_audience_monthly_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "vw_screens_full"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_audience_monthly_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "vw_venue_specialties"
            referencedColumns: ["venue_id"]
          },
        ]
      }
      venue_specialties: {
        Row: {
          specialty_id: string
          venue_id: number
        }
        Insert: {
          specialty_id: string
          venue_id: number
        }
        Update: {
          specialty_id?: string
          venue_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_specialty"
            columns: ["specialty_id"]
            isOneToOne: false
            referencedRelation: "specialties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_specialty"
            columns: ["specialty_id"]
            isOneToOne: false
            referencedRelation: "vw_venue_specialties"
            referencedColumns: ["specialty_id"]
          },
          {
            foreignKeyName: "fk_venue"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "_audit_venues_state_unmapped"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_venue"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "mv_venue_farmacia_distancia"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "fk_venue"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "safe_venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_venue"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "screens_enriched"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "fk_venue"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_venue"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "view_detalhes_profissionais"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "fk_venue"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "vw_inventory_full"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "fk_venue"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "vw_screens_full"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "fk_venue"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "vw_venue_specialties"
            referencedColumns: ["venue_id"]
          },
        ]
      }
      venues: {
        Row: {
          aceita_convenio: boolean | null
          cep: string | null
          cidade: string | null
          code: string | null
          country: string | null
          created_at: string | null
          district: string | null
          geom: unknown
          google_formatted_address: string | null
          google_place_id: string | null
          id: number
          lat: number | null
          lng: number | null
          name: string
          network_id: string | null
          numero: string | null
          rua_av: string | null
          state: string | null
          state_uf: string | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          aceita_convenio?: boolean | null
          cep?: string | null
          cidade?: string | null
          code?: string | null
          country?: string | null
          created_at?: string | null
          district?: string | null
          geom?: unknown
          google_formatted_address?: string | null
          google_place_id?: string | null
          id?: number
          lat?: number | null
          lng?: number | null
          name: string
          network_id?: string | null
          numero?: string | null
          rua_av?: string | null
          state?: string | null
          state_uf?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          aceita_convenio?: boolean | null
          cep?: string | null
          cidade?: string | null
          code?: string | null
          country?: string | null
          created_at?: string | null
          district?: string | null
          geom?: unknown
          google_formatted_address?: string | null
          google_place_id?: string | null
          id?: number
          lat?: number | null
          lng?: number | null
          name?: string
          network_id?: string | null
          numero?: string | null
          rua_av?: string | null
          state?: string | null
          state_uf?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_venues_network_id"
            columns: ["network_id"]
            isOneToOne: false
            referencedRelation: "networks"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      _audit_agencias_state_unmapped: {
        Row: {
          cidade: string | null
          id: string | null
          nome_agencia: string | null
          raw_estado: string | null
        }
        Insert: {
          cidade?: string | null
          id?: string | null
          nome_agencia?: string | null
          raw_estado?: string | null
        }
        Update: {
          cidade?: string | null
          id?: string | null
          nome_agencia?: string | null
          raw_estado?: string | null
        }
        Relationships: []
      }
      _audit_holidays_state_unmapped: {
        Row: {
          city: string | null
          id: number | null
          name: string | null
          raw_state: string | null
        }
        Insert: {
          city?: string | null
          id?: number | null
          name?: string | null
          raw_state?: string | null
        }
        Update: {
          city?: string | null
          id?: number | null
          name?: string | null
          raw_state?: string | null
        }
        Relationships: []
      }
      _audit_screens_state_unmapped: {
        Row: {
          city: string | null
          id: number | null
          name: string | null
          raw_state: string | null
        }
        Insert: {
          city?: string | null
          id?: number | null
          name?: string | null
          raw_state?: string | null
        }
        Update: {
          city?: string | null
          id?: number | null
          name?: string | null
          raw_state?: string | null
        }
        Relationships: []
      }
      _audit_venues_state_unmapped: {
        Row: {
          cidade: string | null
          id: number | null
          name: string | null
          raw_state: string | null
        }
        Insert: {
          cidade?: string | null
          id?: number | null
          name?: string | null
          raw_state?: string | null
        }
        Update: {
          cidade?: string | null
          id?: number | null
          name?: string | null
          raw_state?: string | null
        }
        Relationships: []
      }
      email_stats: {
        Row: {
          email_type: string | null
          last_7_days: number | null
          status: string | null
          today: number | null
          total: number | null
        }
        Relationships: []
      }
      geography_columns: {
        Row: {
          coord_dimension: number | null
          f_geography_column: unknown
          f_table_catalog: unknown
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Relationships: []
      }
      geometry_columns: {
        Row: {
          coord_dimension: number | null
          f_geometry_column: unknown
          f_table_catalog: string | null
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Insert: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Update: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Relationships: []
      }
      mv_venue_farmacia_distancia: {
        Row: {
          cidade_farmacia: string | null
          distancia_km: number | null
          farmacia_id: number | null
          grupo: string | null
          nome_farmacia: string | null
          nome_venue: string | null
          venue_id: number | null
        }
        Relationships: []
      }
      proposal_kpis: {
        Row: {
          cpm_mode: string | null
          cpm_value: number | null
          created_at: string | null
          created_by: string | null
          days_business: number | null
          days_calendar: number | null
          discount_fixed: number | null
          discount_pct: number | null
          effective_cpm: number | null
          end_date: string | null
          gross_business: number | null
          gross_calendar: number | null
          id: number | null
          impacts_business: number | null
          impacts_calendar: number | null
          net_business: number | null
          net_calendar: number | null
          proposal_type: string | null
          start_date: string | null
          status: string | null
          total_screens: number | null
          total_value: number | null
        }
        Insert: {
          cpm_mode?: string | null
          cpm_value?: number | null
          created_at?: string | null
          created_by?: string | null
          days_business?: number | null
          days_calendar?: number | null
          discount_fixed?: number | null
          discount_pct?: number | null
          effective_cpm?: never
          end_date?: string | null
          gross_business?: number | null
          gross_calendar?: number | null
          id?: number | null
          impacts_business?: number | null
          impacts_calendar?: number | null
          net_business?: number | null
          net_calendar?: number | null
          proposal_type?: string | null
          start_date?: string | null
          status?: never
          total_screens?: never
          total_value?: never
        }
        Update: {
          cpm_mode?: string | null
          cpm_value?: number | null
          created_at?: string | null
          created_by?: string | null
          days_business?: number | null
          days_calendar?: number | null
          discount_fixed?: number | null
          discount_pct?: number | null
          effective_cpm?: never
          end_date?: string | null
          gross_business?: number | null
          gross_calendar?: number | null
          id?: number | null
          impacts_business?: number | null
          impacts_calendar?: number | null
          net_business?: number | null
          net_calendar?: number | null
          proposal_type?: string | null
          start_date?: string | null
          status?: never
          total_screens?: never
          total_value?: never
        }
        Relationships: []
      }
      proposal_locales: {
        Row: {
          city: string | null
          city_norm: string | null
          proposal_id: number | null
          screens_count: number | null
          state: string | null
          state_norm: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposal_screens_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposal_kpis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_screens_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_screens_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_proposal_items"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_screens_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_proposal_pdf"
            referencedColumns: ["proposal_id"]
          },
        ]
      }
      proposal_locations_summary: {
        Row: {
          cities_count: number | null
          cities_list: string | null
          proposal_id: number | null
          states_count: number | null
          states_list: string | null
          total_screens: number | null
        }
        Relationships: [
          {
            foreignKeyName: "proposal_screens_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposal_kpis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_screens_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_screens_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_proposal_items"
            referencedColumns: ["proposal_id"]
          },
          {
            foreignKeyName: "proposal_screens_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_proposal_pdf"
            referencedColumns: ["proposal_id"]
          },
        ]
      }
      safe_user_profiles: {
        Row: {
          avatar_url: string | null
          display_name: string | null
          effective_role: string | null
          id: string | null
        }
        Relationships: []
      }
      safe_venues: {
        Row: {
          code: string | null
          country: string | null
          created_at: string | null
          district: string | null
          id: number | null
          lat: number | null
          lng: number | null
          name: string | null
          state: string | null
        }
        Insert: {
          code?: string | null
          country?: string | null
          created_at?: string | null
          district?: string | null
          id?: number | null
          lat?: number | null
          lng?: number | null
          name?: string | null
          state?: string | null
        }
        Update: {
          code?: string | null
          country?: string | null
          created_at?: string | null
          district?: string | null
          id?: number | null
          lat?: number | null
          lng?: number | null
          name?: string | null
          state?: string | null
        }
        Relationships: []
      }
      screen_proposal_popularity: {
        Row: {
          city: string | null
          class: string | null
          lat: number | null
          lng: number | null
          name: string | null
          proposal_count: number | null
          screen_id: number | null
        }
        Relationships: []
      }
      screens_enriched: {
        Row: {
          city: string | null
          code: string | null
          display_name: string | null
          geom: unknown
          id: number | null
          is_screen_active: boolean | null
          lat: number | null
          lng: number | null
          name: string | null
          screens_enriched_active: boolean | null
          specialty: string[] | null
          state_uf: string | null
          venue_aceita_convenio: boolean | null
          venue_id: number | null
          venue_name: string | null
          venue_type: string | null
        }
        Relationships: []
      }
      stg_billboard_enriched: {
        Row: {
          active: string | null
          asset_url: string | null
          audiences_monthly: number | null
          available: string | null
          board_format: string | null
          board_name: string | null
          category: string | null
          codigo_de_ponto_guess: string | null
          country: string | null
          cpm: number | null
          display_name: string | null
          district: string | null
          expose_to_mad: string | null
          expose_to_max: string | null
          facing: string | null
          imported_at: string | null
          latitude: number | null
          longitude: number | null
          maximum_spots_per_day: number | null
          minimum_spots_per_day: number | null
          mode_of_operation: string | null
          no_of_clients_per_loop: number | null
          raw_id: number | null
          screen_end_time: string | null
          screen_facing: string | null
          screen_start_time: string | null
          selling_rate_month: number | null
          spot_duration_secs: number | null
          spots_per_hour: number | null
          spots_reserved_for_mw: string | null
          standard_rates_month: number | null
          state: string | null
          venue_type_child: string | null
          venue_type_grandchildren: string | null
          venue_type_parent: string | null
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          display_name: string | null
          id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string | null
        }
        Relationships: []
      }
      user_profiles_admin: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          display_name: string | null
          email: string | null
          id: string | null
          profile_role: string | null
        }
        Relationships: []
      }
      user_profiles_extended: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          display_name: string | null
          id: string | null
          profile_role: string | null
        }
        Relationships: []
      }
      v_farmacias_public: {
        Row: {
          bairro: string | null
          cep: string | null
          cidade: string | null
          endereco: string | null
          grupo: string | null
          id: number | null
          latitude: number | null
          longitude: number | null
          nome: string | null
          numero: string | null
          uf: string | null
        }
        Insert: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          endereco?: string | null
          grupo?: string | null
          id?: number | null
          latitude?: number | null
          longitude?: number | null
          nome?: string | null
          numero?: string | null
          uf?: string | null
        }
        Update: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          endereco?: string | null
          grupo?: string | null
          id?: number | null
          latitude?: number | null
          longitude?: number | null
          nome?: string | null
          numero?: string | null
          uf?: string | null
        }
        Relationships: []
      }
      v_proposal_items: {
        Row: {
          agencia_id: string | null
          category: string | null
          city: string | null
          cpm_mode: string | null
          cpm_value: number | null
          customer_email: string | null
          customer_name: string | null
          discount_fixed: number | null
          discount_pct: number | null
          end_date: string | null
          film_seconds: number | null
          insertions_per_hour: number | null
          projeto_id: string | null
          proposal_city: string | null
          proposal_id: number | null
          screen_id: number | null
          specialties: string[] | null
          start_date: string | null
          state: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposals_agencia_id_fkey"
            columns: ["agencia_id"]
            isOneToOne: false
            referencedRelation: "_audit_agencias_state_unmapped"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_agencia_id_fkey"
            columns: ["agencia_id"]
            isOneToOne: false
            referencedRelation: "agencias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "agencia_projetos"
            referencedColumns: ["id"]
          },
        ]
      }
      v_proposal_pdf: {
        Row: {
          base_daily_traffic: number | null
          city: string | null
          code: string | null
          cpm_mode: string | null
          cpm_value: number | null
          created_at: string | null
          custom_cpm: number | null
          customer_email: string | null
          customer_name: string | null
          daily_traffic_override: number | null
          discount_fixed: number | null
          discount_pct: number | null
          film_seconds: number | null
          filters: Json | null
          hours_on_override: number | null
          insertions_per_hour: number | null
          proposal_id: number | null
          quote: Json | null
          screen_city: string | null
          screen_id: number | null
          screen_name: string | null
          screen_state: string | null
          spots_per_hour: number | null
          status: string | null
        }
        Relationships: []
      }
      v_screens_enriched: {
        Row: {
          active: boolean | null
          address: string | null
          board_format: string | null
          category: string | null
          cep: string | null
          city: string | null
          class: string | null
          code: string | null
          created_at: string | null
          display_name: string | null
          geom: unknown
          id: number | null
          lat: number | null
          lng: number | null
          name: string | null
          rede: string | null
          selling_rate_month: number | null
          specialty: string[] | null
          spot_duration_secs: number | null
          spots_per_hour: number | null
          staging_audiencia: number | null
          staging_categoria: string | null
          staging_especialidades: string | null
          staging_nome_ponto: string | null
          staging_subtipo: string | null
          staging_tipo_venue: string | null
          standard_rate_month: number | null
          state: string | null
          updated_at: string | null
          venue_address: string | null
          venue_country: string | null
          venue_district: string | null
          venue_name: string | null
          venue_state: string | null
        }
        Relationships: []
      }
      v_specialty_term_map: {
        Row: {
          specialty: string | null
          term_norm: string | null
          term_original: string | null
        }
        Relationships: []
      }
      view_detalhes_profissionais: {
        Row: {
          cargo_na_unidade: string | null
          especialidades: string[] | null
          profissional_id: string | null
          profissional_nome: string | null
          registro_profissional: string | null
          tipo_profissional: string | null
          tipo_registro: string | null
          venue_cidade: string | null
          venue_id: number | null
          venue_nome: string | null
        }
        Relationships: []
      }
      view_farmacias_detalhe: {
        Row: {
          cep: string | null
          cidade: string | null
          cnpj: string | null
          created_at: string | null
          endereco_formatado: string | null
          fantasia: string | null
          grupo: string | null
          id: number | null
          latitude: number | null
          localizacao: unknown
          longitude: number | null
          status_operacional: string | null
          uf: string | null
        }
        Insert: {
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          created_at?: string | null
          endereco_formatado?: never
          fantasia?: string | null
          grupo?: string | null
          id?: number | null
          latitude?: never
          localizacao?: unknown
          longitude?: never
          status_operacional?: never
          uf?: string | null
        }
        Update: {
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          created_at?: string | null
          endereco_formatado?: never
          fantasia?: string | null
          grupo?: string | null
          id?: number | null
          latitude?: never
          localizacao?: unknown
          longitude?: never
          status_operacional?: never
          uf?: string | null
        }
        Relationships: []
      }
      vw_inventory_full: {
        Row: {
          active: boolean | null
          address_raw: string | null
          base_daily_traffic: number | null
          category: string | null
          cep: string | null
          city: string | null
          class: Database["public"]["Enums"]["class_band"] | null
          classes_map: string[] | null
          code: string | null
          display_name: string | null
          geom: unknown
          id: number | null
          lat: number | null
          lng: number | null
          name: string | null
          selling_rate_month: number | null
          specialties: string[] | null
          spot_duration_secs: number | null
          spots_per_hour: number | null
          standard_rate_month: number | null
          state: string | null
          venue_id: number | null
          venue_name: string | null
          venue_state_uf: string | null
          venue_type_child: string | null
          venue_type_grandchildren: string | null
          venue_type_parent: string | null
        }
        Relationships: []
      }
      vw_screens_front: {
        Row: {
          active: boolean | null
          address_norm: string | null
          address_raw: string | null
          board_format: string | null
          category: string | null
          cep: string | null
          city: string | null
          classes: string[] | null
          code: string | null
          created_at: string | null
          display_name: string | null
          id: number | null
          lat: number | null
          lng: number | null
          name: string | null
          screen_end_time: string | null
          screen_specialty: string[] | null
          screen_start_time: string | null
          spots_per_hour: number | null
          state_name: string | null
          state_uf: string | null
          updated_at: string | null
          venue_city: string | null
          venue_code: string | null
          venue_id: number | null
          venue_name: string | null
          venue_specialties: string[] | null
          venue_state_uf: string | null
          venue_type_child: string | null
          venue_type_grandchildren: string | null
          venue_type_parent: string | null
        }
        Relationships: [
          {
            foreignKeyName: "screens_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "_audit_venues_state_unmapped"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screens_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "mv_venue_farmacia_distancia"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "screens_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "safe_venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screens_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "screens_enriched"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "screens_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screens_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "view_detalhes_profissionais"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "screens_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "vw_inventory_full"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "screens_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "vw_screens_full"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "screens_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "vw_venue_specialties"
            referencedColumns: ["venue_id"]
          },
        ]
      }
      vw_screens_full: {
        Row: {
          active: boolean | null
          address_norm: string | null
          address_raw: string | null
          board_format: string | null
          category: string | null
          cep: string | null
          city: string | null
          classes: string[] | null
          code: string | null
          cpm: number | null
          created_at: string | null
          display_name: string | null
          future_bookings: number | null
          geom: unknown
          id: number | null
          lat: number | null
          lng: number | null
          name: string | null
          next_available_from: string | null
          next_available_to: string | null
          rate_spots_per_hour: number | null
          screen_end_time: string | null
          screen_start_time: string | null
          selling_rate_month: number | null
          specialty: string[] | null
          spot_duration_secs: number | null
          spots_per_hour: number | null
          standard_rate_month: number | null
          state_name: string | null
          state_uf: string | null
          updated_at: string | null
          venue_city: string | null
          venue_code: string | null
          venue_id: number | null
          venue_name: string | null
          venue_state_uf: string | null
          venue_type_child: string | null
          venue_type_grandchildren: string | null
          venue_type_parent: string | null
        }
        Relationships: []
      }
      vw_screens_inventory: {
        Row: {
          active: boolean | null
          address: string | null
          cep: string | null
          city: string | null
          class: Database["public"]["Enums"]["class_band"] | null
          code: string | null
          geom: unknown
          id: number | null
          lat: number | null
          lng: number | null
          name: string | null
          selling_rate_month: number | null
          spot_duration_secs: number | null
          spots_per_hour: number | null
          staging_audiencia: number | null
          staging_categoria: string | null
          staging_especialidades: string | null
          staging_nome_ponto: string | null
          staging_subtipo: string | null
          staging_tipo_venue: string | null
          standard_rate_month: number | null
          state: string | null
          venue_type_child: string | null
          venue_type_grandchildren: string | null
          venue_type_parent: string | null
        }
        Relationships: []
      }
      vw_screens_pretty: {
        Row: {
          active: boolean | null
          address_norm: string | null
          address_raw: string | null
          asset_url: string | null
          base_daily_traffic: number | null
          board_format: string | null
          category: string | null
          cep: string | null
          cep_norm: string | null
          city: string | null
          city_norm: string | null
          class: Database["public"]["Enums"]["class_band"] | null
          code: string | null
          created_at: string | null
          display_name: string | null
          facing: string | null
          geo: unknown
          geom: unknown
          google_formatted_address: string | null
          google_place_id: string | null
          id: number | null
          lat: number | null
          lng: number | null
          name: string | null
          screen_end_time: string | null
          screen_facing: string | null
          screen_start_time: string | null
          specialty: string[] | null
          spots_per_hour: number | null
          state: string | null
          state_norm: string | null
          state_uf: string | null
          tag: string | null
          updated_at: string | null
          venue_id: number | null
          venue_type_child: string | null
          venue_type_grandchildren: string | null
          venue_type_parent: string | null
        }
        Insert: {
          active?: boolean | null
          address_norm?: string | null
          address_raw?: string | null
          asset_url?: string | null
          base_daily_traffic?: number | null
          board_format?: string | null
          category?: string | null
          cep?: string | null
          cep_norm?: string | null
          city?: string | null
          city_norm?: string | null
          class?: Database["public"]["Enums"]["class_band"] | null
          code?: string | null
          created_at?: string | null
          display_name?: string | null
          facing?: string | null
          geo?: unknown
          geom?: unknown
          google_formatted_address?: string | null
          google_place_id?: string | null
          id?: number | null
          lat?: number | null
          lng?: number | null
          name?: string | null
          screen_end_time?: string | null
          screen_facing?: string | null
          screen_start_time?: string | null
          specialty?: string[] | null
          spots_per_hour?: number | null
          state?: string | null
          state_norm?: string | null
          state_uf?: string | null
          tag?: string | null
          updated_at?: string | null
          venue_id?: number | null
          venue_type_child?: string | null
          venue_type_grandchildren?: string | null
          venue_type_parent?: string | null
        }
        Update: {
          active?: boolean | null
          address_norm?: string | null
          address_raw?: string | null
          asset_url?: string | null
          base_daily_traffic?: number | null
          board_format?: string | null
          category?: string | null
          cep?: string | null
          cep_norm?: string | null
          city?: string | null
          city_norm?: string | null
          class?: Database["public"]["Enums"]["class_band"] | null
          code?: string | null
          created_at?: string | null
          display_name?: string | null
          facing?: string | null
          geo?: unknown
          geom?: unknown
          google_formatted_address?: string | null
          google_place_id?: string | null
          id?: number | null
          lat?: number | null
          lng?: number | null
          name?: string | null
          screen_end_time?: string | null
          screen_facing?: string | null
          screen_start_time?: string | null
          specialty?: string[] | null
          spots_per_hour?: number | null
          state?: string | null
          state_norm?: string | null
          state_uf?: string | null
          tag?: string | null
          updated_at?: string | null
          venue_id?: number | null
          venue_type_child?: string | null
          venue_type_grandchildren?: string | null
          venue_type_parent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "screens_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "_audit_venues_state_unmapped"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screens_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "mv_venue_farmacia_distancia"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "screens_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "safe_venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screens_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "screens_enriched"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "screens_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screens_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "view_detalhes_profissionais"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "screens_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "vw_inventory_full"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "screens_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "vw_screens_full"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "screens_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "vw_venue_specialties"
            referencedColumns: ["venue_id"]
          },
        ]
      }
      vw_specs_unmapped_staging: {
        Row: {
          code: string | null
          term_norm: string | null
          term_raw: string | null
        }
        Relationships: []
      }
      vw_venue_specialties: {
        Row: {
          specialty_created_at: string | null
          specialty_id: string | null
          specialty_name: string | null
          state_uf: string | null
          venue_code: string | null
          venue_created_at: string | null
          venue_id: number | null
          venue_name: string | null
        }
        Relationships: []
      }
      vw_venues_with_screens: {
        Row: {
          activeScreens: number | null
          city: string | null
          coordinates: boolean | null
          id: string | null
          name: string | null
          screenCount: number | null
          screens: Json | null
          state: string | null
          venue_type_child: string | null
          venue_type_parent: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _postgis_deprecate: {
        Args: { newname: string; oldname: string; version: string }
        Returns: undefined
      }
      _postgis_index_extent: {
        Args: { col: string; tbl: unknown }
        Returns: unknown
      }
      _postgis_pgsql_version: { Args: never; Returns: string }
      _postgis_scripts_pgsql_version: { Args: never; Returns: string }
      _postgis_selectivity: {
        Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown }
        Returns: number
      }
      _postgis_stats: {
        Args: { ""?: string; att_name: string; tbl: unknown }
        Returns: string
      }
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      _st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_sortablehash: { Args: { geom: unknown }; Returns: number }
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_voronoi: {
        Args: {
          clip?: unknown
          g1: unknown
          return_polygons?: boolean
          tolerance?: number
        }
        Returns: unknown
      }
      _st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _strip_state_noise: { Args: { src: string }; Returns: string }
      accounts_admin_list: {
        Args: never
        Returns: {
          avatar_url: string
          created_at: string
          display_name: string
          email: string
          email_verified: boolean
          id: string
          providers: string[]
          updated_at: string
        }[]
      }
      add_screen_as_admin: {
        Args: { screen_data: Json }
        Returns: Record<string, unknown>
      }
      addauth: { Args: { "": string }; Returns: boolean }
      addgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              new_dim: number
              new_srid_in: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
      array_distinct_nonempty: { Args: { a: string[] }; Returns: string[] }
      business_days_between: {
        Args: { p_end: string; p_start: string }
        Returns: number
      }
      calcular_proposta:
        | {
            Args: { p_proposal_id: number }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.calcular_proposta(p_proposal_id => int8), public.calcular_proposta(p_proposal_id => uuid). Try renaming the parameters or the function itself in the database so function overloading can be resolved"[]
          }
        | {
            Args: { p_proposal_id: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.calcular_proposta(p_proposal_id => int8), public.calcular_proposta(p_proposal_id => uuid). Try renaming the parameters or the function itself in the database so function overloading can be resolved"[]
          }
      can_delete_other_users: { Args: never; Returns: boolean }
      can_edit_other_users: { Args: never; Returns: boolean }
      check_auth: {
        Args: never
        Returns: {
          is_authenticated: boolean
          user_email: string
          user_id: string
          user_role: string
        }[]
      }
      clean_text_array: { Args: { arr: string[] }; Returns: string[] }
      cleanup_expired_sessions: { Args: never; Returns: number }
      create_email_log: {
        Args: {
          p_email_type: string
          p_proposal_id: number
          p_recipient_email: string
          p_recipient_type: string
          p_subject: string
        }
        Returns: number
      }
      create_project: {
        Args: {
          p_agencia_id: string
          p_arquivos_anexos?: Json
          p_briefing?: string
          p_cliente_final?: string
          p_data_fim?: string
          p_data_inicio?: string
          p_deal_id?: string
          p_descricao?: string
          p_nome_projeto: string
          p_objetivos?: string[]
          p_orcamento_projeto?: number
          p_prioridade?: string
          p_progresso?: number
          p_responsavel_projeto?: string
          p_status_projeto?: string
          p_tags?: string[]
          p_valor_gasto?: number
        }
        Returns: Json
      }
      debug_permissions: { Args: never; Returns: Json }
      delete_screen_as_admin: { Args: { screen_id: number }; Returns: boolean }
      delete_user_by_email: { Args: { user_email: string }; Returns: string }
      disablelongtransactions: { Args: never; Returns: string }
      dropgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { column_name: string; table_name: string }; Returns: string }
      dropgeometrytable:
        | {
            Args: {
              catalog_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { schema_name: string; table_name: string }; Returns: string }
        | { Args: { table_name: string }; Returns: string }
      enablelongtransactions: { Args: never; Returns: string }
      ensure_all_users_have_profiles: { Args: never; Returns: undefined }
      ensure_profile: { Args: never; Returns: undefined }
      equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      find_nearby_screens: {
        Args: { lat_in: number; lng_in: number; radius_meters_in: number }
        Returns: {
          active: boolean
          address_raw: string
          city: string
          clase: string
          display_name: string
          distance: number
          id: number
          lat: number
          lng: number
          name: string
          state: string
          venue_name: string
        }[]
      }
      find_screens_count_v1: {
        Args: {
          city_in: string
          class_in: string
          lat_in: number
          lng_in: number
          only_active?: boolean
          radius_km_in: number
        }
        Returns: number
      }
      find_screens_v2:
        | {
            Args: {
              city_in: string
              class_in: Database["public"]["Enums"]["class_band"]
              lat_in: number
              lng_in: number
              only_active?: boolean
              radius_km_in: number
            }
            Returns: {
              city: string
              class: Database["public"]["Enums"]["class_band"]
              code: string
              distance_m: number
              id: number
              name: string
              state: string
            }[]
          }
        | {
            Args: {
              city_in: string
              class_in: string
              lat_in: number
              lng_in: number
              only_active?: boolean
              radius_km_in: number
            }
            Returns: {
              active: boolean
              city: string
              class: string
              display_name: string
              distance_m: number
              lat: number
              lng: number
              screen_code: string
              screen_id: number
            }[]
          }
        | {
            Args: {
              in_center_lat: number
              in_center_lng: number
              in_city: string
              in_class: Database["public"]["Enums"]["class_band"]
              in_end_date?: string
              in_exclude_ids?: number[]
              in_radius_km: number
              in_specialty_any?: string[]
              in_start_date?: string
            }
            Returns: {
              address_norm: string
              class: Database["public"]["Enums"]["class_band"]
              code: string
              distance_m: number
              lat: number
              lng: number
              name: string
              screen_id: number
            }[]
          }
      find_screens_v3: {
        Args: {
          city_in: string
          class_in: string
          lat_in: number
          lng_in: number
          only_active?: boolean
          radius_km_in: number
        }
        Returns: {
          city: string
          class: string
          distance_m: number
          screen_id: number
          state: string
          venue_id: number
        }[]
      }
      find_screens_v4: {
        Args: {
          city_in: string
          class_in: string
          lat_in: number
          limit_in?: number
          lng_in: number
          offset_in?: number
          only_active?: boolean
          radius_km_in: number
          sort_by_distance?: boolean
        }
        Returns: {
          city: string
          class: string
          distance_m: number
          screen_id: number
          state: string
          venue_id: number
        }[]
      }
      geometry: { Args: { "": string }; Returns: unknown }
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geomfromewkt: { Args: { "": string }; Returns: unknown }
      get_active_impact_models: {
        Args: never
        Returns: {
          color_scheme: Json
          description: string
          examples: string[]
          id: number
          multiplier: number
          name: string
          traffic_level: string
        }[]
      }
      get_available_cities: {
        Args: { p_end_date?: string; p_start_date?: string }
        Returns: {
          city: string
          proposal_count: number
          screen_count: number
        }[]
      }
      get_current_user_role: { Args: never; Returns: string }
      get_equipe_stats: {
        Args: { projeto_uuid: string }
        Returns: {
          membros_ativos: number
          total_coordenadores: number
          total_diretores: number
          total_gerentes: number
          total_membros: number
        }[]
      }
      get_heatmap_data: {
        Args: {
          p_city?: string
          p_end_date?: string
          p_normalize?: boolean
          p_start_date?: string
        }
        Returns: {
          city: string
          class: string
          lat: number
          lng: number
          name: string
          normalized_intensity: number
          proposal_count: number
          screen_id: number
          total_proposals_in_period: number
        }[]
      }
      get_heatmap_stats: {
        Args: { p_city?: string; p_end_date?: string; p_start_date?: string }
        Returns: {
          avg_intensity: number
          cities_count: number
          max_intensity: number
          total_proposals: number
          total_screens: number
        }[]
      }
      get_my_role: { Args: never; Returns: string }
      get_online_users_stats: {
        Args: never
        Returns: {
          sessions_data: Json
          total_online: number
        }[]
      }
      get_pending_emails: {
        Args: { p_limit?: number }
        Returns: {
          created_at: string
          customer_name: string
          email_type: string
          log_id: number
          proposal_id: number
          proposal_type: string
          recipient_email: string
          recipient_type: string
          subject: string
        }[]
      }
      get_proposal_details: { Args: { p_proposal_id: number }; Returns: Json }
      get_proposal_stats: {
        Args: { p_proposal_id: number }
        Returns: {
          avg_cpm: number
          cities_count: number
          estimated_daily_impacts: number
          screens_count: number
          states_count: number
          total_audience: number
        }[]
      }
      get_screens_by_grupo_cpm: {
        Args: { grupo_id: string }
        Returns: {
          screen_id: number
          tag: string
        }[]
      }
      get_user_role:
        | { Args: never; Returns: string }
        | { Args: { _user_id?: string }; Returns: string }
      get_user_session_history: {
        Args: { p_user_id?: string }
        Returns: {
          duration_minutes: number
          email: string
          ended_at: string
          ended_by: string
          full_name: string
          ip_address: unknown
          started_at: string
          user_agent: string
          user_id: string
        }[]
      }
      get_venue_details: { Args: { venue_id_in: number }; Returns: Json }
      gettransactionid: { Args: never; Returns: unknown }
      has_role:
        | {
            Args: {
              _role: Database["public"]["Enums"]["app_role"]
              _user_id: string
            }
            Returns: boolean
          }
        | { Args: { _role: string; _user_id: string }; Returns: boolean }
      import_from_staging: { Args: never; Returns: undefined }
      is_admin:
        | { Args: never; Returns: boolean }
        | { Args: { uid: string }; Returns: boolean }
      is_manager: { Args: never; Returns: boolean }
      is_manager_or_above: { Args: never; Returns: boolean }
      is_screen_free: {
        Args: { in_from: string; in_screen_id: number; in_to: string }
        Returns: boolean
      }
      is_super_admin:
        | { Args: never; Returns: boolean }
        | { Args: { uid: string }; Returns: boolean }
      jwt_role: { Args: never; Returns: string }
      list_venue_summaries: {
        Args: { limit_count?: number; offset_count?: number; search?: string }
        Returns: {
          active: boolean
          cep: string
          city: string
          class: Database["public"]["Enums"]["class_band"]
          screens_count: number
          specialty: string[]
          state: string
          venue_code: string
          venue_id: number
          venue_name: string
        }[]
      }
      longtransactionsenabled: { Args: never; Returns: boolean }
      make_proposal_snapshot: { Args: { p_id: number }; Returns: Json }
      my_account: {
        Args: never
        Returns: {
          avatar_url: string
          display_name: string
          email: string
          email_verified: boolean
          id: string
          providers: string[]
        }[]
      }
      my_identities: {
        Args: never
        Returns: {
          provider: string
          provider_id: string
        }[]
      }
      norm_specialty_term: { Args: { p: string }; Returns: string }
      norm_text_imm: { Args: { t: string }; Returns: string }
      norm_txt: { Args: { t: string }; Returns: string }
      norm_uf_br: { Args: { src: string }; Returns: string }
      norm_uf_br_smart: { Args: { src: string }; Returns: string }
      normalize_medical_specialties: {
        Args: { specialty_text: string }
        Returns: string[]
      }
      period_label: {
        Args: { p_end: string; p_start: string }
        Returns: string
      }
      pick_price_rule: {
        Args: {
          city_in: string
          class_in: Database["public"]["Enums"]["class_band"]
        }
        Returns: {
          audience: number | null
          base_monthly: number
          city: string | null
          city_norm: string | null
          cpm: number | null
          created_at: string | null
          created_by: string | null
          id: number
          logistics_km_price: number | null
          min_months: number | null
          screen_id: number | null
          setup_fee: number | null
          tipo_insercao:
            | Database["public"]["Enums"]["tipo_insercao_enum"]
            | null
          tipo_insercao_manual: string | null
          uplift: number
          venue_id: number | null
        }
        SetofOptions: {
          from: "*"
          to: "price_rules"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      populate_email_logs_missing_fields: { Args: never; Returns: undefined }
      populate_geometry_columns:
        | { Args: { tbl_oid: unknown; use_typmod?: boolean }; Returns: number }
        | { Args: { use_typmod?: boolean }; Returns: string }
      postgis_constraint_dims: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_srid: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_type: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: string
      }
      postgis_extensions_upgrade: { Args: never; Returns: string }
      postgis_full_version: { Args: never; Returns: string }
      postgis_geos_version: { Args: never; Returns: string }
      postgis_lib_build_date: { Args: never; Returns: string }
      postgis_lib_revision: { Args: never; Returns: string }
      postgis_lib_version: { Args: never; Returns: string }
      postgis_libjson_version: { Args: never; Returns: string }
      postgis_liblwgeom_version: { Args: never; Returns: string }
      postgis_libprotobuf_version: { Args: never; Returns: string }
      postgis_libxml_version: { Args: never; Returns: string }
      postgis_proj_version: { Args: never; Returns: string }
      postgis_scripts_build_date: { Args: never; Returns: string }
      postgis_scripts_installed: { Args: never; Returns: string }
      postgis_scripts_released: { Args: never; Returns: string }
      postgis_svn_version: { Args: never; Returns: string }
      postgis_type_name: {
        Args: {
          coord_dimension: number
          geomname: string
          use_new_name?: boolean
        }
        Returns: string
      }
      postgis_version: { Args: never; Returns: string }
      postgis_wagyu_version: { Args: never; Returns: string }
      promote_to_super_admin: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      proposal_summary: { Args: { p_id: number }; Returns: Json }
      quote_price_detailed: {
        Args: {
          city_in: string
          class_in: Database["public"]["Enums"]["class_band"]
          months_in: number
          qty_in: number
        }
        Returns: Json
      }
      recalc_proposal_kpis: {
        Args: { p_proposal_id: number }
        Returns: undefined
      }
      resolve_effective_cpm: {
        Args: { p_proposal_id: number }
        Returns: number
      }
      search_accounts_admin: {
        Args: { search?: string }
        Returns: {
          avatar_url: string
          created_at: string
          display_name: string
          email: string
          email_verified: boolean
          id: string
          providers: string[]
          updated_at: string
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      snapshot_proposta_calculada: {
        Args: { p_proposal_id: number }
        Returns: Json
      }
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_angle:
        | { Args: { line1: unknown; line2: unknown }; Returns: number }
        | {
            Args: { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown }
            Returns: number
          }
      st_area:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number }
        Returns: string
      }
      st_asewkt: { Args: { "": string }; Returns: string }
      st_asgeojson:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: {
              geom_column?: string
              maxdecimaldigits?: number
              pretty_bool?: boolean
              r: Record<string, unknown>
            }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_asgml:
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
            }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
      st_askml:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string }
        Returns: string
      }
      st_asmarc21: { Args: { format?: string; geom: unknown }; Returns: string }
      st_asmvtgeom: {
        Args: {
          bounds: unknown
          buffer?: number
          clip_geom?: boolean
          extent?: number
          geom: unknown
        }
        Returns: unknown
      }
      st_assvg:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_astext: { Args: { "": string }; Returns: string }
      st_astwkb:
        | {
            Args: {
              geom: unknown
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown[]
              ids: number[]
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
        Returns: string
      }
      st_azimuth:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: number }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_boundingdiagonal: {
        Args: { fits?: boolean; geom: unknown }
        Returns: unknown
      }
      st_buffer:
        | {
            Args: { geom: unknown; options?: string; radius: number }
            Returns: unknown
          }
        | {
            Args: { geom: unknown; quadsegs: number; radius: number }
            Returns: unknown
          }
      st_centroid: { Args: { "": string }; Returns: unknown }
      st_clipbybox2d: {
        Args: { box: unknown; geom: unknown }
        Returns: unknown
      }
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_collect: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_concavehull: {
        Args: {
          param_allow_holes?: boolean
          param_geom: unknown
          param_pctconvex: number
        }
        Returns: unknown
      }
      st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_coorddim: { Args: { geometry: unknown }; Returns: number }
      st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_crosses: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_curvetoline: {
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number }
        Returns: unknown
      }
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_distance:
        | {
            Args: { geog1: unknown; geog2: unknown; use_spheroid?: boolean }
            Returns: number
          }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_distancesphere:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geom1: unknown; geom2: unknown; radius: number }
            Returns: number
          }
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_expand:
        | { Args: { box: unknown; dx: number; dy: number }; Returns: unknown }
        | {
            Args: { box: unknown; dx: number; dy: number; dz?: number }
            Returns: unknown
          }
        | {
            Args: {
              dm?: number
              dx: number
              dy: number
              dz?: number
              geom: unknown
            }
            Returns: unknown
          }
      st_force3d: { Args: { geom: unknown; zvalue?: number }; Returns: unknown }
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number }
        Returns: unknown
      }
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number }
        Returns: unknown
      }
      st_force4d: {
        Args: { geom: unknown; mvalue?: number; zvalue?: number }
        Returns: unknown
      }
      st_generatepoints:
        | { Args: { area: unknown; npoints: number }; Returns: unknown }
        | {
            Args: { area: unknown; npoints: number; seed: number }
            Returns: unknown
          }
      st_geogfromtext: { Args: { "": string }; Returns: unknown }
      st_geographyfromtext: { Args: { "": string }; Returns: unknown }
      st_geohash:
        | { Args: { geog: unknown; maxchars?: number }; Returns: string }
        | { Args: { geom: unknown; maxchars?: number }; Returns: string }
      st_geomcollfromtext: { Args: { "": string }; Returns: unknown }
      st_geometricmedian: {
        Args: {
          fail_if_not_converged?: boolean
          g: unknown
          max_iter?: number
          tolerance?: number
        }
        Returns: unknown
      }
      st_geometryfromtext: { Args: { "": string }; Returns: unknown }
      st_geomfromewkt: { Args: { "": string }; Returns: unknown }
      st_geomfromgeojson:
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": string }; Returns: unknown }
      st_geomfromgml: { Args: { "": string }; Returns: unknown }
      st_geomfromkml: { Args: { "": string }; Returns: unknown }
      st_geomfrommarc21: { Args: { marc21xml: string }; Returns: unknown }
      st_geomfromtext: { Args: { "": string }; Returns: unknown }
      st_gmltosql: { Args: { "": string }; Returns: unknown }
      st_hasarc: { Args: { geometry: unknown }; Returns: boolean }
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_hexagon: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_hexagongrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown }
        Returns: number
      }
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_intersects:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_isvaliddetail: {
        Args: { flags?: number; geom: unknown }
        Returns: Database["public"]["CompositeTypes"]["valid_detail"]
        SetofOptions: {
          from: "*"
          to: "valid_detail"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      st_length:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_letters: { Args: { font?: Json; letters: string }; Returns: unknown }
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      st_linefromencodedpolyline: {
        Args: { nprecision?: number; txtin: string }
        Returns: unknown
      }
      st_linefromtext: { Args: { "": string }; Returns: unknown }
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_linetocurve: { Args: { geometry: unknown }; Returns: unknown }
      st_locatealong: {
        Args: { geometry: unknown; leftrightoffset?: number; measure: number }
        Returns: unknown
      }
      st_locatebetween: {
        Args: {
          frommeasure: number
          geometry: unknown
          leftrightoffset?: number
          tomeasure: number
        }
        Returns: unknown
      }
      st_locatebetweenelevations: {
        Args: { fromelevation: number; geometry: unknown; toelevation: number }
        Returns: unknown
      }
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makeline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makevalid: {
        Args: { geom: unknown; params: string }
        Returns: unknown
      }
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number }
        Returns: unknown
      }
      st_mlinefromtext: { Args: { "": string }; Returns: unknown }
      st_mpointfromtext: { Args: { "": string }; Returns: unknown }
      st_mpolyfromtext: { Args: { "": string }; Returns: unknown }
      st_multilinestringfromtext: { Args: { "": string }; Returns: unknown }
      st_multipointfromtext: { Args: { "": string }; Returns: unknown }
      st_multipolygonfromtext: { Args: { "": string }; Returns: unknown }
      st_node: { Args: { g: unknown }; Returns: unknown }
      st_normalize: { Args: { geom: unknown }; Returns: unknown }
      st_offsetcurve: {
        Args: { distance: number; line: unknown; params?: string }
        Returns: unknown
      }
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_perimeter: {
        Args: { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_pointfromtext: { Args: { "": string }; Returns: unknown }
      st_pointm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
        }
        Returns: unknown
      }
      st_pointz: {
        Args: {
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_pointzm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_polyfromtext: { Args: { "": string }; Returns: unknown }
      st_polygonfromtext: { Args: { "": string }; Returns: unknown }
      st_project: {
        Args: { azimuth: number; distance: number; geog: unknown }
        Returns: unknown
      }
      st_quantizecoordinates: {
        Args: {
          g: unknown
          prec_m?: number
          prec_x: number
          prec_y?: number
          prec_z?: number
        }
        Returns: unknown
      }
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number }
        Returns: unknown
      }
      st_relate: { Args: { geom1: unknown; geom2: unknown }; Returns: string }
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number }
        Returns: unknown
      }
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number }
        Returns: unknown
      }
      st_setsrid:
        | { Args: { geog: unknown; srid: number }; Returns: unknown }
        | { Args: { geom: unknown; srid: number }; Returns: unknown }
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_simplifypolygonhull: {
        Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number }
        Returns: unknown
      }
      st_split: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_square: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_squaregrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_srid:
        | { Args: { geog: unknown }; Returns: number }
        | { Args: { geom: unknown }; Returns: number }
      st_subdivide: {
        Args: { geom: unknown; gridsize?: number; maxvertices?: number }
        Returns: unknown[]
      }
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown }
        Returns: unknown
      }
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_tileenvelope: {
        Args: {
          bounds?: unknown
          margin?: number
          x: number
          y: number
          zoom: number
        }
        Returns: unknown
      }
      st_touches: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_transform:
        | {
            Args: { from_proj: string; geom: unknown; to_proj: string }
            Returns: unknown
          }
        | {
            Args: { from_proj: string; geom: unknown; to_srid: number }
            Returns: unknown
          }
        | { Args: { geom: unknown; to_proj: string }; Returns: unknown }
      st_triangulatepolygon: { Args: { g1: unknown }; Returns: unknown }
      st_union:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
        | {
            Args: { geom1: unknown; geom2: unknown; gridsize: number }
            Returns: unknown
          }
      st_voronoilines: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_wkbtosql: { Args: { wkb: string }; Returns: unknown }
      st_wkttosql: { Args: { "": string }; Returns: unknown }
      st_wrapx: {
        Args: { geom: unknown; move: number; wrap: number }
        Returns: unknown
      }
      strip_braces_quotes: { Args: { t: string }; Returns: string }
      unaccent: { Args: { "": string }; Returns: string }
      unlockrows: { Args: { "": string }; Returns: number }
      update_email_status: {
        Args: { p_error_message?: string; p_log_id: number; p_status: string }
        Returns: boolean
      }
      update_proposal_status: {
        Args: {
          p_new_status: Database["public"]["Enums"]["proposal_status"]
          p_notes?: string
          p_proposal_id: number
        }
        Returns: boolean
      }
      update_user_last_seen: {
        Args: { p_session_token: string }
        Returns: boolean
      }
      updategeometrysrid: {
        Args: {
          catalogn_name: string
          column_name: string
          new_srid_in: number
          schema_name: string
          table_name: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "super_admin" | "admin" | "user" | "manager"
      class_band:
        | "A"
        | "AB"
        | "ABC"
        | "B"
        | "BC"
        | "C"
        | "CD"
        | "D"
        | "E"
        | "ND"
        | "ABCD"
      marco_status: "pendente" | "em_andamento" | "concluido" | "atrasado"
      proposal_status:
        | "rascunho"
        | "enviada"
        | "em_analise"
        | "aceita"
        | "rejeitada"
      role_kind: "user" | "manager" | "admin" | "super_admin"
      tipo_insercao: "manual" | "automatica"
      tipo_insercao_enum: "Tipo 1" | "Tipo 2" | "Tipo 3" | "Tipo 4"
    }
    CompositeTypes: {
      geometry_dump: {
        path: number[] | null
        geom: unknown
      }
      valid_detail: {
        valid: boolean | null
        reason: string | null
        location: unknown
      }
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
      app_role: ["super_admin", "admin", "user", "manager"],
      class_band: [
        "A",
        "AB",
        "ABC",
        "B",
        "BC",
        "C",
        "CD",
        "D",
        "E",
        "ND",
        "ABCD",
      ],
      marco_status: ["pendente", "em_andamento", "concluido", "atrasado"],
      proposal_status: [
        "rascunho",
        "enviada",
        "em_analise",
        "aceita",
        "rejeitada",
      ],
      role_kind: ["user", "manager", "admin", "super_admin"],
      tipo_insercao: ["manual", "automatica"],
      tipo_insercao_enum: ["Tipo 1", "Tipo 2", "Tipo 3", "Tipo 4"],
    },
  },
} as const
