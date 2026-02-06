# 🟢 مكسب Maksab — Claude Code Development Prompt

> **توجيه شامل لبناء تطبيق "مكسب" — سوق إلكتروني مصري لبيع وشراء وتبديل السلع الجديدة والمستعملة**

---

## 📋 PROJECT OVERVIEW

**App Name:** مكسب (Maksab)
**Tagline:** "كل صفقة مكسب"
**Language:** Arabic only (RTL layout)
**Target Market:** Egypt (Egyptian Arabic UX/UI)
**Platform:** Progressive Web App (PWA) — mobile-first, installable on home screen
**Future:** Will be converted to React Native later — so keep architecture clean and API-driven

---

## 🏗️ TECH STACK & INFRASTRUCTURE

### Frontend
- **Framework:** Next.js 14+ (App Router) with TypeScript
- **Styling:** Tailwind CSS (RTL support via `dir="rtl"`)
- **PWA:** next-pwa for service worker, offline support, and installability
- **State Management:** Zustand (lightweight)
- **Forms:** React Hook Form + Zod validation
- **Image Handling:** Client-side compression before upload (max 1MB per image)
- **Real-time:** Supabase Realtime for chat and auction updates

### Backend & Database
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth with Phone OTP (SMS via Supabase built-in or Twilio)
- **Storage:** Supabase Storage for images (with automatic resizing via image transformations)
- **Real-time:** Supabase Realtime subscriptions (chat messages, auction bids)
- **Edge Functions:** Supabase Edge Functions for business logic (auction timer, commission calculation)
- **Search:** PostgreSQL Full-Text Search with Arabic support + pg_trgm for fuzzy matching

### Deployment
- **Frontend Hosting:** Vercel (auto-deploy from GitHub)
- **Backend:** Supabase (managed)
- **Background Jobs:** Railway (for scheduled tasks: auction expiry, notifications)
- **Source Control:** GitHub

### Folder Structure
```
maksab/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── layout.tsx          # Root layout (RTL, Arabic fonts)
│   │   ├── page.tsx            # Home page (listings feed)
│   │   ├── search/             # Advanced search page
│   │   ├── ad/
│   │   │   ├── [id]/           # Ad detail page
│   │   │   └── create/         # Multi-step ad creation wizard
│   │   ├── chat/               # Chat system
│   │   │   ├── page.tsx        # Conversations list
│   │   │   └── [id]/           # Individual chat
│   │   ├── profile/            # User profile & settings
│   │   ├── my-ads/             # User's own ads management
│   │   └── auctions/           # Active auctions
│   ├── components/
│   │   ├── ui/                 # Reusable UI components (buttons, inputs, modals)
│   │   ├── layout/             # Header, BottomNav, Sidebar
│   │   ├── ad/                 # Ad card, Ad form steps, Category forms
│   │   ├── search/             # Search bar, Filters, Results
│   │   ├── chat/               # Chat bubbles, Chat input
│   │   └── auction/            # Bid card, Timer, Buy now button
│   ├── lib/
│   │   ├── supabase/           # Supabase client & helpers
│   │   ├── categories/         # Category configs (fields, validations per category)
│   │   ├── utils/              # Helpers (price formatter, time ago, etc.)
│   │   └── hooks/              # Custom React hooks
│   ├── stores/                 # Zustand stores
│   └── types/                  # TypeScript types
├── supabase/
│   ├── migrations/             # Database migrations
│   ├── functions/              # Edge Functions
│   └── seed.sql                # Seed data (governorates, cities, categories)
├── public/
│   ├── icons/                  # PWA icons
│   └── manifest.json           # PWA manifest
├── railway/
│   └── workers/                # Background job scripts
└── tailwind.config.ts          # Tailwind config with RTL & brand colors
```

---

## 🎨 BRAND IDENTITY & DESIGN SYSTEM

### Color Palette
```
Primary Green:    #1B7A3D (trust, growth, money)
Primary Gold:     #D4A843 (premium, profit, wealth)
Dark Green:       #145C2E (headers, emphasis)
Light Green:      #E8F5E9 (backgrounds, success states)
Light Gold:       #FFF8E1 (highlight, featured items)
Dark Text:        #1A1A2E (main text)
Gray Text:        #6B7280 (secondary text)
Light Gray:       #F3F4F6 (card backgrounds)
White:            #FFFFFF (main background)
Error Red:        #DC2626
Warning Orange:   #F59E0B
```

### Typography
- **Arabic Font:** Cairo (Google Fonts) — clear, modern, excellent Arabic support
- **Headings:** Cairo Bold
- **Body:** Cairo Regular
- **Numbers/Prices:** Cairo Bold — always use Arabic-Eastern numerals display option BUT store as standard digits

### Design Principles
1. **Mobile-first:** Design for 375px width first, then scale up
2. **Thumb-friendly:** All interactive elements ≥ 44px tap targets
3. **RTL-native:** Everything flows right-to-left naturally
4. **Minimal & clean:** White space is your friend, don't overcrowd
5. **Speed-first:** Skeleton loaders, optimistic updates, lazy loading
6. **Egyptian UX:** Use familiar patterns from apps Egyptians already use (OLX, Facebook Marketplace)

### Bottom Navigation (5 tabs)
```
[الرئيسية 🏠] [البحث 🔍] [+ أضف إعلان] [الرسائل 💬] [حسابي 👤]
```
- The "+ أضف إعلان" button should be prominent (green circle, elevated)
- Unread messages badge on chat icon
- Active tab highlighted in primary green

---

## 🔐 AUTHENTICATION SYSTEM

### Philosophy: Frictionless Entry
The user should be able to BROWSE everything without any account. Authentication is ONLY required when:
- Adding an ad
- Sending a message
- Placing a bid
- Saving favorites

### Registration/Login Flow (One Flow)
```
Trigger action (e.g., tap "أضف إعلان")
  → Bottom sheet appears: "سجّل برقم موبايلك"
  → Input: Egyptian phone number (01XXXXXXXXX)
  → Validate: Must start with 010, 011, 012, or 015, exactly 11 digits
  → Send OTP via SMS
  → Input: 6-digit OTP code (with auto-fill support)
  → Auto-resend option after 60 seconds
  → On success: Account created (or logged in if exists)
  → Redirect to original action
```

### User Profile (Complete Later)
After registration, the user has ONLY a phone number. They can optionally complete:
- Display name (اسم العرض)
- Profile photo
- Governorate & City (المحافظة والمدينة)
- Bio (نبذة مختصرة)

The app should gently prompt profile completion (not force it) with a progress indicator on the profile page.

---

## 📦 CATEGORIES SYSTEM

### Category Architecture
Each category has its own dedicated form page with fields specific to that category. Categories are configured as data (not hard-coded in components) to make adding new categories easy.

### Category Configuration Pattern
```typescript
// lib/categories/types.ts
interface CategoryConfig {
  id: string;
  name: string;                    // Arabic name
  icon: string;                    // Emoji or icon
  slug: string;                    // URL slug
  subcategories: Subcategory[];
  fields: CategoryField[];         // All fields for this category
  requiredFields: string[];        // Max 4 required fields (IDs)
  titleTemplate: string;           // Auto-title template
  descriptionTemplate: string;     // Auto-description template
}

interface CategoryField {
  id: string;
  label: string;                   // Arabic label
  type: 'select' | 'number' | 'text' | 'toggle' | 'multi-select' | 'year-picker';
  options?: { value: string; label: string }[];
  placeholder?: string;
  unit?: string;                   // e.g., "كم", "جنيه", "متر"
  isRequired: boolean;
  order: number;                   // Display order on form
}
```

