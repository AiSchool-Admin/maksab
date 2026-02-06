export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          phone: string;
          display_name: string | null;
          avatar_url: string | null;
          governorate: string | null;
          city: string | null;
          bio: string | null;
          is_commission_supporter: boolean;
          total_ads_count: number;
          rating: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          phone: string;
          display_name?: string | null;
          avatar_url?: string | null;
          governorate?: string | null;
          city?: string | null;
          bio?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["users"]["Insert"]>;
      };
      ads: {
        Row: {
          id: string;
          user_id: string;
          category_id: string;
          subcategory_id: string | null;
          sale_type: "cash" | "auction" | "exchange";
          title: string;
          description: string | null;
          price: number | null;
          is_negotiable: boolean;
          auction_start_price: number | null;
          auction_buy_now_price: number | null;
          auction_duration_hours: number | null;
          auction_min_increment: number | null;
          auction_ends_at: string | null;
          auction_status: string | null;
          auction_winner_id: string | null;
          exchange_description: string | null;
          exchange_accepts_price_diff: boolean;
          exchange_price_diff: number | null;
          category_fields: Record<string, unknown>;
          governorate: string | null;
          city: string | null;
          latitude: number | null;
          longitude: number | null;
          images: string[];
          status: "active" | "sold" | "exchanged" | "expired" | "deleted";
          views_count: number;
          favorites_count: number;
          created_at: string;
          updated_at: string;
          expires_at: string;
        };
        Insert: {
          user_id: string;
          category_id: string;
          subcategory_id?: string | null;
          sale_type: "cash" | "auction" | "exchange";
          title: string;
          description?: string | null;
          price?: number | null;
          is_negotiable?: boolean;
          auction_start_price?: number | null;
          auction_buy_now_price?: number | null;
          auction_duration_hours?: number | null;
          auction_min_increment?: number | null;
          auction_ends_at?: string | null;
          exchange_description?: string | null;
          exchange_accepts_price_diff?: boolean;
          exchange_price_diff?: number | null;
          category_fields?: Record<string, unknown>;
          governorate?: string | null;
          city?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          images?: string[];
        };
        Update: Partial<Database["public"]["Tables"]["ads"]["Insert"]>;
      };
      categories: {
        Row: {
          id: string;
          name: string;
          icon: string | null;
          slug: string;
          sort_order: number;
          is_active: boolean;
        };
        Insert: {
          id: string;
          name: string;
          icon?: string | null;
          slug: string;
          sort_order?: number;
        };
        Update: Partial<Database["public"]["Tables"]["categories"]["Insert"]>;
      };
      favorites: {
        Row: {
          user_id: string;
          ad_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          ad_id: string;
        };
        Update: never;
      };
      conversations: {
        Row: {
          id: string;
          ad_id: string;
          buyer_id: string;
          seller_id: string;
          last_message_at: string | null;
          created_at: string;
        };
        Insert: {
          ad_id: string;
          buyer_id: string;
          seller_id: string;
        };
        Update: {
          last_message_at?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          content: string | null;
          image_url: string | null;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          conversation_id: string;
          sender_id: string;
          content?: string | null;
          image_url?: string | null;
        };
        Update: {
          is_read?: boolean;
        };
      };
      auction_bids: {
        Row: {
          id: string;
          ad_id: string;
          bidder_id: string;
          amount: number;
          created_at: string;
        };
        Insert: {
          ad_id: string;
          bidder_id: string;
          amount: number;
        };
        Update: never;
      };
    };
  };
};
