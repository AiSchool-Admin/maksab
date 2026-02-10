# MAKSAB — Claude Code Implementation Directives
# تطبيق مكسب — توجيهات التنفيذ

> **Version:** 3.0 Final  
> **Concept:** Unified Experience — Individuals + Stores (No Mall)  
> **⚠️ CRITICAL:** Execute Phase 0 (Rollback Mall) FIRST before any new implementation.

---

## PHASE 0: ROLLBACK — Remove Mall/Market Feature

> ⚠️ **The mall/market feature was previously implemented and must be COMPLETELY removed.**  
> Do NOT delete data permanently. All operations should be reversible. Keep git history.

### 0.1 Database Rollback

Execute in this order:

```sql
-- Step 1: Drop mall-specific tables
DROP TABLE IF EXISTS mall_sections CASCADE;
DROP TABLE IF EXISTS mall_featured_stores CASCADE;
DROP TABLE IF EXISTS mall_banners CASCADE;
DROP TABLE IF EXISTS mall_store_positions CASCADE;
DROP TABLE IF EXISTS mall_analytics CASCADE;
DROP TABLE IF EXISTS mall_categories CASCADE;

-- Step 2: Drop any mall-specific RLS policies on the above tables

-- Step 3: Remove mall-specific columns from existing tables
-- Example: ALTER TABLE stores DROP COLUMN IF EXISTS mall_position;
-- Example: ALTER TABLE stores DROP COLUMN IF EXISTS mall_section_id;

-- Step 4: Remove any Supabase Edge Functions or DB functions related to mall
```

### 0.2 API Rollback

Remove all mall-related API endpoints:

- DELETE routes: `/api/mall`, `/api/mall/sections`, `/api/mall/sections/:category`, `/api/mall/featured`, `/api/mall/banners`
- DELETE all route files and handlers for the above
- DELETE any server actions, hooks, or data fetching: `useMall()`, `getMallData()`, `getMallSections()`, etc.
- Search entire codebase for `mall` imports and remove dead references

### 0.3 UI/Frontend Rollback

| Task | Details |
|------|---------|
| Remove Mall tab | Remove 'السوق' tab from bottom navigation. Nav should now have **4 tabs only**: Home, Add (+), Chat, Profile |
| Remove Mall pages | Delete: MallPage, MallHome, MallSection, MallCategoryPage, MallMap, FloorPlan, etc. |
| Remove Mall components | Delete: FeaturedStores carousel (mall version), NewStores section, MallBanner, MallSectionCard, MallStoreGrid, etc. |
| Clean navigation config | Update routing config to remove mall routes. No dead links. |
| Remove mall assets | Delete mall-specific images, icons, SVGs from assets/public folders |

### 0.4 Verification

```
After rollback, verify ALL of the following:

[ ] App loads without errors
[ ] Bottom nav shows exactly 4 tabs: Home, Add, Chat, Profile
[ ] No 'mall' or 'سوق' text appears anywhere in the app
[ ] Search works normally
[ ] No console errors related to missing mall routes/components
[ ] Database has no mall-specific tables
[ ] Build succeeds with no dead imports
[ ] grep -ri 'mall' src/ --include='*.tsx' --include='*.ts' → 0 results
```

> ✅ **Once Phase 0 is verified, proceed to Phase 1. Do NOT start Phase 1 until rollback is complete.**

---

## PHASE 1: Database Schema — Stores & Unified System

### 1.1 Modify Existing Tables

```sql
-- Add seller_type to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS seller_type TEXT NOT NULL DEFAULT 'individual'
  CHECK (seller_type IN ('individual', 'store'));

-- Add store reference to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) ON DELETE SET NULL;

-- Add store fields to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) ON DELETE SET NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS store_category_id UUID REFERENCES store_categories(id) ON DELETE SET NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS original_price DECIMAL(12,2);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_products_store_id ON products(store_id);
CREATE INDEX IF NOT EXISTS idx_users_seller_type ON users(seller_type);
CREATE INDEX IF NOT EXISTS idx_users_store_id ON users(store_id);
```

### 1.2 Create New Tables