### All Categories & Their Specific Fields

---

#### 1. 🚗 السيارات (Cars)
**Subcategories:** سيارات ملاكي، ميكروباص، نقل، موتوسيكلات، قطع غيار
**Required Fields (4):**
- الماركة (Brand) — select: تويوتا، هيونداي، شيفروليه، نيسان، كيا، بي إم دبليو، مرسيدس، فيات، سكودا، أوبل، بيجو، رينو، سوزوكي، ميتسوبيشي، هوندا، MG، شيري، بي واي دي، جيلي، أخرى
- الموديل (Model) — select (dynamic based on brand)
- السنة (Year) — year-picker (1990-2026)
- الكيلومتراج (Mileage) — number + unit "كم"

**Optional Fields:**
- اللون (Color) — select
- نوع الوقود (Fuel) — select: بنزين، سولار، غاز، كهرباء، هايبرد
- ناقل الحركة (Transmission) — select: أوتوماتيك، مانيوال
- سعة المحرك (Engine CC) — select: 1000، 1200، 1300، 1500، 1600، 1800، 2000، 2500، 3000+
- الحالة (Condition) — select: جديدة، مستعملة، حادثة
- مُرخصة (Licensed) — toggle

**Auto Title Example:** "تويوتا كورولا 2020 — 45,000 كم"
**Auto Description Example:** "سيارة تويوتا كورولا موديل 2020، مسافة 45,000 كم، أوتوماتيك، بنزين، لون أبيض، مُرخصة"

---

#### 2. 🏠 العقارات (Real Estate)
**Subcategories:** شقق للبيع، شقق للإيجار، فيلات، أراضي، محلات تجارية، مكاتب
**Required Fields (4):**
- النوع (Type) — select: شقة، فيلا، أرض، محل، مكتب، دوبلكس، بنتهاوس، استوديو
- المساحة (Area) — number + unit "م²"
- عدد الغرف (Rooms) — select: 1، 2، 3، 4، 5+
- الطابق (Floor) — select: بدروم، أرضي، 1-20، أخير

**Optional Fields:**
- عدد الحمامات (Bathrooms) — select: 1، 2، 3، 4+
- التشطيب (Finishing) — select: سوبر لوكس، لوكس، نص تشطيب، على المحارة، على الطوب
- أسانسير (Elevator) — toggle
- جراج (Garage) — toggle
- حديقة (Garden) — toggle
- الواجهة (Facing) — select: بحري، قبلي، شرقي، غربي
- مفروشة (Furnished) — toggle

**Auto Title Example:** "شقة 150م² — 3 غرف — الطابق الخامس"

---

#### 3. 📱 الموبايلات والتابلت (Phones & Tablets)
**Subcategories:** موبايلات، تابلت، إكسسوارات، قطع غيار
**Required Fields (4):**
- الماركة (Brand) — select: آيفون، سامسونج، شاومي، أوبو، ريلمي، فيفو، هواوي، ون بلس، نوكيا، أخرى
- الموديل (Model) — dynamic select based on brand
- المساحة (Storage) — select: 32GB، 64GB، 128GB، 256GB، 512GB، 1TB
- الحالة (Condition) — select: جديد متبرشم، مستعمل زيرو، مستعمل كويس، مستعمل مقبول، تالف

**Optional Fields:**
- اللون (Color) — select
- الرام (RAM) — select: 3GB، 4GB، 6GB، 8GB، 12GB، 16GB
- البطارية (Battery Health) — select: ممتازة، جيدة، مقبولة
- مع العلبة (With Box) — toggle
- مع الضمان (With Warranty) — toggle

**Auto Title Example:** "آيفون 15 برو ماكس — 256GB — مستعمل زيرو"

---

#### 4. 👗 الموضة (Fashion)
**Subcategories:** ملابس رجالي، ملابس حريمي، ملابس أطفال، أحذية، شنط، إكسسوارات
**Required Fields (4):**
- النوع (Type) — dynamic based on subcategory
- الحالة (Condition) — select: جديد بالتاج، جديد بدون تاج، مستعمل ممتاز، مستعمل جيد
- المقاس (Size) — dynamic: XS/S/M/L/XL/XXL or numeric for shoes
- الماركة (Brand) — text input with suggestions

**Optional Fields:**
- اللون (Color) — select
- الخامة (Material) — select: قطن، بوليستر، جلد، جينز، حرير، كتان

**Auto Title Example:** "جاكت جلد رجالي — Zara — مقاس L — جديد بالتاج"

---

#### 5. ♻️ الخردة (Scrap & Recyclables)
**Subcategories:** حديد، ألومنيوم، نحاس، بلاستيك، ورق، أجهزة قديمة، مخلفات بناء، أخرى
**Required Fields (3):**
- النوع (Type) — select based on subcategory
- الوزن التقريبي (Approx Weight) — number + unit selector: كجم / طن
- الحالة (Condition) — select: نظيف، مختلط، يحتاج فرز

**Optional Fields:**
- الكمية (Quantity) — text (وصف حر)
- صور إضافية (More Details) — text

**Auto Title Example:** "حديد خردة — 500 كجم — نظيف"

---

#### 6. 💰 الذهب والفضة (Gold & Silver)
**Subcategories:** ذهب، فضة، ألماس، ساعات ثمينة
**Required Fields (4):**
- النوع (Type) — select: خاتم، سلسلة، حلق، أسورة، عقد، دبلة، محبس، جنيه ذهب، سبيكة، أخرى
- العيار (Karat/Purity) — select: عيار 24، عيار 21، عيار 18، عيار 14، فضة 925، فضة 900
- الوزن (Weight) — number + unit "جرام"
- الحالة (Condition) — select: جديد، مستعمل

**Optional Fields:**
- الماركة (Brand) — text
- مقاس الخاتم (Ring Size) — number
- يوجد فص/حجر (Has Gemstone) — toggle
- شهادة (Certificate) — toggle

**Auto Title Example:** "سلسلة ذهب عيار 21 — 15 جرام — جديدة"

---

#### 7. 💎 السلع الفاخرة (Luxury Goods)
**Subcategories:** شنط فاخرة، نظارات، ساعات، عطور، أقلام
**Required Fields (4):**
- النوع (Type) — select based on subcategory
- الماركة (Brand) — select: Louis Vuitton، Gucci، Chanel، Rolex، Cartier، Dior، Prada، أخرى
- الحالة (Condition) — select: جديد متبرشم، جديد بدون استعمال، مستعمل ممتاز، مستعمل جيد
- أصلي/تقليد (Authentic) — select: أصلي بالضمان، أصلي بدون ضمان، هاي كوبي، كوبي

**Optional Fields:**
- سنة الشراء (Purchase Year) — year-picker
- مع العلبة (With Box) — toggle
- مع الفاتورة (With Receipt) — toggle

**Auto Title Example:** "شنطة Louis Vuitton Neverfull — أصلي بالضمان — مستعملة ممتاز"

---

#### 8. 🏠 الأجهزة المنزلية (Home Appliances)
**Subcategories:** غسالات، ثلاجات، بوتاجازات، مكيفات، سخانات، أجهزة صغيرة (خلاط، مكواة، إلخ)
**Required Fields (4):**
- النوع (Type) — select based on subcategory
- الماركة (Brand) — select: توشيبا، شارب، سامسونج، إل جي، بيكو، يونيفرسال، كاريير، فريش، أخرى
- الحالة (Condition) — select: جديد متبرشم، مستعمل ممتاز، مستعمل كويس، يحتاج صيانة
- سنة الشراء (Purchase Year) — year-picker

