/**
 * اختبارات محلل دوبيزل — JSON و HTML
 */
import {
  parseDubizzleList,
  parseDubizzleDetail,
} from "@/lib/crm/harvester/parsers/dubizzle";

describe("parseDubizzleList — JSON mode", () => {
  it("يحلل مصفوفة data من API", () => {
    const json = JSON.stringify({
      data: [
        {
          title: "آيفون 15 برو ماكس",
          price: 45000,
          url: "/ar/mobiles/iphone-15-pro-max-123",
          images: [{ url: "https://images.dubizzle.com.eg/pic.jpg" }],
          location: { name: "القاهرة" },
          created_at: "منذ ساعة",
          user: {
            name: "محمد أحمد",
            id: "user123",
            is_verified: true,
            is_business: false,
          },
        },
      ],
    });

    const listings = parseDubizzleList(json);
    expect(listings).toHaveLength(1);
    expect(listings[0].title).toBe("آيفون 15 برو ماكس");
    expect(listings[0].price).toBe(45000);
    expect(listings[0].url).toContain("dubizzle.com.eg");
    expect(listings[0].sellerName).toBe("محمد أحمد");
    expect(listings[0].isVerified).toBe(true);
    expect(listings[0].currency).toBe("EGP");
  });

  it("يحلل مصفوفة results", () => {
    const json = JSON.stringify({
      results: [
        {
          title: "سيارة هيونداي",
          price: { value: 250000 },
          url: "https://www.dubizzle.com.eg/cars/hyundai-123",
          location: "الجيزة",
        },
      ],
    });

    const listings = parseDubizzleList(json);
    expect(listings).toHaveLength(1);
    expect(listings[0].price).toBe(250000);
    expect(listings[0].location).toBe("الجيزة");
  });

  it("يحلل مصفوفة ads", () => {
    const json = JSON.stringify({
      ads: [
        {
          title: "شقة للإيجار",
          price: "5000",
          slug: "apartments/flat-123",
        },
      ],
    });

    const listings = parseDubizzleList(json);
    expect(listings).toHaveLength(1);
    expect(listings[0].price).toBe(5000);
  });

  it("يتعامل مع السعر ككائن بـ amount", () => {
    const json = JSON.stringify({
      data: [
        {
          title: "لابتوب",
          price: { amount: 15000 },
          url: "/laptops/laptop-1",
        },
      ],
    });

    const listings = parseDubizzleList(json);
    expect(listings[0].price).toBe(15000);
  });

  it("يتعامل مع السعر كنص", () => {
    const json = JSON.stringify({
      data: [
        {
          title: "تابلت",
          price: "8,500",
          url: "/tablets/tab-1",
        },
      ],
    });

    const listings = parseDubizzleList(json);
    expect(listings[0].price).toBe(8500);
  });

  it("يتعرف على إعلان مميز", () => {
    const json = JSON.stringify({
      data: [
        {
          title: "موبايل",
          price: 5000,
          url: "/phones/phone-1",
          is_featured: true,
        },
      ],
    });

    const listings = parseDubizzleList(json);
    expect(listings[0].isFeatured).toBe(true);
  });

  it("يتعرف على قابل للتفاوض", () => {
    const json = JSON.stringify({
      data: [
        {
          title: "تلفزيون",
          price: 3000,
          url: "/tvs/tv-1",
          is_negotiable: true,
        },
      ],
    });

    const listings = parseDubizzleList(json);
    expect(listings[0].isNegotiable).toBe(true);
  });

  it("يتعرف على تبديل من العنوان", () => {
    const json = JSON.stringify({
      data: [
        {
          title: "آيفون 14 للبدل بسامسونج",
          price: 15000,
          url: "/phones/iphone-exchange",
        },
      ],
    });

    const listings = parseDubizzleList(json);
    expect(listings[0].supportsExchange).toBe(true);
  });

  it("يتعامل مع الصورة كنص مباشر", () => {
    const json = JSON.stringify({
      data: [
        {
          title: "كرسي",
          price: 500,
          url: "/furniture/chair-1",
          image: "https://images.dubizzle.com.eg/chair.jpg",
        },
      ],
    });

    const listings = parseDubizzleList(json);
    expect(listings[0].thumbnailUrl).toBe("https://images.dubizzle.com.eg/chair.jpg");
  });

  it("يتعامل مع thumbnail", () => {
    const json = JSON.stringify({
      data: [
        {
          title: "طاولة",
          price: 1000,
          url: "/furniture/table-1",
          thumbnail: "https://images.dubizzle.com.eg/table.jpg",
        },
      ],
    });

    const listings = parseDubizzleList(json);
    expect(listings[0].thumbnailUrl).toBe("https://images.dubizzle.com.eg/table.jpg");
  });

  it("يتجاهل عنصر بدون عنوان", () => {
    const json = JSON.stringify({
      data: [
        { price: 5000, url: "/item-1" },
        { title: "عنصر صحيح", price: 3000, url: "/item-2" },
      ],
    });

    const listings = parseDubizzleList(json);
    expect(listings).toHaveLength(1);
    expect(listings[0].title).toBe("عنصر صحيح");
  });

  it("يتجاهل عنصر بدون URL", () => {
    const json = JSON.stringify({
      data: [{ title: "بدون رابط", price: 5000 }],
    });

    const listings = parseDubizzleList(json);
    expect(listings).toHaveLength(0);
  });

  it("يرجع مصفوفة فارغة لـ JSON فارغ", () => {
    expect(parseDubizzleList("{}")).toEqual([]);
  });

  it("يرجع مصفوفة فارغة لو data مش مصفوفة", () => {
    expect(parseDubizzleList('{"data": "not array"}')).toEqual([]);
  });

  it("يبني URL كامل من slug", () => {
    const json = JSON.stringify({
      data: [
        {
          title: "عنصر",
          price: 100,
          slug: "category/item-slug",
        },
      ],
    });

    const listings = parseDubizzleList(json);
    expect(listings[0].url).toBe("https://www.dubizzle.com.eg/category/item-slug");
  });

  it("يبني URL من id", () => {
    const json = JSON.stringify({
      data: [
        {
          title: "عنصر",
          price: 100,
          id: "abc123",
        },
      ],
    });

    const listings = parseDubizzleList(json);
    expect(listings[0].url).toBe("https://www.dubizzle.com.eg/listing/abc123");
  });

  it("يستخرج معلومات البائع كاملة", () => {
    const json = JSON.stringify({
      data: [
        {
          title: "سلعة",
          price: 1000,
          url: "/item-1",
          user: {
            name: "أحمد",
            display_name: "أحمد محمود",
            id: "u456",
            verified: true,
            account_type: "business",
          },
        },
      ],
    });

    const listings = parseDubizzleList(json);
    // display_name is checked after name
    expect(listings[0].sellerName).toBe("أحمد");
    expect(listings[0].sellerProfileUrl).toBe("https://www.dubizzle.com.eg/profile/u456");
    expect(listings[0].isVerified).toBe(true);
    expect(listings[0].isBusiness).toBe(true);
  });

  it("يستخرج الموقع من كائن location مع region_name_ar", () => {
    const json = JSON.stringify({
      data: [
        {
          title: "سلعة",
          price: 500,
          url: "/item-1",
          location: { region_name_ar: "مدينة نصر" },
        },
      ],
    });

    const listings = parseDubizzleList(json);
    expect(listings[0].location).toBe("مدينة نصر");
  });
});