```sql
-- ==========================================
-- TABLE: stores
-- ==========================================
CREATE TABLE stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(30) NOT NULL,
  slug VARCHAR(60) NOT NULL UNIQUE,
  logo_url TEXT,
  cover_url TEXT,
  description VARCHAR(500),
  main_category TEXT NOT NULL,
  sub_categories TEXT[] DEFAULT '{}',
  primary_color VARCHAR(7) DEFAULT '#1B5E20',
  secondary_color VARCHAR(7),
  theme TEXT NOT NULL DEFAULT 'classic'
    CHECK (theme IN ('classic', 'modern', 'elegant', 'sporty')),
  layout TEXT NOT NULL DEFAULT 'grid'
    CHECK (layout IN ('grid', 'list', 'showcase')),
  location_gov TEXT,
  location_area TEXT,
  phone VARCHAR(20),
  working_hours JSONB,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  settings JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_stores_main_category ON stores(main_category);
CREATE INDEX idx_stores_status ON stores(status);
CREATE INDEX idx_stores_slug ON stores(slug);

-- ==========================================
-- TABLE: store_categories (internal sections)
-- ==========================================
CREATE TABLE store_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  slug VARCHAR(60) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  products_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_store_categories_store ON store_categories(store_id);
CREATE UNIQUE INDEX idx_store_categories_unique ON store_categories(store_id, slug);

-- ==========================================
-- TABLE: store_followers
-- ==========================================
CREATE TABLE store_followers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(store_id, user_id)
);

CREATE INDEX idx_store_followers_user ON store_followers(user_id);
CREATE INDEX idx_store_followers_store ON store_followers(store_id);

-- ==========================================
-- TABLE: store_reviews
-- ==========================================
CREATE TABLE store_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  transaction_id UUID NOT NULL UNIQUE,
  overall_rating SMALLINT NOT NULL CHECK (overall_rating BETWEEN 1 AND 5),
  quality_rating SMALLINT CHECK (quality_rating BETWEEN 1 AND 5),
  accuracy_rating SMALLINT CHECK (accuracy_rating BETWEEN 1 AND 5),
  response_rating SMALLINT CHECK (response_rating BETWEEN 1 AND 5),
  commitment_rating SMALLINT CHECK (commitment_rating BETWEEN 1 AND 5),
  comment TEXT,
  seller_reply TEXT,
  replied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_store_reviews_store ON store_reviews(store_id);

-- ==========================================
-- TABLE: store_badges
-- ==========================================
CREATE TABLE store_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  badge_type TEXT NOT NULL
    CHECK (badge_type IN ('verified','trusted','active','top_seller','gold','platinum')),
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(store_id, badge_type)
);

CREATE INDEX idx_store_badges_store ON store_badges(store_id);

-- ==========================================
-- TABLE: store_pinned_products
-- ==========================================
CREATE TABLE store_pinned_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sort_order SMALLINT NOT NULL DEFAULT 0 CHECK (sort_order <= 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(store_id, product_id)
);

-- ==========================================
-- TABLE: store_analytics
-- ==========================================
CREATE TABLE store_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_views INT NOT NULL DEFAULT 0,
  unique_visitors INT NOT NULL DEFAULT 0,
  source_search INT NOT NULL DEFAULT 0,
  source_direct INT NOT NULL DEFAULT 0,
  source_followers INT NOT NULL DEFAULT 0,
  source_product_card INT NOT NULL DEFAULT 0,
  top_products UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(store_id, date)
);

-- ==========================================
-- TABLE: store_promotions
-- ==========================================
CREATE TABLE store_promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  promo_type TEXT NOT NULL
    CHECK (promo_type IN ('discount','bundle','free_shipping','timed')),
  discount_percent SMALLINT,
  original_price DECIMAL(12,2),
  sale_price DECIMAL(12,2),
  start_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_store_promotions_store ON store_promotions(store_id);
CREATE INDEX idx_store_promotions_active ON store_promotions(is_active, end_at);

-- ==========================================
-- TABLE: store_subscriptions
-- ==========================================
CREATE TABLE store_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'free'
    CHECK (plan IN ('free','gold','platinum')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','expired','cancelled')),
  price DECIMAL(10,2),
  start_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_at TIMESTAMPTZ,
  payment_method TEXT,
  payment_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==========================================
-- TABLE: user_wishlist
-- ==========================================
CREATE TABLE user_wishlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);

CREATE INDEX idx_user_wishlist_user ON user_wishlist(user_id);

-- ==========================================
-- TABLE: user_recently_viewed
-- ==========================================
CREATE TABLE user_recently_viewed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_recently_viewed ON user_recently_viewed(user_id, viewed_at DESC);

-- Keep only last 20 per user
CREATE OR REPLACE FUNCTION trim_recently_viewed() RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM user_recently_viewed
  WHERE id IN (
    SELECT id FROM user_recently_viewed
    WHERE user_id = NEW.user_id
    ORDER BY viewed_at DESC
    OFFSET 20
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_trim_recently_viewed
  AFTER INSERT ON user_recently_viewed
  FOR EACH ROW EXECUTE FUNCTION trim_recently_viewed();
```