**Optional Fields:**
- السعة (Capacity) — text (e.g., "14 كيلو" for washer, "16 قدم" for fridge)
- الضمان (Warranty) — toggle
- اللون (Color) — select
- الموديل (Model) — text

**Auto Title Example:** "غسالة توشيبا 10 كيلو — 2023 — مستعملة ممتاز"

---

#### 9. 🪑 الأثاث والديكور (Furniture & Decor)
**Subcategories:** غرف نوم، سفرة، أنتريه، مطابخ، ديكورات، إضاءة، سجاد، أخرى
**Required Fields (3):**
- النوع (Type) — select based on subcategory
- الحالة (Condition) — select: جديد، مستعمل ممتاز، مستعمل جيد، يحتاج تجديد
- الخامة (Material) — select: خشب زان، خشب أرو، MDF، خشب موسكي، معدن، أخرى

**Optional Fields:**
- اللون (Color) — select
- عدد القطع (Pieces) — number
- الأبعاد (Dimensions) — text

**Auto Title Example:** "غرفة نوم خشب زان — 7 قطع — مستعملة ممتاز"

---

#### 10. 🎮 الهوايات (Hobbies & Sports)
**Subcategories:** آلات موسيقية، معدات رياضية، ألعاب فيديو (بلايستيشن، إكسبوكس)، كتب، كاميرات، دراجات، تحف وأنتيكات، حيوانات أليفة
**Required Fields (3):**
- النوع (Type) — select based on subcategory
- الحالة (Condition) — select: جديد، مستعمل ممتاز، مستعمل جيد، مستعمل مقبول
- الماركة/الوصف (Brand/Description) — text

**Optional Fields:**
- سنة الشراء (Purchase Year) — year-picker
- مع ملحقات (With Accessories) — toggle

**Auto Title Example:** "بلايستيشن 5 — مستعمل ممتاز — مع 2 يد"

---

#### 11. 🔧 العدد والأدوات (Tools & Equipment)
**Subcategories:** عدد يدوية، عدد كهربائية، معدات ورش، معدات زراعية، معدات مطاعم
**Required Fields (3):**
- النوع (Type) — select based on subcategory
- الحالة (Condition) — select: جديد، مستعمل يعمل، يحتاج صيانة
- الماركة (Brand) — text

**Optional Fields:**
- الكمية (Quantity) — number
- مصدر الطاقة (Power) — select: كهرباء، بطارية، يدوي، بنزين

**Auto Title Example:** "شنيور بوش كهرباء — مستعمل يعمل"

---

#### 12. 🛠️ الخدمات (Services)
**Subcategories:** سباكة، كهرباء، نقاشة، نجارة، صيانة أجهزة، نقل أثاث، تنظيف، خدمات تقنية، دروس خصوصية، خدمات أخرى
**Required Fields (3):**
- نوع الخدمة (Service Type) — select based on subcategory
- التسعير (Pricing) — select: بالساعة، بالمشروع، بالاتفاق، سعر ثابت
- الخبرة (Experience) — select: أقل من سنة، 1-3 سنوات، 3-5 سنوات، أكثر من 5 سنوات

**Optional Fields:**
- نطاق الخدمة (Service Area) — multi-select governorates
- أيام العمل (Working Days) — multi-select
- مواعيد العمل (Working Hours) — text

**Auto Title Example:** "سباك خبرة 5+ سنوات — بالمشروع — القاهرة"

---

## 📝 AD CREATION WIZARD (4 Steps Max)

### Design Philosophy
- **Speed over completeness:** A user should be able to post an ad in under 60 seconds
- **Smart defaults:** Pre-select common values where possible
- **Progressive disclosure:** Show optional fields collapsed/secondary
- **Auto-save:** Save progress so user can resume if interrupted

### Step 1: Choose Category & Sale Type
```
┌─────────────────────────────────┐
│  ✦ أضف إعلانك في مكسب           │
│                                 │
│  اختار القسم:                    │
│  ┌─────┐ ┌─────┐ ┌─────┐      │
│  │ 🚗  │ │ 🏠  │ │ 📱  │      │
│  │سيارات│ │عقارات│ │موبايل│      │
│  └─────┘ └─────┘ └─────┘      │
│  ┌─────┐ ┌─────┐ ┌─────┐      │
│  │ 👗  │ │ ♻️  │ │ 💰  │      │
│  │موضة │ │خردة │ │ذهب   │      │
│  └─────┘ └─────┘ └─────┘      │
│  ... (remaining categories)     │
│                                 │
│  ─── ثم اختار القسم الفرعي ──── │
│  [subcategories appear here]    │
│                                 │
│  ─── نوع البيع ──────────────── │
│  ◉ بيع نقدي 💵                  │
│  ○ مزاد 🔨                      │
│  ○ تبديل 🔄                     │
│                                 │
│           [التالي ←]            │
└─────────────────────────────────┘
```

### Step 2: Category-Specific Details (Dynamic Form)
This page is UNIQUE per category — it loads the fields from the CategoryConfig.

```
┌─────────────────────────────────┐
│  ✦ تفاصيل السيارة               │
│                                 │
│  ── الحقول الأساسية (مطلوبة) ── │
│  الماركة:    [▼ اختار الماركة  ] │
│  الموديل:   [▼ اختار الموديل  ] │
│  السنة:     [▼ 2024         ▼] │
│  الكيلومتراج: [______] كم      │
│                                 │
│  ── حقول إضافية (اختياري) ────  │
│  [▼ اضغط لإضافة تفاصيل أكتر]   │
│  │ اللون: [▼]                  │
│  │ الوقود: [▼]                 │
│  │ ناقل الحركة: [▼]            │
│  │ ...                         │
│                                 │
│     [→ السابق]   [التالي ←]     │
└─────────────────────────────────┘
```

### Step 3: Price & Photos
```
┌─────────────────────────────────┐
│  ✦ السعر والصور                 │
│                                 │
│  ── السعر ─────────────────────  │
│  [IF نقدي:]                     │
│  السعر: [__________] جنيه       │
│  ☐ السعر قابل للتفاوض           │
│                                 │
│  [IF مزاد:]                     │
│  سعر الافتتاح: [______] جنيه    │
│  سعر "اشتري الآن": [____] جنيه  │ (optional)
│  مدة المزاد: ○24  ○48  ○72 ساعة │
│  الحد الأدنى للمزايدة: [___] جنيه│
│                                 │
│  [IF تبديل:]                    │
│  عايز تبدل بإيه: [__________]   │
│  ☐ أقبل فرق سعر                 │
│  فرق السعر: [______] جنيه       │
│                                 │
│  ── الصور (حتى 5) ─────────────  │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐  │
│  │ +  │ │    │ │    │ │    │  │
│  │صورة│ │    │ │    │ │    │  │
│  └────┘ └────┘ └────┘ └────┘  │
│  📸 الصورة الأولى هي الصورة     │
│     الرئيسية للإعلان             │
│                                 │
│     [→ السابق]   [التالي ←]     │
└─────────────────────────────────┘
```