describe("parseDubizzleList — HTML mode", () => {
  it("يحلل روابط إعلانات من HTML", () => {
    const html = `
      <div>
        <a href="/ar/mobiles/samsung-s24-ultra-12345" aria-label="سامسونج S24 الترا" title="سامسونج S24 الترا">
          <img src="https://images.dubizzle.com.eg/phone.jpg" />
          <span>25,000 جنيه</span>
        </a>
      </div>
    `;

    const listings = parseDubizzleList(html);
    expect(listings.length).toBeGreaterThanOrEqual(1);
    expect(listings[0].title).toBe("سامسونج S24 الترا");
    expect(listings[0].url).toContain("dubizzle.com.eg");
    expect(listings[0].price).toBe(25000);
  });

  it("يتجاهل روابط البحث وتسجيل الدخول", () => {
    const html = `
      <a href="/ar/search?q=test">بحث</a>
      <a href="/login">دخول</a>
    `;

    const listings = parseDubizzleList(html);
    expect(listings).toHaveLength(0);
  });

  it("يرجع مصفوفة فارغة لـ HTML فارغ", () => {
    expect(parseDubizzleList("")).toEqual([]);
  });

  it("لا يكرر نفس الرابط", () => {
    const html = `
      <a href="/ar/cars/toyota-corolla-123" aria-label="تويوتا كورولا">test</a>
      <a href="/ar/cars/toyota-corolla-123" aria-label="تويوتا كورولا">test2</a>
    `;

    const listings = parseDubizzleList(html);
    expect(listings).toHaveLength(1);
  });
});