### 1.3 RLS Policies

```sql
-- stores: public read, owner write
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
CREATE POLICY stores_select ON stores FOR SELECT USING (status = 'active');
CREATE POLICY stores_insert ON stores FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY stores_update ON stores FOR UPDATE USING (auth.uid() = user_id);

-- store_categories: public read, store owner write
ALTER TABLE store_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY store_cats_select ON store_categories FOR SELECT USING (true);
CREATE POLICY store_cats_write ON store_categories FOR ALL
  USING (store_id IN (SELECT id FROM stores WHERE user_id = auth.uid()));

-- store_followers: public read, user controls own follows
ALTER TABLE store_followers ENABLE ROW LEVEL SECURITY;
CREATE POLICY followers_select ON store_followers FOR SELECT USING (true);
CREATE POLICY followers_insert ON store_followers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY followers_delete ON store_followers FOR DELETE USING (auth.uid() = user_id);

-- store_reviews: public read, reviewer insert, store owner reply
ALTER TABLE store_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY reviews_select ON store_reviews FOR SELECT USING (true);
CREATE POLICY reviews_insert ON store_reviews FOR INSERT WITH CHECK (auth.uid() = reviewer_id);
CREATE POLICY reviews_reply ON store_reviews FOR UPDATE
  USING (store_id IN (SELECT id FROM stores WHERE user_id = auth.uid()))
  WITH CHECK (store_id IN (SELECT id FROM stores WHERE user_id = auth.uid()));

-- store_analytics: owner only
ALTER TABLE store_analytics ENABLE ROW LEVEL SECURITY;
CREATE POLICY analytics_owner ON store_analytics FOR SELECT
  USING (store_id IN (SELECT id FROM stores WHERE user_id = auth.uid()));

-- store_badges: public read
ALTER TABLE store_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY badges_select ON store_badges FOR SELECT USING (true);

-- user_wishlist & recently_viewed: user own data
ALTER TABLE user_wishlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY wishlist_user ON user_wishlist FOR ALL USING (auth.uid() = user_id);

ALTER TABLE user_recently_viewed ENABLE ROW LEVEL SECURITY;
CREATE POLICY recent_user ON user_recently_viewed FOR ALL USING (auth.uid() = user_id);
```

### 1.4 Helper Functions

```sql
-- Auto-generate unique slug from store name
CREATE OR REPLACE FUNCTION generate_store_slug(store_name TEXT)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INT := 0;
BEGIN
  base_slug := lower(regexp_replace(store_name, '[^a-zA-Z0-9\u0600-\u06FF]', '-', 'g'));
  base_slug := regexp_replace(base_slug, '-+', '-', 'g');
  base_slug := trim(both '-' from base_slug);
  final_slug := base_slug;
  WHILE EXISTS (SELECT 1 FROM stores WHERE slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_stores_updated
  BEFORE UPDATE ON stores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

---

## PHASE 2: Upgrade System — Individual to Store

### 2.1 API: POST /api/stores

```
Request body:
{
  name: string,          // Required, max 30 chars, unique
  main_category: string, // Required, one of 12 categories
  logo: File,            // Optional, PNG/JPG, max 2MB
  description: string,   // Optional, max 500 chars
  theme: string,         // Optional, default 'classic'
  primary_color: string  // Optional, default '#1B5E20'
}

Logic (in a single transaction):
1. Validate name uniqueness
2. Generate slug from name using generate_store_slug()
3. Upload logo to Supabase Storage (bucket: 'store-logos')
4. INSERT into stores
5. UPDATE users SET seller_type = 'store', store_id = new_store.id
6. UPDATE products SET store_id = new_store.id WHERE user_id = auth.uid()
7. Migrate existing user reviews to store_reviews
8. Return store data

