export type SellerType = "individual" | "store";
export type StoreTheme = "classic" | "modern" | "elegant" | "sporty";
export type StoreLayout = "grid" | "list" | "showcase";
export type StoreStatus = "active" | "suspended";
export type StoreBadgeType = "verified" | "trusted" | "active" | "top_seller" | "gold" | "platinum";
export type SubscriptionPlan = "free" | "gold" | "platinum";
export type SubscriptionStatus = "active" | "expired" | "cancelled";
export type PromoType = "discount" | "bundle" | "free_shipping" | "timed";

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
          seller_type: SellerType;
          store_id: string | null;
          positive_reviews_count: number;
          total_reviews_count: number;
          is_trusted_seller: boolean;
          verification_level: "basic" | "verified" | "premium";
          is_id_verified: boolean;
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
          seller_type?: SellerType;
          store_id?: string | null;
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
          store_id: string | null;
          store_category_id: string | null;
          is_pinned: boolean;
          original_price: number | null;
          highest_offer: number | null;
          offers_count: number;
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
          store_id?: string | null;
          store_category_id?: string | null;
          is_pinned?: boolean;
          original_price?: number | null;
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
      stores: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          slug: string;
          logo_url: string | null;
          cover_url: string | null;
          description: string | null;
          main_category: string;
          sub_categories: string[];
          primary_color: string;
          secondary_color: string | null;
          theme: StoreTheme;
          layout: StoreLayout;
          location_gov: string | null;
          location_area: string | null;
          phone: string | null;
          working_hours: Record<string, unknown> | null;
          is_verified: boolean;
          settings: Record<string, unknown>;
          status: StoreStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          name: string;
          slug: string;
          logo_url?: string | null;
          cover_url?: string | null;
          description?: string | null;
          main_category: string;
          sub_categories?: string[];
          primary_color?: string;
          secondary_color?: string | null;
          theme?: StoreTheme;
          layout?: StoreLayout;
          location_gov?: string | null;
          location_area?: string | null;
          phone?: string | null;
          working_hours?: Record<string, unknown> | null;
        };
        Update: Partial<Database["public"]["Tables"]["stores"]["Insert"]> & {
          status?: StoreStatus;
          is_verified?: boolean;
          settings?: Record<string, unknown>;
        };
      };
      store_categories: {
        Row: {
          id: string;
          store_id: string;
          name: string;
          slug: string;
          sort_order: number;
          products_count: number;
          created_at: string;
        };
        Insert: {
          store_id: string;
          name: string;
          slug: string;
          sort_order?: number;
        };
        Update: {
          name?: string;
          slug?: string;
          sort_order?: number;
          products_count?: number;
        };
      };
      store_followers: {
        Row: {
          id: string;
          store_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          store_id: string;
          user_id: string;
        };
        Update: never;
      };
      store_reviews: {
        Row: {
          id: string;
          store_id: string;
          reviewer_id: string;
          transaction_id: string;
          overall_rating: number;
          quality_rating: number | null;
          accuracy_rating: number | null;
          response_rating: number | null;
          commitment_rating: number | null;
          comment: string | null;
          seller_reply: string | null;
          replied_at: string | null;
          created_at: string;
        };
        Insert: {
          store_id: string;
          reviewer_id: string;
          transaction_id: string;
          overall_rating: number;
          quality_rating?: number | null;
          accuracy_rating?: number | null;
          response_rating?: number | null;
          commitment_rating?: number | null;
          comment?: string | null;
        };
        Update: {
          seller_reply?: string;
          replied_at?: string;
        };
      };
      store_badges: {
        Row: {
          id: string;
          store_id: string;
          badge_type: StoreBadgeType;
          earned_at: string;
          expires_at: string | null;
          is_active: boolean;
        };
        Insert: {
          store_id: string;
          badge_type: StoreBadgeType;
          expires_at?: string | null;
        };
        Update: {
          is_active?: boolean;
          expires_at?: string | null;
        };
      };
      store_pinned_products: {
        Row: {
          id: string;
          store_id: string;
          ad_id: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          store_id: string;
          ad_id: string;
          sort_order?: number;
        };
        Update: {
          sort_order?: number;
        };
      };
      store_analytics: {
        Row: {
          id: string;
          store_id: string;
          date: string;
          total_views: number;
          unique_visitors: number;
          source_search: number;
          source_direct: number;
          source_followers: number;
          source_product_card: number;
          top_products: string[];
          created_at: string;
        };
        Insert: {
          store_id: string;
          date: string;
          total_views?: number;
          unique_visitors?: number;
          source_search?: number;
          source_direct?: number;
          source_followers?: number;
          source_product_card?: number;
          top_products?: string[];
        };
        Update: {
          total_views?: number;
          unique_visitors?: number;
          source_search?: number;
          source_direct?: number;
          source_followers?: number;
          source_product_card?: number;
          top_products?: string[];
        };
      };
      store_promotions: {
        Row: {
          id: string;
          store_id: string;
          ad_id: string;
          promo_type: PromoType;
          discount_percent: number | null;
          original_price: number | null;
          sale_price: number | null;
          start_at: string;
          end_at: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          store_id: string;
          ad_id: string;
          promo_type: PromoType;
          discount_percent?: number | null;
          original_price?: number | null;
          sale_price?: number | null;
          start_at?: string;
          end_at?: string | null;
        };
        Update: {
          is_active?: boolean;
          end_at?: string | null;
          discount_percent?: number | null;
          sale_price?: number | null;
        };
      };
      store_subscriptions: {
        Row: {
          id: string;
          store_id: string;
          plan: SubscriptionPlan;
          status: SubscriptionStatus;
          price: number | null;
          start_at: string;
          end_at: string | null;
          payment_method: string | null;
          payment_ref: string | null;
          created_at: string;
        };
        Insert: {
          store_id: string;
          plan?: SubscriptionPlan;
          price?: number | null;
          start_at?: string;
          end_at?: string | null;
          payment_method?: string | null;
          payment_ref?: string | null;
        };
        Update: {
          status?: SubscriptionStatus;
          end_at?: string | null;
        };
      };
      user_wishlist: {
        Row: {
          id: string;
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
      user_recently_viewed: {
        Row: {
          id: string;
          user_id: string;
          ad_id: string;
          viewed_at: string;
        };
        Insert: {
          user_id: string;
          ad_id: string;
        };
        Update: never;
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
      commissions: {
        Row: {
          id: string;
          ad_id: string | null;
          payer_id: string;
          amount: number;
          payment_method: string | null;
          status: "pending" | "paid" | "cancelled";
          created_at: string;
        };
        Insert: {
          ad_id?: string | null;
          payer_id: string;
          amount: number;
          payment_method?: string | null;
          status?: string;
        };
        Update: {
          status?: string;
          payment_method?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          title: string;
          body: string | null;
          data: Record<string, unknown>;
          ad_id: string | null;
          conversation_id: string | null;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          user_id: string;
          type: string;
          title: string;
          body?: string | null;
          data?: Record<string, unknown>;
          ad_id?: string | null;
          conversation_id?: string | null;
        };
        Update: {
          is_read?: boolean;
        };
      };
      push_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          endpoint: string;
          keys_p256dh: string;
          keys_auth: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          endpoint: string;
          keys_p256dh: string;
          keys_auth: string;
        };
        Update: never;
      };
      user_signals: {
        Row: {
          id: string;
          user_id: string;
          signal_type: string;
          category_id: string | null;
          subcategory_id: string | null;
          ad_id: string | null;
          signal_data: Record<string, unknown>;
          governorate: string | null;
          weight: number;
          created_at: string;
        };
        Insert: {
          user_id: string;
          signal_type: string;
          category_id?: string | null;
          subcategory_id?: string | null;
          ad_id?: string | null;
          signal_data?: Record<string, unknown>;
          governorate?: string | null;
          weight?: number;
        };
        Update: never;
      };
      user_interest_profiles: {
        Row: {
          user_id: string;
          interests: Record<string, unknown>[];
          updated_at: string;
        };
        Insert: {
          user_id: string;
          interests: Record<string, unknown>[];
        };
        Update: {
          interests?: Record<string, unknown>[];
          updated_at?: string;
        };
      };
      governorates: {
        Row: {
          id: number;
          name: string;
          name_en: string | null;
        };
        Insert: {
          name: string;
          name_en?: string | null;
        };
        Update: never;
      };
      cities: {
        Row: {
          id: number;
          governorate_id: number;
          name: string;
          name_en: string | null;
        };
        Insert: {
          governorate_id: number;
          name: string;
          name_en?: string | null;
        };
        Update: never;
      };
    };
  };
};
