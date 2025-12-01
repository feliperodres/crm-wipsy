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
      agent_inventory: {
        Row: {
          created_at: string
          id: string
          product_id: string
          product_name: string
          updated_at: string
          user_id: string
          variants: Json
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          product_name: string
          updated_at?: string
          user_id: string
          variants?: Json
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          product_name?: string
          updated_at?: string
          user_id?: string
          variants?: Json
        }
        Relationships: []
      }
      ai_message_logs: {
        Row: {
          chat_id: string | null
          cost: number | null
          created_at: string
          id: string
          message_content: string | null
          tokens_used: number | null
          user_id: string
        }
        Insert: {
          chat_id?: string | null
          cost?: number | null
          created_at?: string
          id?: string
          message_content?: string | null
          tokens_used?: number | null
          user_id: string
        }
        Update: {
          chat_id?: string | null
          cost?: number | null
          created_at?: string
          id?: string
          message_content?: string | null
          tokens_used?: number | null
          user_id?: string
        }
        Relationships: []
      }
      automation_flows: {
        Row: {
          created_at: string | null
          flow_type: string
          id: string
          is_active: boolean
          name: string
          trigger_conditions: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          flow_type?: string
          id?: string
          is_active?: boolean
          name: string
          trigger_conditions?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          flow_type?: string
          id?: string
          is_active?: boolean
          name?: string
          trigger_conditions?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      availability_schedule: {
        Row: {
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          is_active: boolean
          start_time: string
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          is_active?: boolean
          start_time: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          is_active?: boolean
          start_time?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      chats: {
        Row: {
          ai_agent_enabled: boolean
          created_at: string
          customer_id: string
          id: string
          instance_name: string | null
          last_message_at: string | null
          status: string
          updated_at: string
          user_id: string
          whatsapp_chat_id: string | null
        }
        Insert: {
          ai_agent_enabled?: boolean
          created_at?: string
          customer_id: string
          id?: string
          instance_name?: string | null
          last_message_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
          whatsapp_chat_id?: string | null
        }
        Update: {
          ai_agent_enabled?: boolean
          created_at?: string
          customer_id?: string
          id?: string
          instance_name?: string | null
          last_message_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          whatsapp_chat_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chats_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_tags: {
        Row: {
          assigned_at: string | null
          assigned_by_type: string | null
          created_at: string
          customer_id: string
          id: string
          tag_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by_type?: string | null
          created_at?: string
          customer_id: string
          id?: string
          tag_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by_type?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          tag_id?: string
          user_id?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          ai_agent_enabled: boolean
          city: string | null
          created_at: string
          email: string | null
          id: string
          last_name: string | null
          last_seen: string | null
          name: string
          phone: string | null
          province: string | null
          updated_at: string
          user_id: string
          whatsapp_id: string | null
        }
        Insert: {
          address?: string | null
          ai_agent_enabled?: boolean
          city?: string | null
          created_at?: string
          email?: string | null
          id?: string
          last_name?: string | null
          last_seen?: string | null
          name: string
          phone?: string | null
          province?: string | null
          updated_at?: string
          user_id: string
          whatsapp_id?: string | null
        }
        Update: {
          address?: string | null
          ai_agent_enabled?: boolean
          city?: string | null
          created_at?: string
          email?: string | null
          id?: string
          last_name?: string | null
          last_seen?: string | null
          name?: string
          phone?: string | null
          province?: string | null
          updated_at?: string
          user_id?: string
          whatsapp_id?: string | null
        }
        Relationships: []
      }
      demo_bookings: {
        Row: {
          created_at: string | null
          id: string
          notes: string | null
          questionnaire_response_id: string | null
          status: string | null
          time_slot_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          notes?: string | null
          questionnaire_response_id?: string | null
          status?: string | null
          time_slot_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          notes?: string | null
          questionnaire_response_id?: string | null
          status?: string | null
          time_slot_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "demo_bookings_questionnaire_response_id_fkey"
            columns: ["questionnaire_response_id"]
            isOneToOne: false
            referencedRelation: "demo_questionnaire_responses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demo_bookings_time_slot_id_fkey"
            columns: ["time_slot_id"]
            isOneToOne: true
            referencedRelation: "demo_time_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      demo_questionnaire_responses: {
        Row: {
          company_name: string
          company_size: string | null
          contact_email: string
          contact_name: string
          contact_phone: string
          country: string | null
          created_at: string | null
          id: string
          industry: string | null
          main_challenge: string | null
          main_channel: string | null
          messages_per_month: string
          monthly_sales: string
          platform: string
          product_count: string
          product_type: string
        }
        Insert: {
          company_name: string
          company_size?: string | null
          contact_email: string
          contact_name: string
          contact_phone: string
          country?: string | null
          created_at?: string | null
          id?: string
          industry?: string | null
          main_challenge?: string | null
          main_channel?: string | null
          messages_per_month: string
          monthly_sales: string
          platform: string
          product_count: string
          product_type: string
        }
        Update: {
          company_name?: string
          company_size?: string | null
          contact_email?: string
          contact_name?: string
          contact_phone?: string
          country?: string | null
          created_at?: string | null
          id?: string
          industry?: string | null
          main_challenge?: string | null
          main_channel?: string | null
          messages_per_month?: string
          monthly_sales?: string
          platform?: string
          product_count?: string
          product_type?: string
        }
        Relationships: []
      }
      demo_time_slots: {
        Row: {
          created_at: string | null
          end_time: string
          id: string
          is_available: boolean | null
          start_time: string
          timezone: string | null
        }
        Insert: {
          created_at?: string | null
          end_time: string
          id?: string
          is_available?: boolean | null
          start_time: string
          timezone?: string | null
        }
        Update: {
          created_at?: string | null
          end_time?: string
          id?: string
          is_available?: boolean | null
          start_time?: string
          timezone?: string | null
        }
        Relationships: []
      }
      draft_orders: {
        Row: {
          chat_id: string | null
          ciudad: string | null
          created_at: string
          customer_address: string | null
          customer_id: string | null
          customer_last_name: string | null
          customer_name: string | null
          Departamento: string | null
          forma_de_pago: string | null
          id: string
          products: string | null
          shipping_cost: number | null
          shipping_tariff_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          chat_id?: string | null
          ciudad?: string | null
          created_at?: string
          customer_address?: string | null
          customer_id?: string | null
          customer_last_name?: string | null
          customer_name?: string | null
          Departamento?: string | null
          forma_de_pago?: string | null
          id?: string
          products?: string | null
          shipping_cost?: number | null
          shipping_tariff_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          chat_id?: string | null
          ciudad?: string | null
          created_at?: string
          customer_address?: string | null
          customer_id?: string | null
          customer_last_name?: string | null
          customer_name?: string | null
          Departamento?: string | null
          forma_de_pago?: string | null
          id?: string
          products?: string | null
          shipping_cost?: number | null
          shipping_tariff_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      flow_executions: {
        Row: {
          chat_id: string | null
          completed_at: string | null
          created_at: string | null
          customer_id: string | null
          error_message: string | null
          flow_id: string
          id: string
          started_at: string | null
          status: string
          trigger_type: string | null
          user_id: string
        }
        Insert: {
          chat_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          customer_id?: string | null
          error_message?: string | null
          flow_id: string
          id?: string
          started_at?: string | null
          status?: string
          trigger_type?: string | null
          user_id: string
        }
        Update: {
          chat_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          customer_id?: string | null
          error_message?: string | null
          flow_id?: string
          id?: string
          started_at?: string | null
          status?: string
          trigger_type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flow_executions_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flow_executions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flow_executions_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "automation_flows"
            referencedColumns: ["id"]
          },
        ]
      }
      flow_steps: {
        Row: {
          ai_config: Json | null
          ai_prompt: string | null
          content: string | null
          created_at: string | null
          delay_seconds: number | null
          flow_id: string
          id: string
          media_url: string | null
          step_order: number
          step_type: string
          updated_at: string | null
        }
        Insert: {
          ai_config?: Json | null
          ai_prompt?: string | null
          content?: string | null
          created_at?: string | null
          delay_seconds?: number | null
          flow_id: string
          id?: string
          media_url?: string | null
          step_order: number
          step_type: string
          updated_at?: string | null
        }
        Update: {
          ai_config?: Json | null
          ai_prompt?: string | null
          content?: string | null
          created_at?: string | null
          delay_seconds?: number | null
          flow_id?: string
          id?: string
          media_url?: string | null
          step_order?: number
          step_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "flow_steps_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "automation_flows"
            referencedColumns: ["id"]
          },
        ]
      }
      message_buffer: {
        Row: {
          chat_id: string
          created_at: string
          customer_id: string
          id: string
          message_content: string
          message_timestamp: string
          metadata: Json | null
          processed: boolean | null
          user_id: string
        }
        Insert: {
          chat_id: string
          created_at?: string
          customer_id: string
          id?: string
          message_content: string
          message_timestamp?: string
          metadata?: Json | null
          processed?: boolean | null
          user_id: string
        }
        Update: {
          chat_id?: string
          created_at?: string
          customer_id?: string
          id?: string
          message_content?: string
          message_timestamp?: string
          metadata?: Json | null
          processed?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_buffer_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_buffer_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      message_queue_v2: {
        Row: {
          chat_id: string
          created_at: string | null
          customer_id: string
          group_id: string | null
          group_last_message_at: string | null
          id: string
          media_metadata: Json | null
          media_processed: boolean | null
          media_public_url: string | null
          media_storage_path: string | null
          media_url: string | null
          message_content: string | null
          message_type: string
          processed: boolean | null
          processing_started_at: string | null
          quoted_message_id: string | null
          quoted_metadata: Json | null
          raw_webhook_data: Json | null
          received_at: string
          sent_at: string | null
          sent_to_webhook: boolean | null
          sequence_number: number
          user_id: string
        }
        Insert: {
          chat_id: string
          created_at?: string | null
          customer_id: string
          group_id?: string | null
          group_last_message_at?: string | null
          id?: string
          media_metadata?: Json | null
          media_processed?: boolean | null
          media_public_url?: string | null
          media_storage_path?: string | null
          media_url?: string | null
          message_content?: string | null
          message_type: string
          processed?: boolean | null
          processing_started_at?: string | null
          quoted_message_id?: string | null
          quoted_metadata?: Json | null
          raw_webhook_data?: Json | null
          received_at: string
          sent_at?: string | null
          sent_to_webhook?: boolean | null
          sequence_number: number
          user_id: string
        }
        Update: {
          chat_id?: string
          created_at?: string | null
          customer_id?: string
          group_id?: string | null
          group_last_message_at?: string | null
          id?: string
          media_metadata?: Json | null
          media_processed?: boolean | null
          media_public_url?: string | null
          media_storage_path?: string | null
          media_url?: string | null
          message_content?: string | null
          message_type?: string
          processed?: boolean | null
          processing_started_at?: string | null
          quoted_message_id?: string | null
          quoted_metadata?: Json | null
          raw_webhook_data?: Json | null
          received_at?: string
          sent_at?: string | null
          sent_to_webhook?: boolean | null
          sequence_number?: number
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          chat_id: string
          content: string
          created_at: string
          id: string
          is_read: boolean
          message_type: string
          metadata: Json | null
          sender_type: string
          status: string | null
          timestamp: string | null
          whatsapp_message_id: string | null
        }
        Insert: {
          chat_id: string
          content: string
          created_at?: string
          id?: string
          is_read?: boolean
          message_type?: string
          metadata?: Json | null
          sender_type: string
          status?: string | null
          timestamp?: string | null
          whatsapp_message_id?: string | null
        }
        Update: {
          chat_id?: string
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean
          message_type?: string
          metadata?: Json | null
          sender_type?: string
          status?: string | null
          timestamp?: string | null
          whatsapp_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
        ]
      }
      n8n_chat_histories: {
        Row: {
          id: number
          message: Json
          session_id: string
        }
        Insert: {
          id?: number
          message: Json
          session_id: string
        }
        Update: {
          id?: number
          message?: Json
          session_id?: string
        }
        Relationships: []
      }
      oauth_states: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          shop_domain: string
          state: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          shop_domain: string
          state: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          shop_domain?: string
          state?: string
          user_id?: string | null
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          price: number
          product_id: string
          quantity: number
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          price: number
          product_id: string
          quantity: number
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          price?: number
          product_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          notes: string | null
          order_source: string | null
          payment_method: string | null
          payment_status: string | null
          shipping_cost: number | null
          shipping_tariff_id: string | null
          status: string
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          notes?: string | null
          order_source?: string | null
          payment_method?: string | null
          payment_status?: string | null
          shipping_cost?: number | null
          shipping_tariff_id?: string | null
          status?: string
          total: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          notes?: string | null
          order_source?: string | null
          payment_method?: string | null
          payment_status?: string | null
          shipping_cost?: number | null
          shipping_tariff_id?: string | null
          status?: string
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      product_embeddings: {
        Row: {
          category: string | null
          created_at: string
          embedding: string | null
          id: string
          images: Json | null
          metadata: Json | null
          price: number | null
          product_description: string | null
          product_id: string
          product_name: string
          stock: number | null
          updated_at: string
          user_id: string
          variants: Json | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          embedding?: string | null
          id?: string
          images?: Json | null
          metadata?: Json | null
          price?: number | null
          product_description?: string | null
          product_id: string
          product_name: string
          stock?: number | null
          updated_at?: string
          user_id: string
          variants?: Json | null
        }
        Update: {
          category?: string | null
          created_at?: string
          embedding?: string | null
          id?: string
          images?: Json | null
          metadata?: Json | null
          price?: number | null
          product_description?: string | null
          product_id?: string
          product_name?: string
          stock?: number | null
          updated_at?: string
          user_id?: string
          variants?: Json | null
        }
        Relationships: []
      }
      product_image_embeddings: {
        Row: {
          created_at: string
          id: string
          image_embedding: string | null
          image_url: string
          product_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_embedding?: string | null
          image_url: string
          product_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_embedding?: string | null
          image_url?: string
          product_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      product_variants: {
        Row: {
          available: boolean
          barcode: string | null
          compare_at_price: number | null
          cost_per_item: number | null
          created_at: string
          id: string
          inventory_management: string | null
          inventory_policy: string | null
          inventory_quantity: number
          option1: string | null
          option2: string | null
          option3: string | null
          position: number | null
          price: number
          product_id: string
          shopify_id: string | null
          shopify_product_id: string | null
          sku: string | null
          title: string
          updated_at: string
          user_id: string
          weight: number | null
          weight_unit: string | null
        }
        Insert: {
          available?: boolean
          barcode?: string | null
          compare_at_price?: number | null
          cost_per_item?: number | null
          created_at?: string
          id?: string
          inventory_management?: string | null
          inventory_policy?: string | null
          inventory_quantity?: number
          option1?: string | null
          option2?: string | null
          option3?: string | null
          position?: number | null
          price: number
          product_id: string
          shopify_id?: string | null
          shopify_product_id?: string | null
          sku?: string | null
          title?: string
          updated_at?: string
          user_id: string
          weight?: number | null
          weight_unit?: string | null
        }
        Update: {
          available?: boolean
          barcode?: string | null
          compare_at_price?: number | null
          cost_per_item?: number | null
          created_at?: string
          id?: string
          inventory_management?: string | null
          inventory_policy?: string | null
          inventory_quantity?: number
          option1?: string | null
          option2?: string | null
          option3?: string | null
          position?: number | null
          price?: number
          product_id?: string
          shopify_id?: string | null
          shopify_product_id?: string | null
          sku?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          weight?: number | null
          weight_unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string | null
          cover_image_index: number | null
          created_at: string
          description: string | null
          id: string
          images: Json | null
          is_active: boolean
          name: string
          price: number
          product_type: string | null
          seo_description: string | null
          seo_title: string | null
          shopify_handle: string | null
          shopify_id: string | null
          stock: number
          tags: string[] | null
          updated_at: string
          user_id: string
          vendor: string | null
        }
        Insert: {
          category?: string | null
          cover_image_index?: number | null
          created_at?: string
          description?: string | null
          id?: string
          images?: Json | null
          is_active?: boolean
          name: string
          price: number
          product_type?: string | null
          seo_description?: string | null
          seo_title?: string | null
          shopify_handle?: string | null
          shopify_id?: string | null
          stock?: number
          tags?: string[] | null
          updated_at?: string
          user_id: string
          vendor?: string | null
        }
        Update: {
          category?: string | null
          cover_image_index?: number | null
          created_at?: string
          description?: string | null
          id?: string
          images?: Json | null
          is_active?: boolean
          name?: string
          price?: number
          product_type?: string | null
          seo_description?: string | null
          seo_title?: string | null
          shopify_handle?: string | null
          shopify_id?: string | null
          stock?: number
          tags?: string[] | null
          updated_at?: string
          user_id?: string
          vendor?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          agent_name: string | null
          ai_agent_mode: string | null
          ai_agent_objective: string | null
          ai_agent_role: string | null
          ai_messages_blocked: boolean | null
          auto_reactivation_hours: number | null
          business_name: string | null
          call_to_action: string | null
          country_code: string | null
          created_at: string
          customer_treatment: string | null
          disable_agent_on_manual_reply: boolean | null
          email: string | null
          id: string
          is_active: boolean | null
          message_buffer_seconds: number | null
          message_buffer_v2_seconds: number | null
          new_customer_agent_enabled: boolean | null
          notification_phone: string | null
          onboarding_completed: boolean | null
          onboarding_current_step: number | null
          payment_accounts: Json | null
          payment_methods: string | null
          phone: string | null
          proactivity_level: string | null
          sales_mode: string | null
          special_instructions: string | null
          store_info: string | null
          updated_at: string
          use_webhook_v2: boolean | null
          user_id: string
          webhook_url: string | null
          webhook_v2_url: string | null
          website: string | null
          welcome_message: string | null
          whatsapp_number: string | null
        }
        Insert: {
          agent_name?: string | null
          ai_agent_mode?: string | null
          ai_agent_objective?: string | null
          ai_agent_role?: string | null
          ai_messages_blocked?: boolean | null
          auto_reactivation_hours?: number | null
          business_name?: string | null
          call_to_action?: string | null
          country_code?: string | null
          created_at?: string
          customer_treatment?: string | null
          disable_agent_on_manual_reply?: boolean | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          message_buffer_seconds?: number | null
          message_buffer_v2_seconds?: number | null
          new_customer_agent_enabled?: boolean | null
          notification_phone?: string | null
          onboarding_completed?: boolean | null
          onboarding_current_step?: number | null
          payment_accounts?: Json | null
          payment_methods?: string | null
          phone?: string | null
          proactivity_level?: string | null
          sales_mode?: string | null
          special_instructions?: string | null
          store_info?: string | null
          updated_at?: string
          use_webhook_v2?: boolean | null
          user_id: string
          webhook_url?: string | null
          webhook_v2_url?: string | null
          website?: string | null
          welcome_message?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          agent_name?: string | null
          ai_agent_mode?: string | null
          ai_agent_objective?: string | null
          ai_agent_role?: string | null
          ai_messages_blocked?: boolean | null
          auto_reactivation_hours?: number | null
          business_name?: string | null
          call_to_action?: string | null
          country_code?: string | null
          created_at?: string
          customer_treatment?: string | null
          disable_agent_on_manual_reply?: boolean | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          message_buffer_seconds?: number | null
          message_buffer_v2_seconds?: number | null
          new_customer_agent_enabled?: boolean | null
          notification_phone?: string | null
          onboarding_completed?: boolean | null
          onboarding_current_step?: number | null
          payment_accounts?: Json | null
          payment_methods?: string | null
          phone?: string | null
          proactivity_level?: string | null
          sales_mode?: string | null
          special_instructions?: string | null
          store_info?: string | null
          updated_at?: string
          use_webhook_v2?: boolean | null
          user_id?: string
          webhook_url?: string | null
          webhook_v2_url?: string | null
          website?: string | null
          welcome_message?: string | null
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      public_store_cache: {
        Row: {
          accent_color: string | null
          banner_url: string | null
          has_address: boolean | null
          has_contact_email: boolean | null
          has_contact_phone: boolean | null
          is_active: boolean
          last_updated: string | null
          logo_url: string | null
          primary_color: string | null
          store_description: string | null
          store_name: string
          store_slug: string
          user_id: string
        }
        Insert: {
          accent_color?: string | null
          banner_url?: string | null
          has_address?: boolean | null
          has_contact_email?: boolean | null
          has_contact_phone?: boolean | null
          is_active?: boolean
          last_updated?: string | null
          logo_url?: string | null
          primary_color?: string | null
          store_description?: string | null
          store_name: string
          store_slug: string
          user_id: string
        }
        Update: {
          accent_color?: string | null
          banner_url?: string | null
          has_address?: boolean | null
          has_contact_email?: boolean | null
          has_contact_phone?: boolean | null
          is_active?: boolean
          last_updated?: string | null
          logo_url?: string | null
          primary_color?: string | null
          store_description?: string | null
          store_name?: string
          store_slug?: string
          user_id?: string
        }
        Relationships: []
      }
      shopify_integrations: {
        Row: {
          access_token_encrypted: string
          connection_status: string
          created_at: string
          id: string
          is_active: boolean
          last_sync_at: string | null
          shop_domain: string
          updated_at: string
          user_id: string
          webhook_configured: boolean | null
          webhook_id_orders: string | null
          webhook_id_products: string | null
          webhook_orders_url: string | null
          webhook_products_url: string | null
        }
        Insert: {
          access_token_encrypted: string
          connection_status?: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          shop_domain: string
          updated_at?: string
          user_id: string
          webhook_configured?: boolean | null
          webhook_id_orders?: string | null
          webhook_id_products?: string | null
          webhook_orders_url?: string | null
          webhook_products_url?: string | null
        }
        Update: {
          access_token_encrypted?: string
          connection_status?: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          shop_domain?: string
          updated_at?: string
          user_id?: string
          webhook_configured?: boolean | null
          webhook_id_orders?: string | null
          webhook_id_products?: string | null
          webhook_orders_url?: string | null
          webhook_products_url?: string | null
        }
        Relationships: []
      }
      shopify_orders: {
        Row: {
          billing_address: Json | null
          created_at: string | null
          currency: string | null
          customer_data: Json | null
          customer_id: string | null
          email: string | null
          financial_status: string | null
          fulfillment_status: string | null
          id: string
          imported_at: string | null
          line_items: Json | null
          order_number: string | null
          raw_data: Json | null
          shipping_address: Json | null
          shop_domain: string
          subtotal_price: number | null
          total_price: number | null
          total_tax: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          billing_address?: Json | null
          created_at?: string | null
          currency?: string | null
          customer_data?: Json | null
          customer_id?: string | null
          email?: string | null
          financial_status?: string | null
          fulfillment_status?: string | null
          id: string
          imported_at?: string | null
          line_items?: Json | null
          order_number?: string | null
          raw_data?: Json | null
          shipping_address?: Json | null
          shop_domain: string
          subtotal_price?: number | null
          total_price?: number | null
          total_tax?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          billing_address?: Json | null
          created_at?: string | null
          currency?: string | null
          customer_data?: Json | null
          customer_id?: string | null
          email?: string | null
          financial_status?: string | null
          fulfillment_status?: string | null
          id?: string
          imported_at?: string | null
          line_items?: Json | null
          order_number?: string | null
          raw_data?: Json | null
          shipping_address?: Json | null
          shop_domain?: string
          subtotal_price?: number | null
          total_price?: number | null
          total_tax?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shopify_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      shopify_products: {
        Row: {
          created_at: string | null
          description: string | null
          handle: string | null
          id: string
          images: Json | null
          imported_at: string | null
          product_type: string | null
          published_at: string | null
          raw_data: Json | null
          shop_domain: string
          status: string | null
          tags: string[] | null
          title: string
          updated_at: string | null
          user_id: string
          variants: Json | null
          vendor: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          handle?: string | null
          id: string
          images?: Json | null
          imported_at?: string | null
          product_type?: string | null
          published_at?: string | null
          raw_data?: Json | null
          shop_domain: string
          status?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          user_id: string
          variants?: Json | null
          vendor?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          handle?: string | null
          id?: string
          images?: Json | null
          imported_at?: string | null
          product_type?: string | null
          published_at?: string | null
          raw_data?: Json | null
          shop_domain?: string
          status?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          user_id?: string
          variants?: Json | null
          vendor?: string | null
        }
        Relationships: []
      }
      store_settings: {
        Row: {
          accent_color: string | null
          address: string | null
          banner_url: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          custom_domain: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          payment_methods: Json | null
          primary_color: string | null
          shipping_rates: Json | null
          show_out_of_stock: boolean
          show_whatsapp_button: boolean | null
          social_media: Json | null
          store_description: string | null
          store_name: string
          store_slug: string | null
          updated_at: string
          user_id: string
          whatsapp_number: string | null
        }
        Insert: {
          accent_color?: string | null
          address?: string | null
          banner_url?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          custom_domain?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          payment_methods?: Json | null
          primary_color?: string | null
          shipping_rates?: Json | null
          show_out_of_stock?: boolean
          show_whatsapp_button?: boolean | null
          social_media?: Json | null
          store_description?: string | null
          store_name?: string
          store_slug?: string | null
          updated_at?: string
          user_id: string
          whatsapp_number?: string | null
        }
        Update: {
          accent_color?: string | null
          address?: string | null
          banner_url?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          custom_domain?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          payment_methods?: Json | null
          primary_color?: string | null
          shipping_rates?: Json | null
          show_out_of_stock?: boolean
          show_whatsapp_button?: boolean | null
          social_media?: Json | null
          store_description?: string | null
          store_name?: string
          store_slug?: string | null
          updated_at?: string
          user_id?: string
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          created_at: string
          extra_message_cost: number | null
          id: string
          is_active: boolean
          max_ai_messages: number
          max_products: number
          name: string
          plan_id: string
          price_monthly: number
          stripe_price_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          extra_message_cost?: number | null
          id?: string
          is_active?: boolean
          max_ai_messages?: number
          max_products?: number
          name: string
          plan_id: string
          price_monthly?: number
          stripe_price_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          extra_message_cost?: number | null
          id?: string
          is_active?: boolean
          max_ai_messages?: number
          max_products?: number
          name?: string
          plan_id?: string
          price_monthly?: number
          stripe_price_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      tags: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      usage_counters: {
        Row: {
          ai_messages_used: number
          created_at: string
          extra_messages_purchased: number
          id: string
          month: number
          pending_charge_amount: number
          updated_at: string
          user_id: string
          year: number
        }
        Insert: {
          ai_messages_used?: number
          created_at?: string
          extra_messages_purchased?: number
          id?: string
          month: number
          pending_charge_amount?: number
          updated_at?: string
          user_id: string
          year: number
        }
        Update: {
          ai_messages_used?: number
          created_at?: string
          extra_messages_purchased?: number
          id?: string
          month?: number
          pending_charge_amount?: number
          updated_at?: string
          user_id?: string
          year?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan_id: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_id: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["plan_id"]
          },
        ]
      }
      webhook_events: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          processed: boolean | null
          processed_at: string | null
          user_id: string
          webhook_data: Json
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          processed?: boolean | null
          processed_at?: string | null
          user_id: string
          webhook_data: Json
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          processed?: boolean | null
          processed_at?: string | null
          user_id?: string
          webhook_data?: Json
        }
        Relationships: []
      }
      whatsapp_connections: {
        Row: {
          connected_at: string | null
          created_at: string
          id: string
          instance_name: string
          is_active: boolean
          phone_number: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          connected_at?: string | null
          created_at?: string
          id?: string
          instance_name: string
          is_active?: boolean
          phone_number: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          connected_at?: string | null
          created_at?: string
          id?: string
          instance_name?: string
          is_active?: boolean
          phone_number?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_evolution_credentials: {
        Row: {
          api_key: string
          api_url: string
          created_at: string
          display_name: string | null
          id: string
          instance_name: string
          is_default: boolean | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          api_key: string
          api_url: string
          created_at?: string
          display_name?: string | null
          id?: string
          instance_name: string
          is_default?: boolean | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          api_key?: string
          api_url?: string
          created_at?: string
          display_name?: string | null
          id?: string
          instance_name?: string
          is_default?: boolean | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_meta_credentials: {
        Row: {
          access_token: string
          business_name: string | null
          created_at: string | null
          display_name: string | null
          id: string
          is_default: boolean | null
          phone_number: string | null
          phone_number_id: string
          status: string | null
          token_expires_at: string | null
          updated_at: string | null
          user_id: string
          verify_token: string
          waba_id: string
          webhook_url: string | null
        }
        Insert: {
          access_token: string
          business_name?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string
          is_default?: boolean | null
          phone_number?: string | null
          phone_number_id: string
          status?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id: string
          verify_token: string
          waba_id: string
          webhook_url?: string | null
        }
        Update: {
          access_token?: string
          business_name?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string
          is_default?: boolean | null
          phone_number?: string | null
          phone_number_id?: string
          status?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id?: string
          verify_token?: string
          waba_id?: string
          webhook_url?: string | null
        }
        Relationships: []
      }
      whatsapp_templates: {
        Row: {
          category: string
          components: Json
          created_at: string
          id: string
          language: string
          name: string
          rejection_reason: string | null
          status: string
          template_id: string | null
          updated_at: string
          user_id: string
          waba_id: string
        }
        Insert: {
          category: string
          components?: Json
          created_at?: string
          id?: string
          language: string
          name: string
          rejection_reason?: string | null
          status?: string
          template_id?: string | null
          updated_at?: string
          user_id: string
          waba_id: string
        }
        Update: {
          category?: string
          components?: Json
          created_at?: string
          id?: string
          language?: string
          name?: string
          rejection_reason?: string | null
          status?: string
          template_id?: string | null
          updated_at?: string
          user_id?: string
          waba_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assign_admin_role_to_email: {
        Args: {
          target_email: string
          target_role?: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
      assign_system_tag: {
        Args: {
          tag_color_param?: string
          tag_name_param: string
          target_customer_id: string
          target_user_id?: string
        }
        Returns: string
      }
      book_demo_slot: {
        Args: {
          p_company_name: string
          p_company_size?: string
          p_contact_email: string
          p_contact_name: string
          p_contact_phone: string
          p_country?: string
          p_industry?: string
          p_main_challenge?: string
          p_main_channel?: string
          p_messages_per_month: string
          p_monthly_sales: string
          p_notes?: string
          p_platform: string
          p_product_count: string
          p_product_type: string
          p_slot_id: string
        }
        Returns: string
      }
      bytea_to_text: { Args: { data: string }; Returns: string }
      cleanup_expired_system_tags: { Args: never; Returns: undefined }
      create_historical_ai_logs: { Args: never; Returns: number }
      get_admin_all_conversations: {
        Args: never
        Returns: {
          business_name: string
          chat_id: string
          customer_name: string
          customer_phone: string
          has_images: boolean
          last_message: string
          last_message_at: string
          status: string
          unread_count: number
          user_email: string
          user_id: string
        }[]
      }
      get_admin_all_conversations_with_orders: {
        Args: never
        Returns: {
          business_name: string
          chat_id: string
          customer_name: string
          customer_phone: string
          has_images: boolean
          has_order: boolean
          last_message: string
          last_message_at: string
          order_count: number
          status: string
          total_order_value: number
          unread_count: number
          user_email: string
          user_id: string
        }[]
      }
      get_admin_chat_messages: {
        Args: { target_chat_id: string }
        Returns: {
          chat_user_id: string
          content: string
          created_at: string
          is_read: boolean
          message_id: string
          message_type: string
          metadata: Json
          sender_type: string
        }[]
      }
      get_admin_dashboard_stats: {
        Args: never
        Returns: {
          active_users_this_month: number
          total_ai_messages: number
          total_chats: number
          total_orders: number
          total_revenue: number
          total_users: number
        }[]
      }
      get_admin_user_conversations: {
        Args: { target_user_id: string }
        Returns: {
          chat_id: string
          customer_name: string
          customer_phone: string
          has_images: boolean
          last_message: string
          last_message_at: string
          status: string
          unread_count: number
        }[]
      }
      get_admin_user_details: {
        Args: never
        Returns: {
          business_name: string
          created_at: string
          email: string
          last_sign_in_at: string
          subscription_plan: string
          subscription_status: string
          total_ai_messages: number
          total_chats: number
          total_orders: number
          user_id: string
        }[]
      }
      get_chat_messages: {
        Args: { target_chat_id: string; target_user_id: string }
        Returns: {
          content: string
          created_at: string
          is_read: boolean
          message_id: string
          message_type: string
          metadata: Json
          sender_type: string
        }[]
      }
      get_ready_message_groups_v2: {
        Args: never
        Returns: {
          buffer_seconds: number
          group_id: string
          user_id: string
          webhook_url: string
        }[]
      }
      get_store_contact_info: {
        Args: { store_slug_param: string }
        Returns: {
          address: string
          contact_email: string
          contact_phone: string
        }[]
      }
      get_store_public_options: {
        Args: { store_slug_param: string }
        Returns: {
          address: string
          contact_email: string
          contact_phone: string
          payment_methods: Json
          shipping_rates: Json
          show_out_of_stock: boolean
          show_whatsapp_button: boolean
          whatsapp_number: string
        }[]
      }
      get_user_conversations: {
        Args: { target_user_id: string }
        Returns: {
          chat_id: string
          customer_name: string
          customer_phone: string
          last_message: string
          last_message_at: string
          unread_count: number
        }[]
      }
      get_user_current_plan: {
        Args: { target_user_id: string }
        Returns: {
          extra_message_cost: number
          max_ai_messages: number
          max_products: number
          period_end: string
          plan_id: string
          plan_name: string
          subscription_status: string
        }[]
      }
      get_user_current_usage: {
        Args: { target_user_id: string }
        Returns: {
          ai_messages_used: number
          extra_messages_purchased: number
          products_count: number
        }[]
      }
      get_user_whatsapp_data: {
        Args: { target_user_id: string }
        Returns: {
          ai_agent_objective: string
          ai_agent_role: string
          business_name: string
          total_chats: number
          total_customers: number
          user_id: string
          whatsapp_number: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      http: {
        Args: { request: Database["public"]["CompositeTypes"]["http_request"] }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "http_request"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_delete:
        | {
            Args: { uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { content: string; content_type: string; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      http_get:
        | {
            Args: { uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { data: Json; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      http_head: {
        Args: { uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "*"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_header: {
        Args: { field: string; value: string }
        Returns: Database["public"]["CompositeTypes"]["http_header"]
        SetofOptions: {
          from: "*"
          to: "http_header"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_list_curlopt: {
        Args: never
        Returns: {
          curlopt: string
          value: string
        }[]
      }
      http_patch: {
        Args: { content: string; content_type: string; uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "*"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_post:
        | {
            Args: { content: string; content_type: string; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { data: Json; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      http_put: {
        Args: { content: string; content_type: string; uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "*"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_reset_curlopt: { Args: never; Returns: boolean }
      http_set_curlopt: {
        Args: { curlopt: string; value: string }
        Returns: boolean
      }
      increment_ai_message_usage: {
        Args: {
          chat_id_param?: string
          cost_amount?: number
          message_content_param?: string
          target_user_id: string
          tokens_used?: number
        }
        Returns: Json
      }
      is_demo_admin: { Args: never; Returns: boolean }
      process_extra_messages_charge: {
        Args: { charge_amount?: number; target_user_id: string }
        Returns: boolean
      }
      reset_monthly_ai_blocks: { Args: never; Returns: undefined }
      search_products_by_image_similarity: {
        Args: {
          match_count?: number
          query_embedding: string
          similarity_threshold?: number
          target_user_id: string
        }
        Returns: {
          category: string
          images: Json
          matched_image_url: string
          price: number
          product_description: string
          product_id: string
          product_name: string
          similarity: number
          stock: number
          variants: Json
        }[]
      }
      search_products_by_similarity: {
        Args: {
          match_count?: number
          query_embedding: string
          similarity_threshold?: number
          target_user_id: string
        }
        Returns: {
          category: string
          images: Json
          price: number
          product_description: string
          product_id: string
          product_name: string
          similarity: number
          stock: number
          variants: Json
        }[]
      }
      slot_has_booking: { Args: { slot_id: string }; Returns: boolean }
      sync_agent_inventory: {
        Args: { target_user_id: string }
        Returns: undefined
      }
      sync_all_ai_block_status: { Args: never; Returns: undefined }
      text_to_bytea: { Args: { data: string }; Returns: string }
      urlencode:
        | { Args: { data: Json }; Returns: string }
        | {
            Args: { string: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.urlencode(string => bytea), public.urlencode(string => varchar). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
        | {
            Args: { string: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.urlencode(string => bytea), public.urlencode(string => varchar). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
    }
    Enums: {
      app_role: "super_admin" | "admin" | "user"
    }
    CompositeTypes: {
      http_header: {
        field: string | null
        value: string | null
      }
      http_request: {
        method: unknown
        uri: string | null
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null
        content_type: string | null
        content: string | null
      }
      http_response: {
        status: number | null
        content_type: string | null
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null
        content: string | null
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
      app_role: ["super_admin", "admin", "user"],
    },
  },
} as const