### Step 4: Location & Review
```
┌─────────────────────────────────┐
│  ✦ الموقع والمراجعة             │
│                                 │
│  ── الموقع ────────────────────  │
│  [📍 استخدم موقعي الحالي]       │
│       أو                        │
│  المحافظة: [▼ اختار المحافظة]   │
│  المدينة:  [▼ اختار المدينة ]   │
│                                 │
│  ── مراجعة الإعلان ────────────  │
│  ┌─────────────────────────────┐│
│  │ 📷 [image preview]          ││
│  │ تويوتا كورولا 2020 — 45كم  ││
│  │ سيارة تويوتا كورولا موديل  ││
│  │ 2020، مسافة 45,000 كم...   ││
│  │ 💰 350,000 جنيه             ││
│  │ 📍 القاهرة — مدينة نصر     ││
│  └─────────────────────────────┘│
│  ✏️ [تعديل العنوان والوصف]      │
│                                 │
│  ── (IF NOT LOGGED IN) ────────  │
│  رقم الموبايل: [01_________]   │
│  [إرسال كود التأكيد]            │
│  كود التأكيد: [______]          │
│                                 │
│     [→ السابق]  [✅ نشر الإعلان] │
└─────────────────────────────────┘
```

### Auto-Generated Title & Description
The title and description are AUTOMATICALLY assembled from the required + filled optional fields using templates.

```typescript
// Example for Cars
function generateTitle(fields: Record<string, any>): string {
  return `${fields.brand} ${fields.model} ${fields.year} — ${formatNumber(fields.mileage)} كم`;
}

function generateDescription(fields: Record<string, any>): string {
  const parts = [`سيارة ${fields.brand} ${fields.model} موديل ${fields.year}`];
  parts.push(`مسافة ${formatNumber(fields.mileage)} كم`);
  if (fields.transmission) parts.push(fields.transmission);
  if (fields.fuel) parts.push(fields.fuel);
  if (fields.color) parts.push(`لون ${fields.color}`);
  if (fields.licensed) parts.push('مُرخصة');
  return parts.join('، ');
}
```

The user can see the auto-generated title/description in Step 4 and optionally edit it before publishing.

---

## 🔍 ADVANCED SEARCH SYSTEM

### Search Philosophy
The search should be the FASTEST way to find what you want. It should understand context, suggest as you type, and allow powerful filtering without overwhelming the user.

### Smart Search Bar (Home Page)
```
┌──────────────────────────────────────┐
│ 🔍 ابحث في مكسب... (عربي حر)        │
│──────────────────────────────────────│
│ بحث سريع:                            │
│ [سيارات] [موبايلات] [عقارات] [ذهب]   │
└──────────────────────────────────────┘
```

### Search Features
1. **Full-Text Arabic Search:** Using PostgreSQL `to_tsvector('arabic', ...)` with proper Arabic stemming
2. **Fuzzy Matching:** `pg_trgm` extension for typo tolerance (e.g., "تويتا" matches "تويوتا")
3. **Auto-suggestions:** As user types, show matching categories, brands, and recent searches
4. **Smart Query Parsing:** Backend should detect context from search terms:
   - "آيفون 15" → auto-filter: category=phones, brand=iPhone, model=15
   - "شقة مدينة نصر" → auto-filter: category=real_estate, area=Nasr City
   - "ذهب عيار 21" → auto-filter: category=gold, karat=21
5. **Recent Searches:** Store locally and show as suggestions
6. **Popular Searches:** Show trending searches from all users

### Filters System (Search Results Page)
After performing a search, the user can refine results:

```
┌─────────────────────────────────────┐
│ نتائج البحث: "سيارة تويوتا"        │
│                                     │
│ ── فلاتر سريعة (scrollable chips) ─ │
│ [القسم ▼] [السعر ▼] [الموقع ▼]     │
│ [الحالة ▼] [نوع البيع ▼]            │
│                                     │
│ ── ترتيب ──────────────────────────  │
│ [الأحدث] [الأقل سعراً] [الأعلى]    │
│ [الأقرب إليك 📍]                    │
│                                     │
│ ── النتائج ─────────────────────── │
│ [Ad Card] [Ad Card]                 │
│ [Ad Card] [Ad Card]                 │
│ ...infinite scroll...               │
└─────────────────────────────────────┘
```

### Filter by Category (Dynamic)
When a category is selected in filters, show category-specific filters:
- Cars: Brand, Model, Year range, Mileage range, Fuel type
- Real Estate: Type, Area range, Rooms, Finishing
- Phones: Brand, Storage, Condition
- etc.

### Search API Design
```typescript
// POST /api/search
interface SearchRequest {
  query?: string;           // Free text search
  category?: string;        // Category slug
  subcategory?: string;
  sale_type?: 'cash' | 'auction' | 'exchange';
  price_min?: number;
  price_max?: number;
  governorate?: string;
  city?: string;
  condition?: string;
  sort_by?: 'newest' | 'price_asc' | 'price_desc' | 'nearest';
  user_lat?: number;        // For distance sorting
  user_lng?: number;
  category_filters?: Record<string, any>;  // Dynamic category-specific filters
  page?: number;
  limit?: number;           // Default 20
}
```

---

## 🔨 AUCTION SYSTEM

### Auction Types
The seller chooses the auction type when creating an ad with sale_type = 'auction'.

### Timed Auction with Optional "Buy Now"
```
┌─────────────────────────────────┐
│  🔨 مزاد — تويوتا كورولا 2020   │
│                                 │
│  ⏰ ينتهي خلال: 23:45:12        │
│  ━━━━━━━━━━━━━━━━━━━━━━━░░░░░  │
│                                 │
│  💰 أعلى مزايدة: 280,000 جنيه   │
│  👤 Mohamed A.                  │
│  📊 عدد المزايدات: 15           │
│                                 │
│  ── سجل المزايدات ─────────────  │
│  Mohamed A.  280,000  منذ 5 د   │
│  Ahmed S.    275,000  منذ 12 د  │
│  Sara M.     270,000  منذ 30 د  │
│                                 │
│  [مزايدتك: _________ جنيه]      │
│  الحد الأدنى: 285,000 جنيه      │
│  [🔨 زايد الآن]                  │
│                                 │
│  ── أو ──                       │
│  [🛒 اشتري الآن بـ 350,000 جنيه] │
│  (ينهي المزاد فوراً)             │
└─────────────────────────────────┘
```

### Auction Rules
1. **Duration:** Seller picks 24, 48, or 72 hours
2. **Starting Price:** Set by seller (required)
3. **Buy Now Price:** Set by seller (optional) — if someone pays this, auction ends immediately
4. **Minimum Bid Increment:** Auto-calculated (2% of current highest bid, minimum 50 EGP)
5. **Anti-Sniping:** If a bid is placed in the last 5 minutes, extend the auction by 5 minutes
6. **Winner Notification:** When auction ends, both seller and winner get notified
7. **Auction States:** active → ended (winner) | ended (no bids) | bought_now | cancelled

### Auction Database Schema
```sql
-- Auction bids table
CREATE TABLE auction_bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id UUID REFERENCES ads(id) ON DELETE CASCADE,
  bidder_id UUID REFERENCES users(id),
  amount DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookup of highest bid
CREATE INDEX idx_bids_ad_amount ON auction_bids(ad_id, amount DESC);
```

### Real-time Auction Updates
Use Supabase Realtime to broadcast:
- New bid placed → update UI for all viewers
- Auction timer extended (anti-sniping)
- Auction ended → notify winner and seller

---

