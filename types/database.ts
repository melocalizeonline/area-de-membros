export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type ProductStatus = "active" | "inactive";
export type VideoProvider = "youtube" | "vimeo" | "panda" | "embed" | "self_hosted";
export type IntegrationProvider = "kiwify" | "eduzz";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          name: string;
          email: string;
          phone: string | null;
          is_admin: boolean;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name: string;
          email: string;
          phone?: string | null;
          is_admin?: boolean;
          active?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          status: ProductStatus;
          external_product_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          status?: ProductStatus;
          external_product_id?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["products"]["Insert"]>;
        Relationships: [];
      };
      member_products: {
        Row: {
          member_id: string;
          product_id: string;
          source: IntegrationProvider | "manual";
          external_order_id: string | null;
          active: boolean;
          granted_at: string;
          expires_at: string | null;
        };
        Insert: {
          member_id: string;
          product_id: string;
          source?: IntegrationProvider | "manual";
          external_order_id?: string | null;
          active?: boolean;
          expires_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["member_products"]["Insert"]>;
        Relationships: [];
      };
      courses: {
        Row: {
          id: string;
          product_id: string | null;
          title: string;
          slug: string;
          description: string | null;
          cover_url: string | null;
          published: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          product_id?: string | null;
          title: string;
          slug: string;
          description?: string | null;
          cover_url?: string | null;
          published?: boolean;
          sort_order?: number;
        };
        Update: Partial<Database["public"]["Tables"]["courses"]["Insert"]>;
        Relationships: [];
      };
      course_modules: {
        Row: {
          id: string;
          course_id: string;
          title: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          title: string;
          sort_order?: number;
        };
        Update: Partial<Database["public"]["Tables"]["course_modules"]["Insert"]>;
        Relationships: [];
      };
      lessons: {
        Row: {
          id: string;
          module_id: string;
          title: string;
          description: string | null;
          video_provider: VideoProvider;
          video_url: string | null;
          embed_code: string | null;
          duration_seconds: number | null;
          published: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          module_id: string;
          title: string;
          description?: string | null;
          video_provider?: VideoProvider;
          video_url?: string | null;
          embed_code?: string | null;
          duration_seconds?: number | null;
          published?: boolean;
          sort_order?: number;
        };
        Update: Partial<Database["public"]["Tables"]["lessons"]["Insert"]>;
        Relationships: [];
      };
      tools: {
        Row: {
          id: string;
          product_id: string | null;
          name: string;
          slug: string;
          description: string | null;
          tool_type: "internal" | "external";
          external_url: string | null;
          published: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          product_id?: string | null;
          name: string;
          slug: string;
          description?: string | null;
          tool_type?: "internal" | "external";
          external_url?: string | null;
          published?: boolean;
          sort_order?: number;
        };
        Update: Partial<Database["public"]["Tables"]["tools"]["Insert"]>;
        Relationships: [];
      };
      integration_mappings: {
        Row: {
          id: string;
          provider: IntegrationProvider;
          external_product_id: string;
          product_id: string;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          provider: IntegrationProvider;
          external_product_id: string;
          product_id: string;
          active?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["integration_mappings"]["Insert"]>;
        Relationships: [];
      };
      webhook_events: {
        Row: {
          id: string;
          provider: IntegrationProvider;
          event_id: string | null;
          event_type: string;
          payload: Json;
          processed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          provider: IntegrationProvider;
          event_id?: string | null;
          event_type: string;
          payload: Json;
          processed_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["webhook_events"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      member_accessible_product_ids: {
        Args: { member_uuid: string };
        Returns: { product_id: string }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type Profile = Tables<"profiles">;
export type Product = Tables<"products">;
export type Course = Tables<"courses">;
export type CourseModule = Tables<"course_modules">;
export type Lesson = Tables<"lessons">;
export type Tool = Tables<"tools">;
export type IntegrationMapping = Tables<"integration_mappings">;