Response: { store: StoreObject, migrated_products: number }
```

> ⚠️ **The upgrade is IRREVERSIBLE.** Once a user becomes a store, they cannot revert. Show confirmation dialog in UI.

### 2.2 UI: 3-Step Upgrade Flow

| Step | Content |
|------|---------|
| **Step 1: Basics** | Two fields: store name (Arabic/English, 30 chars, live uniqueness check) + main category (dropdown, 12 options with icons). Both REQUIRED. |
| **Step 2: Identity** | Logo upload (image picker with crop, max 2MB) + description textarea (500 chars with counter). Both OPTIONAL. Skip button visible. |
| **Step 3: Appearance** | Theme picker (4 visual cards: classic/modern/elegant/sporty) + color picker (12 preset color circles). Both OPTIONAL with defaults. |
| **Preview** | Show store preview before confirmation: header mockup with logo + name + theme/color. Buttons: 'تأكيد وفتح المحل' + 'تعديل'. |
| **Success** | Celebration screen: 'مبروك! محلك جاهز!' + migrated products count + 'اذهب لمحلك' button. |

### 2.3 Upgrade Trigger Points (CTAs)

| Location | Details |
|----------|---------|
| **Home page banner** | Colored card (green gradient) above feed for individual users ONLY: 'عندك بضاعة كتير؟ افتح محلك مجاناً على مكسب!' + CTA button. Dismissible (returns after 7 days). |
| **Profile page button** | In 'حسابي', prominent button: 'افتح محلك في مكسب' with store icon. Individuals only. |
| **Seller profile banner** | Small banner at bottom of individual seller's OWN profile: 'حوّل حسابك لمحل!'. Visible to owner only. |
| **Smart notification** | After 5th successful sale: one-time push + in-app notification: 'مبروك! أنت بائع نشط. افتح محلك عشان تكسب أكتر!' |

---

## PHASE 3: Store Page — Full Store Experience

### 3.1 API: GET /api/stores/:slug

```
Response:
{
  store: {
    id, name, slug, logo_url, cover_url, description,
    main_category, sub_categories,
    primary_color, secondary_color, theme, layout,
    location_gov, location_area, phone, working_hours,
    created_at,
    // Computed:
    avg_rating: number,
    total_reviews: number,
    total_followers: number,
    total_products: number,
    total_sales: number,
    avg_response_time: string,
    is_following: boolean,
    badges: Badge[],
  },
  pinned_products: Product[],
  categories: StoreCategory[],
}
```

### 3.2 Store Page UI Components

| Component | Details |
|-----------|---------|
| **Store Header** | Banner (or colored fallback) + logo (or letter avatar) + name + stars + followers + 'متابعة' toggle + 'تواصل' button. Styled with store's colors/theme. |
| **Internal Nav Tabs** | Sticky tabs: كل المنتجات \| التصنيفات \| العروض \| التقييمات \| عن المحل. Tab indicator uses store's primary_color. |
| **Pinned Carousel** | Horizontal carousel of up to 5 pinned products with large images. Only shows if pinned products exist. |
| **Products by Category** | Sections grouped by store_categories. Each: category name + count + horizontal product scroll + 'عرض الكل'. |
| **In-Store Search** | Search bar filtering only this store's products. Debounced, instant results. |
| **In-Store Filters** | Filter sheet: price range, condition, internal category, sale type. |
| **'About' Tab** | Description + location + hours + join date + total sales + avg response time. |
| **Reviews Tab** | Reviews list: stars + sub-ratings + comment + seller reply. Newest first. Paginated. |
| **Share Store** | Share button: generates link + preview. WhatsApp, Facebook, Twitter, Telegram. |

### 3.3 Store Categories CRUD

```
CRUD /api/stores/:id/categories  (owner only, RLS enforced)

POST   → Create { name, sort_order } → auto-generate slug
PUT    → Update { name, sort_order }
DELETE → Delete (products become uncategorized)
PATCH  → Reorder { categories: [{id, sort_order}] }