## 💬 CHAT SYSTEM

### In-App Chat
Simple, WhatsApp-like messaging between buyer and seller.

### Chat Features
1. **Text Messages:** Basic text messaging
2. **Image Sharing:** Send photos in chat
3. **Ad Reference:** Each chat is linked to a specific ad (shown at top of chat)
4. **Online Indicator:** Show if user was "متصل الآن" or "آخر ظهور منذ ..."
5. **Unread Counter:** Badge on chat tab
6. **Chat List:** Sorted by most recent message

### Chat UI
```
┌─────────────────────────────────┐
│ ← Mohamed Ahmed                 │
│    متصل الآن 🟢                 │
│ ┌─────────────────────────────┐ │
│ │📷 تويوتا كورولا — 350,000  │ │
│ └─────────────────────────────┘ │
│                                 │
│              السلام عليكم        │
│              السيارة لسه متاحة؟  │
│                          14:30  │
│                                 │
│  وعليكم السلام                  │
│  أيوا متاحة، تحب تيجي تعاينها؟  │
│  14:32                          │
│                                 │
│  ┌───────────────────────┐ [📷] │
│  │ اكتب رسالة...          │ [➤] │
│  └───────────────────────┘      │
└─────────────────────────────────┘
```

### WhatsApp Integration
Additionally, every ad detail page has a "تواصل عبر واتساب" button:
```typescript
const whatsappUrl = `https://wa.me/2${sellerPhone}?text=${encodeURIComponent(
  `مرحباً، أنا مهتم بإعلانك على مكسب: ${adTitle}\n${adUrl}`
)}`;
```

### Chat Database Schema
```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id UUID REFERENCES ads(id),
  buyer_id UUID REFERENCES users(id),
  seller_id UUID REFERENCES users(id),
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(ad_id, buyer_id)  -- One conversation per buyer per ad
);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id),
  content TEXT,
  image_url TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 💰 VOLUNTARY COMMISSION SYSTEM

### Philosophy
The commission is **voluntary and post-transaction**. The goal is to make users WANT to pay it, not force them.

### How It Works
1. When a deal is completed (buyer confirms receipt or auction ends), both parties see a prompt:
```
┌─────────────────────────────────┐
│  🎉 مبروك! تمت الصفقة           │
│                                 │
│  تويوتا كورولا 2020              │
│  💰 350,000 جنيه                 │
│                                 │
│  ── ادعم مكسب ──────────────────  │
│  مكسب تطبيق مجاني بالكامل.       │
│  لو الصفقة عجبتك، ساهم بعمولة   │
│  بسيطة تساعدنا نكبر ونخدمك      │
│  أحسن 🙏                        │
│                                 │
│  العمولة المقترحة: 200 جنيه      │
│  (1% من قيمة الصفقة)             │
│                                 │
│  [✅ ادفع 200 جنيه]              │
│  [💚 ادفع مبلغ تاني: ___]       │
│  [⏭️ لاحقاً]                    │
│  [❌ لا شكراً]                   │
└─────────────────────────────────┘
```

### Commission Calculation
```typescript
function calculateSuggestedCommission(transactionAmount: number): number {
  const percentage = transactionAmount * 0.01; // 1%
  const min = 10;   // Minimum 10 EGP
  const max = 200;  // Maximum 200 EGP
  return Math.min(Math.max(percentage, min), max);
}
```

### Commission Features
- **Gamification:** Show "داعم مكسب 💚" badge on profile for users who paid commission
- **Thank you:** Personalized thank you message after payment
- **No penalty:** Zero restrictions for not paying — the app works the same
- **Payment Method:** For MVP, show bank transfer details / Vodafone Cash / InstaPay
  - Later: Integrate payment gateway (Paymob, Fawry)

---

## 📊 DATABASE SCHEMA

### Core Tables

```sql
-- Enable extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone VARCHAR(11) UNIQUE NOT NULL,
  display_name VARCHAR(100),
  avatar_url TEXT,
  governorate VARCHAR(50),
  city VARCHAR(100),
  bio TEXT,
  is_commission_supporter BOOLEAN DEFAULT FALSE,
  total_ads_count INTEGER DEFAULT 0,
  rating DECIMAL(2,1) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories
CREATE TABLE categories (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,       -- Arabic name
  icon VARCHAR(10),                  -- Emoji
  slug VARCHAR(50) UNIQUE NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE
);

-- Subcategories
CREATE TABLE subcategories (
  id VARCHAR(50) PRIMARY KEY,
  category_id VARCHAR(50) REFERENCES categories(id),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50) NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE(category_id, slug)
);

-- Main Ads table
CREATE TABLE ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  
  -- Classification
  category_id VARCHAR(50) REFERENCES categories(id),
  subcategory_id VARCHAR(50) REFERENCES subcategories(id),
  sale_type VARCHAR(10) NOT NULL CHECK (sale_type IN ('cash', 'auction', 'exchange')),
  
  -- Content (auto-generated from fields)
  title VARCHAR(200) NOT NULL,
  description TEXT,
  
  -- Price
  price DECIMAL(12,2),              -- NULL for exchange-only
  is_negotiable BOOLEAN DEFAULT FALSE,
  
  -- Auction specific
  auction_start_price DECIMAL(12,2),
  auction_buy_now_price DECIMAL(12,2),
  auction_duration_hours INTEGER CHECK (auction_duration_hours IN (24, 48, 72)),
  auction_min_increment DECIMAL(12,2),
  auction_ends_at TIMESTAMPTZ,
  auction_status VARCHAR(20) DEFAULT 'active',
  auction_winner_id UUID REFERENCES public.users(id),
  
  -- Exchange specific
  exchange_description TEXT,        -- What the user wants in exchange
  exchange_accepts_price_diff BOOLEAN DEFAULT FALSE,
  exchange_price_diff DECIMAL(12,2),
  
  -- Category-specific fields (JSONB for flexibility)
  category_fields JSONB DEFAULT '{}',
  
  -- Location
  governorate VARCHAR(50),
  city VARCHAR(100),
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  
  -- Media
  images TEXT[] DEFAULT '{}',       -- Array of image URLs (max 5)
  
  -- Status
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'sold', 'exchanged', 'expired', 'deleted')),
  views_count INTEGER DEFAULT 0,
  favorites_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days')
);

-- Full-text search index
CREATE INDEX idx_ads_search ON ads USING GIN (
  to_tsvector('arabic', coalesce(title, '') || ' ' || coalesce(description, ''))
);

-- Trigram index for fuzzy matching
CREATE INDEX idx_ads_title_trgm ON ads USING GIN (title gin_trgm_ops);

-- Common query indexes
CREATE INDEX idx_ads_category ON ads(category_id, status, created_at DESC);
CREATE INDEX idx_ads_user ON ads(user_id, status);
CREATE INDEX idx_ads_location ON ads(governorate, city);
CREATE INDEX idx_ads_price ON ads(price) WHERE price IS NOT NULL;
CREATE INDEX idx_ads_sale_type ON ads(sale_type, status);
CREATE INDEX idx_ads_auction_ends ON ads(auction_ends_at) WHERE sale_type = 'auction' AND auction_status = 'active';

-- Favorites
CREATE TABLE favorites (
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  ad_id UUID REFERENCES ads(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, ad_id)
);

-- Auction bids
CREATE TABLE auction_bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id UUID REFERENCES ads(id) ON DELETE CASCADE,
  bidder_id UUID REFERENCES users(id),
  amount DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_bids_ad ON auction_bids(ad_id, amount DESC);

