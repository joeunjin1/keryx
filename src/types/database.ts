/**
 * KERYX Supabase 데이터베이스 타입 정의
 * keryx-platform-dev 스킬 §2 준수 - 데이터 관리 원칙
 * trade-data-architecture 스킬 준수 - 데이터베이스 스키마
 * 
 * 이 파일은 Supabase 데이터베이스 스키마를 TypeScript 타입으로 정의합니다.
 * Supabase CLI를 통해 자동 생성하거나 수동으로 유지보수합니다.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      // ── 사용자 프로필 ──────────────────────────────────────────
      user_profiles: {
        Row: {
          id: string;
          kind: "admin" | "md" | "seller" | "factory" | "designer";
          display_name: string | null;
          email: string | null;
          preferred_language: "ko" | "zh" | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          kind: "admin" | "md" | "seller" | "factory" | "designer";
          display_name?: string | null;
          email?: string | null;
          preferred_language?: "ko" | "zh" | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          kind?: "admin" | "md" | "seller" | "factory" | "designer";
          display_name?: string | null;
          email?: string | null;
          preferred_language?: "ko" | "zh" | null;
          updated_at?: string;
        };
      };

      // ── 셀러 ──────────────────────────────────────────────────
      sellers: {
        Row: {
          id: string;
          user_id: string;
          business_name: string;
          business_name_zh: string | null;
          current_grade: "standard" | "premium" | "vip";
          contact_phone: string | null;
          contact_email: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          business_name: string;
          business_name_zh?: string | null;
          current_grade?: "standard" | "premium" | "vip";
          contact_phone?: string | null;
          contact_email?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          business_name?: string;
          business_name_zh?: string | null;
          current_grade?: "standard" | "premium" | "vip";
          contact_phone?: string | null;
          contact_email?: string | null;
          is_active?: boolean;
          updated_at?: string;
        };
      };

      // ── 공장 ──────────────────────────────────────────────────
      factories: {
        Row: {
          id: string;
          factory_code: string;
          company_name: string;
          company_name_zh: string | null;
          shared_login_user_id: string | null;
          approval_status: "pending" | "approved" | "rejected" | "suspended";
          country: string;
          city: string | null;
          contact_name: string | null;
          contact_phone: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          factory_code: string;
          company_name: string;
          company_name_zh?: string | null;
          shared_login_user_id?: string | null;
          approval_status?: "pending" | "approved" | "rejected" | "suspended";
          country?: string;
          city?: string | null;
          contact_name?: string | null;
          contact_phone?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          company_name?: string;
          company_name_zh?: string | null;
          approval_status?: "pending" | "approved" | "rejected" | "suspended";
          is_active?: boolean;
          updated_at?: string;
        };
      };

      // ── 상품 ──────────────────────────────────────────────────
      products: {
        Row: {
          id: string;
          factory_id: string;
          name_ko: string;
          name_zh: string | null;
          name_en: string | null;
          description_ko: string | null;
          description_zh: string | null;
          category: string | null;
          ip_character: string | null;
          is_ip_protected: boolean;
          moq: number;
          price_cny: number | null;
          box_width_cm: number | null;
          box_height_cm: number | null;
          box_depth_cm: number | null;
          cbm: number | null;
          lead_time_days: number | null;
          status: "draft" | "pending_review" | "approved" | "rejected";
          images: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          factory_id: string;
          name_ko: string;
          name_zh?: string | null;
          name_en?: string | null;
          description_ko?: string | null;
          description_zh?: string | null;
          category?: string | null;
          ip_character?: string | null;
          is_ip_protected?: boolean;
          moq?: number;
          price_cny?: number | null;
          box_width_cm?: number | null;
          box_height_cm?: number | null;
          box_depth_cm?: number | null;
          cbm?: number | null;
          lead_time_days?: number | null;
          status?: "draft" | "pending_review" | "approved" | "rejected";
          images?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name_ko?: string;
          name_zh?: string | null;
          name_en?: string | null;
          description_ko?: string | null;
          description_zh?: string | null;
          category?: string | null;
          moq?: number;
          price_cny?: number | null;
          status?: "draft" | "pending_review" | "approved" | "rejected";
          updated_at?: string;
        };
      };

      // ── 주문 ──────────────────────────────────────────────────
      orders: {
        Row: {
          id: string;
          seller_id: string;
          factory_id: string | null;
          product_id: string | null;
          status: "draft" | "pending_payment" | "paid" | "in_production" | "shipped" | "delivered" | "cancelled";
          quantity: number;
          unit_price_cny: number | null;
          total_amount_cny: number | null;
          notes_ko: string | null;
          notes_zh: string | null;
          is_deleted: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          seller_id: string;
          factory_id?: string | null;
          product_id?: string | null;
          status?: "draft" | "pending_payment" | "paid" | "in_production" | "shipped" | "delivered" | "cancelled";
          quantity?: number;
          unit_price_cny?: number | null;
          total_amount_cny?: number | null;
          notes_ko?: string | null;
          notes_zh?: string | null;
          is_deleted?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: "draft" | "pending_payment" | "paid" | "in_production" | "shipped" | "delivered" | "cancelled";
          quantity?: number;
          unit_price_cny?: number | null;
          total_amount_cny?: number | null;
          notes_ko?: string | null;
          notes_zh?: string | null;
          is_deleted?: boolean;
          updated_at?: string;
        };
      };

      // ── 내부 사용자 (MD, Admin) ────────────────────────────────
      internal_users: {
        Row: {
          id: string;
          user_id: string;
          name_ko: string | null;
          name_zh: string | null;
          role: "admin" | "md";
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name_ko?: string | null;
          name_zh?: string | null;
          role?: "admin" | "md";
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          name_ko?: string | null;
          name_zh?: string | null;
          role?: "admin" | "md";
          is_active?: boolean;
        };
      };

      // ── 대화 (채팅) ────────────────────────────────────────────
      conversations: {
        Row: {
          id: string;
          seller_id: string | null;
          factory_id: string | null;
          md_id: string | null;
          seller_name: string | null;
          md_name: string | null;
          last_message: string | null;
          last_message_at: string | null;
          unread_count_seller: number;
          unread_count_md: number;
          unread_count_factory: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          seller_id?: string | null;
          factory_id?: string | null;
          md_id?: string | null;
          seller_name?: string | null;
          md_name?: string | null;
          last_message?: string | null;
          last_message_at?: string | null;
          unread_count_seller?: number;
          unread_count_md?: number;
          unread_count_factory?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          last_message?: string | null;
          last_message_at?: string | null;
          unread_count_seller?: number;
          unread_count_md?: number;
          unread_count_factory?: number;
          updated_at?: string;
        };
      };

      // ── 메시지 ────────────────────────────────────────────────
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string | null;
          sender_role: "seller" | "md" | "factory" | "admin";
          sender_name: string | null;
          content: string;
          content_zh: string | null;
          content_ko: string | null;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender_id?: string | null;
          sender_role?: "seller" | "md" | "factory" | "admin";
          sender_name?: string | null;
          content: string;
          content_zh?: string | null;
          content_ko?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          content?: string;
          content_zh?: string | null;
          content_ko?: string | null;
          is_read?: boolean;
        };
      };

      // ── 에러 로그 ──────────────────────────────────────────────
      error_logs: {
        Row: {
          id: string;
          type: string;
          message: string;
          url: string | null;
          user_id: string | null;
          stack: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          type: string;
          message: string;
          url?: string | null;
          user_id?: string | null;
          stack?: string | null;
          created_at?: string;
        };
        Update: never;
      };

      // ── Brief (공장 소싱 요청) ─────────────────────────────────
      briefs: {
        Row: {
          id: string;
          seller_id: string;
          md_id: string | null;
          title_ko: string;
          title_zh: string | null;
          description_ko: string | null;
          description_zh: string | null;
          target_price_cny: number | null;
          target_moq: number | null;
          status: "open" | "in_progress" | "closed";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          seller_id: string;
          md_id?: string | null;
          title_ko: string;
          title_zh?: string | null;
          description_ko?: string | null;
          description_zh?: string | null;
          target_price_cny?: number | null;
          target_moq?: number | null;
          status?: "open" | "in_progress" | "closed";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title_ko?: string;
          title_zh?: string | null;
          status?: "open" | "in_progress" | "closed";
          updated_at?: string;
        };
      };

      // ── Brief 수신자 (공장) ────────────────────────────────────
      brief_recipients: {
        Row: {
          id: string;
          brief_id: string;
          factory_id: string;
          responded_at: string | null;
          response_note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          brief_id: string;
          factory_id: string;
          responded_at?: string | null;
          response_note?: string | null;
          created_at?: string;
        };
        Update: {
          responded_at?: string | null;
          response_note?: string | null;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_kind: "admin" | "md" | "seller" | "factory" | "designer";
      order_status: "draft" | "pending_payment" | "paid" | "in_production" | "shipped" | "delivered" | "cancelled";
      product_status: "draft" | "pending_review" | "approved" | "rejected";
      factory_approval_status: "pending" | "approved" | "rejected" | "suspended";
      seller_grade: "standard" | "premium" | "vip";
    };
  };
}