describe("parseDubizzleDetail — JSON mode", () => {
  it("يحلل تفاصيل إعلان من JSON", () => {
    const json = JSON.stringify({
      description: "آيفون 15 برو ماكس 256 جيجا، حالة ممتازة، مع الضمان",
      images: [
        { url: "https://images.dubizzle.com.eg/img1.jpg" },
        { url: "https://images.dubizzle.com.eg/img2.jpg" },
      ],
      parameters: [
        { label: "الحالة", value_label: "مستعمل" },
        { label: "المساحة", value: "256GB" },
      ],
    });

    const details = parseDubizzleDetail(json);
    expect(details.description).toContain("آيفون 15 برو ماكس");
    expect(details.allImageUrls).toHaveLength(2);
    expect(details.mainImageUrl).toBe("https://images.dubizzle.com.eg/img1.jpg");
    expect(details.specifications["الحالة"]).toBe("مستعمل");
    expect(details.specifications["المساحة"]).toBe("256GB");
    expect(details.condition).toBe("مستعمل");
    expect(details.hasWarranty).toBe(true);
  });

  it("يتعرف على الضمان من الوصف", () => {
    const json = JSON.stringify({
      description: "منتج جديد مع ضمان سنة",
    });

    const details = parseDubizzleDetail(json);
    expect(details.hasWarranty).toBe(true);
  });

  it("يتعامل مع صور كنصوص مباشرة", () => {
    const json = JSON.stringify({
      title: "سلعة",
      images: [
        "https://images.dubizzle.com.eg/a.jpg",
        "https://images.dubizzle.com.eg/b.jpg",
      ],
    });

    const details = parseDubizzleDetail(json);
    expect(details.allImageUrls).toHaveLength(2);
  });

  it("يرجع نتيجة فارغة لـ JSON غير مطابق", () => {
    const json = JSON.stringify({ random: "data" });

    const details = parseDubizzleDetail(json);
    expect(details.description).toBe("");
    expect(details.allImageUrls).toHaveLength(0);
  });
});

describe("parseDubizzleDetail — HTML mode", () => {
  it("يستخرج الوصف من HTML", () => {
    const html = `
      <html>
        <div class="listing-description">
          <p>سيارة تويوتا كورولا 2020 أوتوماتيك</p>
        </div>
      </html>
    `;

    const details = parseDubizzleDetail(html);
    expect(details.description).toContain("تويوتا كورولا");
  });

  it("يستخرج الصور من HTML", () => {
    const html = `
      <img src="https://images.dubizzle.com.eg/photos/car1.jpg" />
      <img src="https://images.dubizzle.com.eg/photos/car2.webp" />
    `;

    const details = parseDubizzleDetail(html);
    expect(details.allImageUrls.length).toBeGreaterThanOrEqual(2);
    expect(details.mainImageUrl).toContain("dubizzle.com.eg");
  });

  it("لا يكرر نفس الصورة", () => {
    const html = `
      <img src="https://images.dubizzle.com.eg/photos/same.jpg" />
      <img src="https://images.dubizzle.com.eg/photos/same.jpg" />
    `;

    const details = parseDubizzleDetail(html);
    expect(details.allImageUrls).toHaveLength(1);
  });

  it("يستخرج المواصفات من جدول", () => {
    const html = `
      <table>
        <tr><td>الماركة</td><td>تويوتا</td></tr>
        <tr><td>الموديل</td><td>كورولا</td></tr>
      </table>
    `;

    const details = parseDubizzleDetail(html);
    expect(details.specifications["الماركة"]).toBe("تويوتا");
    expect(details.specifications["الموديل"]).toBe("كورولا");
  });

  it("يستخرج اسم البائع", () => {
    const html = `
      <span class="seller-name">محمد علي</span>
    `;

    const details = parseDubizzleDetail(html);
    expect(details.sellerName).toBe("محمد علي");
  });

  it("يستخرج رابط بروفايل البائع", () => {
    const html = `
      <a href="/ar/profile/user123">الملف الشخصي</a>
    `;

    const details = parseDubizzleDetail(html);
    expect(details.sellerProfileUrl).toBe("https://www.dubizzle.com.eg/ar/profile/user123");
  });

  it("يستخرج تاريخ عضوية البائع", () => {
    const html = `<span>عضو منذ 2022</span>`;

    const details = parseDubizzleDetail(html);
    expect(details.sellerMemberSince).toBe("2022");
  });

  it("يرجع قيم فارغة لـ HTML بدون بيانات", () => {
    const details = parseDubizzleDetail("<html><body></body></html>");
    expect(details.description).toBe("");
    expect(details.allImageUrls).toHaveLength(0);
    expect(details.sellerName).toBeNull();
  });
});