Auto-update products_count via trigger or computed query.
```

---

## PHASE 4: Unified Home Page + Product Card

### 4.1 Home Page Layout (Top to Bottom)

| Element | Details |
|---------|---------|
| **Search Bar** | Full-width. Searches products AND stores. Placeholder: 'ابحث عن منتجات أو محلات...'. Tap opens search page. |
| **Category Strip** | Horizontal scroll, 12 categories + icons. 'الكل' at start (default selected). Tap = filter feed. |
| **Seller Type Filter** | 3 pill buttons: **'أفراد وتجار' (DEFAULT, filled)** \| 'أفراد فقط' \| 'تجار فقط'. Instant feed filter. |
| **Upgrade Banner** | For individuals ONLY. Green gradient card + CTA. Dismissible (7 day cooldown). |
| **Unified Feed** | Infinite scroll grid (2 cols). Mixed individuals + stores. Newest first. Uses Unified Product Card. |

### 4.2 Unified Product Card

**Shared elements (IDENTICAL for individual and store):**

| Element | Details |
|---------|---------|
| Product Image | Square, rounded 12px. Photo count badge top-left. Wishlist heart top-right. |
| Title | 1-2 lines, ellipsis truncation. 14px semibold. |
| Price | Large, bold, green. If discount: strikethrough original + new price + red '-X%' badge. |
| Location + Time | Small gray: 'القاهرة - منذ 5 دقائق'. |
| Sale Type Badge | Small: 'بيع' (green) / 'مزاد' (red) / 'تبادل' (blue). Only if not regular sale. |

**THE KEY DIFFERENCE — Seller Strip at bottom of card:**

| Type | Seller Strip |
|------|-------------|
| **Individual** | Circular avatar (32px) + seller name (regular weight) + small star rating. If verified: blue checkmark. Tap → individual profile. |
| **Store** | Square logo rounded corners (32px) + store name (semibold) + green 'محل' badge (white text, light-green bg, 10px). If trusted: additional badge. Tap → store page. |

> ⚠️ **The ONLY visual difference is the seller strip. Everything else is IDENTICAL. Do NOT add any other differences.**

### 4.3 API: GET /api/home

```
GET /api/home?page=1&limit=20&category=all&seller_type=all

seller_type: 'all' (default) | 'individual' | 'store'
category: 'all' (default) | 'cars' | 'phones' | etc.

Response:
{
  products: [
    {
      id, title, price, original_price, images, location,
      sale_type, condition, created_at,
      seller: {
        type: 'individual' | 'store',
        id, name,
        // If individual:
        avatar_url, rating, is_verified,
        // If store:
        logo_url, rating, badges, slug
      }
    }
  ],
  has_more: boolean,
  show_upgrade_banner: boolean
}
```

---

## PHASE 5: Unified Search

### 5.1 API: GET /api/search

```
GET /api/search?q=آيفون&seller_type=all&category=all&price_min=&price_max=&condition=&sale_type=&location_gov=&rating_min=&verified_only=false

Response:
{
  stores: [
    { id, name, slug, logo_url, main_category, rating, badges }
  ],
  products: [
    { ...same shape as home feed }
  ],
  total_products: number,
  has_more: boolean
}

Search implementation:
- Arabic fuzzy search with tsvector
- Handle hamza variants: ا أ إ آ treated as same
- Handle common misspellings
- Stores: search by name, description, main_category
- Products: search by title, description
```

### 5.2 Search UI

| Element | Details |
|---------|---------|
| Search Page | Full-screen. Auto-focus input. Keyboard opens immediately. |
| Suggestions | While typing: recent searches + popular searches + matching store names. |
| Store Results | If stores match: horizontal row at top (logo + name + category). Tap → store page. Max 5 + 'المزيد'. |
| Product Results | Below stores: same card grid as home. With seller_type filter. |
| Filters | Same as home + verified_only toggle. Bottom sheet. |
| Sort | الأحدث \| الأقل سعراً \| الأعلى سعراً \| الأقرب \| الأعلى تقييماً. |

---

## PHASE 6: Individual Seller Profile

### 6.1 API: GET /api/sellers/:id

```
Response:
{
  seller: {
    id, name, avatar_url, rating, total_ratings,
    total_listings, is_verified, joined_at
  },
  products: Product[],
  reviews: Review[]
}
```

### 6.2 UI

| Element | Details |
|---------|---------|
| Header | Large circular avatar + name + star rating + 'Y إعلان' + 'عضو منذ Z' + verified badge. WhatsApp + Chat buttons. |
| Products | Simple grid of active products. No categories, no pinning. |
| Reviews | Simple list: stars + comment. No sub-ratings (store-only feature). |
| Upgrade Banner | Owner only: small banner 'حوّل حسابك لمحل!' |

---

## PHASE 7: Badges & Reviews System

### 7.1 Badge Auto-Calculation

Run as Supabase Edge Function or cron job (daily):

```
Badge: 'trusted' (محل موثوق)
Conditions (ALL must be true):
- store.total_sales >= 10
- store.avg_rating >= 4.0
- store.user.is_verified === true
- months since store.created_at >= 3