-- Conversations
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id UUID REFERENCES ads(id),
  buyer_id UUID REFERENCES users(id),
  seller_id UUID REFERENCES users(id),
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(ad_id, buyer_id)
);

-- Messages
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id),
  content TEXT,
  image_url TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_messages_conv ON messages(conversation_id, created_at DESC);

-- Commissions (voluntary payments)
CREATE TABLE commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id UUID REFERENCES ads(id),
  payer_id UUID REFERENCES users(id),
  amount DECIMAL(12,2) NOT NULL,
  payment_method VARCHAR(50),
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Governorates & Cities (seed data)
CREATE TABLE governorates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  name_en VARCHAR(50)
);

CREATE TABLE cities (
  id SERIAL PRIMARY KEY,
  governorate_id INTEGER REFERENCES governorates(id),
  name VARCHAR(100) NOT NULL,
  name_en VARCHAR(100)
);
```

### Row Level Security (RLS)
```sql
-- Users can read all ads but only edit their own
ALTER TABLE ads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ads are viewable by everyone" ON ads
  FOR SELECT USING (status != 'deleted');

CREATE POLICY "Users can create their own ads" ON ads
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ads" ON ads
  FOR UPDATE USING (auth.uid() = user_id);

-- Messages: only participants can see
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chat participants can view messages" ON messages
  FOR SELECT USING (
    conversation_id IN (
      SELECT id FROM conversations
      WHERE buyer_id = auth.uid() OR seller_id = auth.uid()
    )
  );

CREATE POLICY "Chat participants can send messages" ON messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    conversation_id IN (
      SELECT id FROM conversations
      WHERE buyer_id = auth.uid() OR seller_id = auth.uid()
    )
  );
```

---

## 🏠 HOME PAGE & FEED

### Home Page Layout
```
┌─────────────────────────────────┐
│  مكسب 💚                  [🔔]  │
│                                 │
│  ┌─────────────────────────────┐│
│  │ 🔍 ابحث في مكسب...          ││
│  └─────────────────────────────┘│
│                                 │
│  ── الأقسام ───────────────────  │
│  [🚗][🏠][📱][👗][♻️][💰]      │
│  [💎][🏠][🪑][🎮][🔧][🛠️]     │
│                                 │
│  ── 🔥 عروض مقترحة ليك ────────  │
│  (personalized recommendations) │
│  ┌────────┐ ┌────────┐ ┌─────┐ │
│  │ item   │ │ item   │ │item │ │
│  │ 💵نقدي │ │ 🔨مزاد │ │🔄بدل│ │
│  └────────┘ └────────┘ └─────┘ │
│  ← اسحب لمزيد                  │
│                                 │
│  ── 🔨 مزادات تناسبك ──────────  │
│  ┌────────────────────────────┐ │
│  │ Horizontal scrollable      │ │
│  │ matching auction cards     │ │
│  └────────────────────────────┘ │
│                                 │
│  ── إعلانات جديدة ─────────────  │
│  ┌─────┐ ┌─────┐               │
│  │ Ad  │ │ Ad  │               │
│  │Card │ │Card │               │
│  └─────┘ └─────┘               │
│  ┌─────┐ ┌─────┐               │
│  │ Ad  │ │ Ad  │               │
│  └─────┘ └─────┘               │
│  ... infinite scroll ...        │
│                                 │
│  [🏠] [🔍] [+إعلان] [💬] [👤]  │
└─────────────────────────────────┘
```

### Ad Card Component
```
┌───────────────────────┐
│ 📷 [Image]            │
│                       │
│ تويوتا كورولا 2020    │
│ 350,000 جنيه 💵       │
│ 📍 القاهرة — مدينة نصر │
│ ⏰ منذ 3 ساعات    [♡] │
└───────────────────────┘
```

For auction cards, add timer:
```
│ 🔨 أعلى مزايدة: 280,000│
│ ⏰ متبقي: 12:30:45     │
```

For exchange cards:
```
│ 🔄 للتبديل              │
│ عايز: آيفون 15          │
```

---

## 📱 AD DETAIL PAGE

```
┌─────────────────────────────────┐
│  ← [share] [♡] [⋮]             │
│                                 │
│  ┌─────────────────────────────┐│
│  │  📷 Image Gallery           ││
│  │  (swipeable, 1/5)          ││
│  └─────────────────────────────┘│
│                                 │
│  💰 350,000 جنيه                │
│  💵 بيع نقدي — قابل للتفاوض     │
│                                 │
│  تويوتا كورولا 2020 — 45,000 كم │
│                                 │
│  ── المواصفات ─────────────────  │
│  الماركة:     تويوتا            │
│  الموديل:    كورولا            │
│  السنة:      2020              │
│  الكيلومتراج: 45,000 كم        │
│  اللون:      أبيض              │
│  الوقود:     بنزين             │
│  الناقل:     أوتوماتيك         │
│                                 │
│  ── الوصف ─────────────────────  │
│  سيارة تويوتا كورولا موديل      │
│  2020، مسافة 45,000 كم...      │
│                                 │
│  ── الموقع ────────────────────  │
│  📍 القاهرة — مدينة نصر         │
│                                 │
│  ── البائع ────────────────────  │
│  👤 Mohamed Ahmed               │
│  ⭐ عضو منذ 2024 — 15 إعلان     │
│                                 │
│  ⏰ نُشر منذ 3 ساعات            │
│  👁 245 مشاهدة                  │
│                                 │
│  ┌─────────────────────────────┐│
│  │[💬 شات] [📱واتساب] [📞اتصل]││
│  └─────────────────────────────┘│
└─────────────────────────────────┘
```

---

## 🔔 NOTIFICATIONS

### Types
1. **Chat:** New message received
2. **Auction:** New bid on your item / You've been outbid / Auction ending soon / Auction ended
3. **Favorites:** Price drop on saved item
4. **Recommendations:** New matching items for your searches/ads
5. **System:** Welcome, profile reminder, ad expiry warning

### Implementation
- **Push Notifications:** PWA Web Push API (with user permission)
- **In-App:** Notification bell icon with unread count + dropdown list
- **Database:** Store in notifications table for history

---

## 🧠 SMART RECOMMENDATIONS ENGINE (Proactive Suggestions)

### Philosophy
مكسب لا ينتظر المستخدم — مكسب **يسبقه بخطوة**. التطبيق يعرف إيه اللي المستخدم بيدور عليه ويقدمله عروض مناسبة تلقائياً من كل أنواع البيع (نقدي، مزاد، تبديل).

### How It Works — Data Signals
The engine collects user behavior signals to build a "user interest profile":

```typescript
interface UserInterestSignal {
  signal_type: 'search' | 'view' | 'favorite' | 'ad_created' | 'bid_placed' | 'chat_initiated';
  category_id: string;
  subcategory_id?: string;
  keywords: string[];           // Extracted from search query or ad title
  price_range?: { min: number; max: number };
  category_filters?: Record<string, any>;  // Brand, model, year, etc.
  governorate?: string;
  city?: string;
  timestamp: Date;
  weight: number;               // How strong this signal is (bid > favorite > view)
}
```

### Signal Weights (Priority)
| Signal | Weight | Reasoning |
|---|---|---|
| Placed a bid on auction | 10 | Highest intent — willing to pay |
| Started a chat about an ad | 8 | Very high intent — actively negotiating |
| Created an ad (exchange type) | 8 | Actively looking for specific items |
| Added to favorites | 6 | Strong interest, saved for later |
| Searched with filters | 5 | Actively looking |
| Viewed ad detail page | 3 | Browsing with interest |
| Viewed category page | 1 | General interest |

### Recommendation Types

#### 1. 🔥 "عروض مقترحة ليك" — Personalized Feed Section (Home Page)
Based on accumulated user signals, show a dedicated section on home page:

```
┌──────────────────────────────────────┐
│  🔥 عروض مقترحة ليك                  │
│  (بناءً على اهتماماتك)               │
│                                      │
│  ┌────────┐ ┌────────┐ ┌────────┐   │
│  │آيفون 15│ │آيفون 14│ │سامسونج │   │
│  │مزاد 🔨 │ │نقدي 💵 │ │تبديل 🔄│   │
│  │8,500 ج │ │12,000ج │ │بآيفون  │   │
│  └────────┘ └────────┘ └────────┘   │
│  ← اسحب لمزيد من العروض              │
└──────────────────────────────────────┘
```

**Logic:**
```sql
-- Get recommendations based on user's recent interests
-- This runs as a Supabase Edge Function or database function

CREATE OR REPLACE FUNCTION get_recommendations(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 20
) RETURNS SETOF ads AS $$
BEGIN
  RETURN QUERY
  WITH user_interests AS (
    -- Aggregate user signals from last 30 days
    SELECT 
      category_id,
      subcategory_id,
      signal_data->>'brand' as brand,
      AVG((signal_data->>'price_min')::numeric) as avg_price_min,
      AVG((signal_data->>'price_max')::numeric) as avg_price_max,
      array_agg(DISTINCT governorate) FILTER (WHERE governorate IS NOT NULL) as governorates,
      SUM(weight) as total_weight
    FROM user_signals
    WHERE user_id = p_user_id
      AND created_at > NOW() - INTERVAL '30 days'
    GROUP BY category_id, subcategory_id, signal_data->>'brand'
    ORDER BY total_weight DESC
    LIMIT 5  -- Top 5 interest clusters
  )
  SELECT DISTINCT ON (a.id) a.*
  FROM ads a
  INNER JOIN user_interests ui ON a.category_id = ui.category_id
  WHERE a.status = 'active'
    AND a.user_id != p_user_id  -- Don't recommend own ads
    AND (
      -- Match by subcategory if available
      ui.subcategory_id IS NULL OR a.subcategory_id = ui.subcategory_id
    )
    AND (
      -- Match by price range if available (with 30% flexibility)
      ui.avg_price_min IS NULL OR 
      a.price BETWEEN ui.avg_price_min * 0.7 AND ui.avg_price_max * 1.3
    )
  ORDER BY a.id, ui.total_weight DESC, a.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;
```

#### 2. 🔄 "ممكن تبدّل بـ..." — Exchange Matching (Ad Detail Page)
When a user creates an EXCHANGE ad, automatically find matching ads:

```
┌──────────────────────────────────────┐
│  📱 إعلانك: آيفون 14 برو — للتبديل   │
│  عايز تبدل بـ: سامسونج S24           │
│                                      │
│  🔄 إعلانات ممكن تتبدل معاها:        │
│  ┌────────────────────────────────┐  │
│  │ سامسونج S24 Ultra — للتبديل    │  │
│  │ عايز: آيفون 14 أو 15           │  │
│  │ 📍 القاهرة    [💬 تواصل]       │  │
│  └────────────────────────────────┘  │
│  ┌────────────────────────────────┐  │
│  │ سامسونج S24 — بيع نقدي        │  │
│  │ 💰 25,000 جنيه (قابل للتبديل)  │  │
│  │ 📍 الجيزة     [💬 تواصل]       │  │
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
```

**Matching Logic:**
```typescript
// When user creates exchange ad for "iPhone 14" wanting "Samsung S24"
// Find:
// 1. Exchange ads offering Samsung S24 wanting iPhones (PERFECT MATCH — highlight these)
// 2. Cash/auction ads for Samsung S24 in similar price range
// 3. Any exchange ads offering Samsung phones wanting iPhones

async function findExchangeMatches(ad: Ad) {
  const myItem = extractItemIdentity(ad);         // { brand: 'Apple', model: 'iPhone 14' }
  const wantedItem = parseExchangeDescription(ad); // { brand: 'Samsung', model: 'S24' }
  
  // Perfect matches: someone offering what I want AND wanting what I have
  const perfectMatches = await supabase
    .from('ads')
    .select('*')
    .eq('sale_type', 'exchange')
    .eq('status', 'active')
    .textSearch('title', wantedItem.searchTerms)
    .textSearch('exchange_description', myItem.searchTerms);
  
  // Partial matches: someone selling what I want (any sale type)
  const partialMatches = await supabase
    .from('ads')
    .select('*')
    .eq('status', 'active')
    .eq('category_id', ad.category_id)
    .textSearch('title', wantedItem.searchTerms)
    .neq('id', ad.id);
  
  return { perfectMatches, partialMatches };
}
```

#### 3. 🔨 "مزادات تناسبك" — Auction Alerts (Home + Notifications)
When there's an active auction matching user interests, proactively alert them:

```
┌──────────────────────────────────────┐
│  🔨 مزادات تناسب اهتماماتك           │
│                                      │
│  ┌────────────────────────────────┐  │
│  │ 🔥 تويوتا كورولا 2021          │  │
│  │ سعر الافتتاح: 250,000 جنيه     │  │
│  │ أعلى مزايدة: 280,000 جنيه      │  │
│  │ ⏰ متبقي: 5:30:00               │  │
│  │ 💡 أنت بحثت عن سيارات تويوتا    │  │
│  │    من قبل                       │  │
│  │ [🔨 زايد دلوقتي]               │  │
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
```

**Push Notification:**
```
🔨 مزاد جديد يناسبك!
تويوتا كورولا 2021 — يبدأ من 250,000 جنيه
المزاد بينتهي خلال 24 ساعة
[افتح المزاد]
```

#### 4. 🎯 "شبيه اللي بتدور عليه" — Search Results Enhancement
After showing search results, add a section for related items the user might not have thought of:

```
┌──────────────────────────────────────┐
│  بحثت عن: "آيفون 15 برو"            │
│                                      │
│  ── نتائج البحث (12 نتيجة) ────────  │
│  [normal search results...]          │
│                                      │
│  ── 🎯 شبيه اللي بتدور عليه ───────  │
│  ┌────────────────────────────────┐  │
│  │ آيفون 15 (مش برو) — 18,000 ج  │  │
│  │ 💵 نقدي — مستعمل زيرو          │  │
│  └────────────────────────────────┘  │
│  ┌────────────────────────────────┐  │
│  │ آيفون 14 برو ماكس — 🔨 مزاد   │  │
│  │ أعلى مزايدة: 16,500 جنيه       │  │
│  └────────────────────────────────┘  │
│  ┌────────────────────────────────┐  │
│  │ سامسونج S24 Ultra — 🔄 تبديل  │  │
│  │ عايز يبدل بـ آيفون 15          │  │
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
```

**Logic:** Relax the search criteria progressively:
1. Same model, different variant (e.g., non-Pro version)
2. Same brand, one model older/newer
3. Competing brand, same price range
4. Exchange ads where someone WANTS what the user is searching for

#### 5. 📢 "إعلانك ممكن يهم دول" — Seller Insights
When a seller creates an ad, show them how many potential buyers exist:

```
┌──────────────────────────────────────┐
│  ✅ تم نشر إعلانك!                   │
│                                      │
│  📊 إعلانك ممكن يوصل لـ:             │
│  👥 127 شخص بيدوروا على تويوتا       │
│  🔍 45 شخص بيدوروا على كورولا تحديداً │
│  📍 83 شخص في القاهرة مهتمين بسيارات  │
│                                      │
│  💡 نصيحة: أضف صور أكتر لزيادة       │
│     المشاهدات بنسبة 3x              │
└──────────────────────────────────────┘
```

### Recommendation Database Schema

```sql
-- User behavior signals for recommendations
CREATE TABLE user_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  signal_type VARCHAR(20) NOT NULL CHECK (
    signal_type IN ('search', 'view', 'favorite', 'ad_created', 'bid_placed', 'chat_initiated')
  ),
  category_id VARCHAR(50) REFERENCES categories(id),
  subcategory_id VARCHAR(50),
  ad_id UUID REFERENCES ads(id) ON DELETE SET NULL,
  signal_data JSONB DEFAULT '{}',   -- Flexible: keywords, filters, brand, model, price range, etc.
  governorate VARCHAR(50),
  weight INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast recommendation queries