Badge: 'active' (بائع نشط)
Conditions:
- avg_response_time <= 1 hour
- products_added_last_30_days >= 3
- store.updated_at within last 7 days

Badge: 'top_seller' (أعلى مبيعات)
- Top 10 stores by sales per category per month
- Recalculate monthly, expires after 30 days

Badge: 'gold' / 'platinum'
- Assigned via subscription system
```

### 7.2 Review System

| Feature | Details |
|---------|---------|
| Trigger | After buyer + seller confirm transaction → show review prompt to buyer. One review per transaction. |
| Individual Review | Simple: 1-5 stars + optional text. No sub-ratings. |
| Store Review | Full: 1-5 overall + 4 sub-ratings (quality, accuracy, response, commitment) + optional text. Sub-ratings optional. |
| Seller Reply | Store owner replies to reviews. One reply per review. Displayed below review. |
| Avg Response Time | Auto-calculated from chat timestamps. Display: 'يرد خلال ساعة' / 'يرد خلال دقائق'. |

---

## PHASE 8: Follow System + Store Promotions

### 8.1 Follow System (Stores Only)

| Feature | Details |
|---------|---------|
| API | `POST /api/stores/:id/follow` — toggle. Returns `{ is_following, followers_count }` |
| Follow Button | In store header: 'متابعة' / 'متابَع' toggle with follower count. |
| Following Feed | `GET /api/feed/following` — latest products + promos from followed stores. Accessible from 'حسابي' → 'المتابعات'. |
| Notification: New Product | Push to all followers: '[store] أضاف منتج جديد: [title]' |
| Notification: New Promo | Push to all followers: '[store] عنده عرض جديد!' |
| My Followed Stores | In 'حسابي': list with logo + name + last activity. |

### 8.2 Store Promotions (Stores Only)

| Type | Details |
|------|---------|
| Price Discount | Set original_price + sale_price. UI: strikethrough + new price + '-X%'. Auto-notify followers. |
| Timed Offer | Discount with end_at. Card shows countdown. Auto-deactivate on expiry. |
| Bundle | Link products with combined price. Store page shows bundle card. |
| Free Shipping | Toggle flag. Green 'شحن مجاني' badge on card. |

> **Note:** Individual sellers can ONLY do simple price reduction (edit price, old shown as strikethrough). No timed offers, bundles, or free shipping.

---

## PHASE 9: Seller Dashboard

### 9.1 Individual Dashboard (in 'حسابي')

| Feature | Details |
|---------|---------|
| My Listings | Grid with status pills: نشط (green), مُباع (gray), مُعلّق (orange), مرفوض (red). Edit/delete. |
| My Reviews | Reviews received. Read-only. |
| My Wishlist | Saved products. Remove button. |
| Upgrade CTA | Card: 'افتح محلك واحصل على إحصائيات ومتابعين ومميزات أكتر!' |

### 9.2 Store Dashboard (in 'حسابي' → 'لوحة التحكم')

| Feature | Details |
|---------|---------|
| Overview Cards | 4 cards: Active Products \| Today's Views \| Month's Sales (count + EGP) \| New Followers |
| Views Chart | Line chart: daily views 30 days. Toggle: 7d/30d/90d. |
| Sales Stats | Total sales + revenue + avg price. Monthly bar chart. |
| Traffic Sources | Pie chart: Search / Direct / Followers / Product Card. |
| Top Products | Top 5 most viewed with counts. |
| Reviews Management | All reviews + reply button + unread indicator. |
| Followers | Count + list. 'Send promotion to all' button. |
| Transactions | Table: product, buyer, price, date, status. Filterable. |
| Promotions Manager | CRUD: create/edit/stop promotions. Active/expired tabs. |
| Store Settings | Edit: logo, cover, name, description, colors, theme, categories, layout, phone, hours. |

---

## PHASE 10: Visibility Tools + Discovery

### 10.1 Visibility

| Feature | Details |
|---------|---------|
| Boost in Search | Paid: product at top of search for X days. Both individuals and stores. 'مُعلن' label. |
| Share | Share button on products + stores. WhatsApp, Facebook, Twitter, Telegram. Auto-generated preview. |
| QR Code | Stores only: generate QR for store URL. Downloadable image. |

### 10.2 Discovery

| Feature | Details |
|---------|---------|
| Similar Products | On product page: 'منتجات مشابهة'. Same category + price range. From same + other sellers. |
| Recently Viewed | In 'حسابي': last 20 products. Auto-tracked via user_recently_viewed. |
| Wishlist | Heart on cards + detail page. 'المفضلة' in 'حسابي'. Notify on price drop. |
| Recommendations | Occasional 'منتجات قد تعجبك' in feed based on browsing. |
| Comparison | Long-press 2-3 products → 'مقارنة'. Side-by-side sheet. |

---

## PHASE 11: Testing & Launch

### Verification Checklist

```
[ ] Individual user registers and posts ads normally
[ ] Individual sees upgrade banner on home
[ ] Upgrade flow: 3 steps → products migrated → store created
[ ] Store page loads correctly (header, tabs, products, reviews)
[ ] Product card: correct seller strip (individual vs store)
[ ] Seller type filter works (all/individual/store)
[ ] Search finds products AND stores
[ ] Follow/unfollow works, count updates
[ ] Followers notified on new product/promotion
[ ] Reviews work for both individuals and stores
[ ] Store reviews have sub-ratings, individual don't
[ ] Seller reply works
[ ] Badge auto-calculation correct
[ ] Store dashboard: correct analytics
[ ] Individual dashboard: simple, no analytics
[ ] Promotions CRUD works (store only)
[ ] Wishlist + recently viewed work
[ ] Share generates correct links
[ ] RLS policies block unauthorized access
[ ] All Arabic text correct and RTL
[ ] No 'mall' or 'سوق' references remain
[ ] Home feed < 2s on 3G
[ ] Store page < 3s
[ ] Search < 1s
[ ] Images auto-compressed, max 500KB, WebP preferred
```

---

## REFERENCE: Individual vs Store Comparison

| Feature | Individual | Store |
|---------|-----------|-------|
| Post ads | ✅ Unlimited | ✅ Unlimited |
| Appear in search & feed | ✅ | ✅ |
| Seller page | Simple: name + avatar + rating + listings | Full: logo + banner + theme + categories + showcase |
| Internal categories | ❌ | ✅ Up to 10 |
| Pinned showcase | ❌ | ✅ Up to 5 products |
| Custom colors/theme | ❌ | ✅ |
| Logo | ❌ Profile photo only | ✅ Custom logo |
| Badges | Verified ID only | All: trusted, active, top seller, gold, platinum |
| Analytics | Listing count + rating only | Full dashboard |
| Promotions | Simple price reduction only | All types: discount, timed, bundle, free shipping |
| Followers | ❌ | ✅ Follow + notifications |
| Cost | Free | Free + optional paid tiers |

---

## REFERENCE: Navigation Structure

```
Bottom Navigation (4 tabs):
├── 🏠 Home (default)
│   ├── Search bar (products + stores)
│   ├── Category strip (12 categories)
│   ├── Seller type filter (all/individual/store)
│   ├── Upgrade banner (individuals only)
│   └── Unified feed (infinite scroll, 2-col grid)
├── ➕ Add Listing
│   └── 4-step ad creation (same for both)
├── 💬 Chat
│   └── All conversations (filter: all/buying/selling)
└── 👤 Profile
    ├── Individual: listings + reviews + wishlist + upgrade CTA
    └── Store: all above + store dashboard + store settings
```

---

## REFERENCE: 12 Product Categories

```
1.  سيارات (Cars)
2.  عقارات (Real Estate)
3.  موبايلات (Phones)
4.  أزياء (Fashion)
5.  خردة (Scrap Materials)
6.  ذهب وفضة (Gold & Silver)
7.  لاكشري (Luxury)
8.  أجهزة منزلية (Home Appliances)
9.  أثاث (Furniture)
10. هوايات (Hobbies)
11. أدوات (Tools)
12. خدمات (Services)
```