CREATE INDEX idx_signals_user_recent ON user_signals(user_id, created_at DESC);
CREATE INDEX idx_signals_user_category ON user_signals(user_id, category_id, weight DESC);
CREATE INDEX idx_signals_data ON user_signals USING GIN (signal_data);

-- Precomputed user interest profiles (updated periodically by background worker)
CREATE TABLE user_interest_profiles (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  interests JSONB NOT NULL DEFAULT '[]',
  -- Example: [
  --   { "category": "cars", "brand": "Toyota", "price_range": [200000, 400000], "score": 25 },
  --   { "category": "phones", "brand": "Apple", "price_range": [10000, 25000], "score": 18 }
  -- ]
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Exchange matching index (for finding mutual exchange opportunities)
CREATE INDEX idx_ads_exchange_search ON ads 
  USING GIN (to_tsvector('arabic', coalesce(exchange_description, '')))
  WHERE sale_type = 'exchange' AND status = 'active';
```

### Signal Collection Points (Where to Track)

```typescript
// lib/hooks/useTrackSignal.ts
// This hook is used across the app to silently collect user behavior

export function useTrackSignal() {
  const track = async (signal: Omit<UserSignal, 'id' | 'created_at'>) => {
    // Don't block UI — fire and forget
    supabase.from('user_signals').insert(signal).then();
  };
  
  return { track };
}

// Usage examples:

// 1. On search
track({
  signal_type: 'search',
  category_id: filters.category,
  signal_data: { query: searchQuery, filters: appliedFilters },
  weight: 5
});

// 2. On ad detail view (after 3 seconds — to filter drive-by views)
track({
  signal_type: 'view',
  category_id: ad.category_id,
  ad_id: ad.id,
  signal_data: { brand: ad.category_fields.brand, price: ad.price },
  weight: 3
});

// 3. On favorite
track({
  signal_type: 'favorite',
  category_id: ad.category_id,
  ad_id: ad.id,
  signal_data: { brand: ad.category_fields.brand, price: ad.price },
  weight: 6
});

// 4. On bid placed
track({
  signal_type: 'bid_placed',
  category_id: ad.category_id,
  ad_id: ad.id,
  signal_data: { bid_amount: bidAmount },
  weight: 10
});

// 5. On chat initiated
track({
  signal_type: 'chat_initiated',
  category_id: ad.category_id,
  ad_id: ad.id,
  signal_data: { brand: ad.category_fields.brand },
  weight: 8
});
```

### Display Rules for Recommendations
1. **Diversity:** Never show more than 3 ads from the same sale_type in a row — mix cash, auction, and exchange
2. **Freshness:** Prioritize ads created in the last 7 days
3. **No Duplicates:** Never show an ad the user has already viewed in detail
4. **Location Aware:** Boost ads from user's governorate but don't exclude others
5. **Auction Urgency:** Auctions ending within 6 hours get a "🔥 ينتهي قريباً" badge and higher priority
6. **Exchange Highlighting:** When a perfect exchange match is found (A wants B, B wants A), show a special "🎯 تطابق مثالي!" badge
7. **Minimum Quality:** Only recommend ads with at least 1 photo
8. **Fallback:** If not enough signals, show popular/trending ads in user's governorate

---

## ⚡ PERFORMANCE REQUIREMENTS

1. **Lighthouse Score:** Target 90+ on mobile
2. **First Contentful Paint:** < 1.5 seconds
3. **Time to Interactive:** < 3 seconds
4. **Image Optimization:** WebP format, lazy loading, blur placeholder
5. **Bundle Size:** Code splitting per page, dynamic imports
6. **Caching:** Service worker caches static assets, API responses cached with SWR
7. **Infinite Scroll:** Virtual list for long feeds (react-window or similar)
8. **Offline Support:** Browse cached content, queue ad creation for when back online

---

## 🔒 SECURITY REQUIREMENTS

1. **Input Sanitization:** All user inputs sanitized server-side
2. **Rate Limiting:** On OTP requests (max 3 per hour per phone), on ad creation (max 10 per day)
3. **Image Moderation:** Check image size, type, and basic NSFW filter (future)
4. **RLS:** All Supabase tables have Row Level Security policies
5. **Phone Verification:** All users must verify phone before any action
6. **XSS Prevention:** No dangerouslySetInnerHTML, use proper sanitization
7. **CSRF:** Supabase handles auth tokens securely

---

---

## 📐 IMPORTANT CONVENTIONS

1. **All UI text in Egyptian Arabic** — not formal Arabic. Use "إيه" not "ماذا", "عايز" not "أريد"
2. **Currency format:** Always "جنيه" not "ج.م." — with comma separator: 350,000 جنيه
3. **Date format:** "منذ 3 ساعات" / "منذ يومين" / "15 يناير 2025" (relative for recent, absolute for old)
4. **Phone format:** Always displayed as 01X-XXXX-XXXX
5. **No English in UI** — even technical terms should be Arabic or Arabized
6. **Loading states:** Always show skeleton loaders, never blank screens
7. **Error messages:** Friendly and helpful in Egyptian Arabic — "حصل مشكلة، جرب تاني" not "Error 500"
8. **Empty states:** Always show illustration + helpful message + CTA

---

## 🚀 GETTING STARTED (for Claude Code)

```bash
# 1. Create the project
npx create-next-app@latest maksab --typescript --tailwind --app --src-dir

# 2. Install core dependencies
cd maksab
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs zustand react-hook-form zod next-pwa

# 3. Install UI dependencies
npm install framer-motion react-hot-toast lucide-react swiper

# 4. Setup Supabase
npx supabase init
npx supabase db push

# 5. Configure environment variables
# .env.local:
# NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

**START WITH:** Set up the project structure, install dependencies, configure Tailwind with RTL support and brand colors, create the database schema with all tables including the recommendations engine tables, and seed the governorates/cities/categories data.

---

> **Note to Claude Code:** This is a PWA that will later be converted to React Native. Keep all business logic in shared hooks and utilities, not in page components. Use a clean API layer so the React Native version can reuse the same Supabase logic. Prioritize mobile UX — every screen should look and feel like a native app. The user is not a developer, so make the codebase clean, well-documented, and easy to maintain.
