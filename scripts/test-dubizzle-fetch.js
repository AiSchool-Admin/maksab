const testFetch = async () => {
  console.log('=== Dubizzle Fetch Test ===');
  console.log('Time:', new Date().toISOString());

  const url = 'https://www.dubizzle.com.eg/mobile-phones-tablets-accessories-numbers/mobile-phones/alexandria/';

  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'ar,en;q=0.9',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    console.log('HTTP Status:', response.status);
    console.log('Content-Type:', response.headers.get('content-type'));
    console.log('Content-Length:', response.headers.get('content-length'));

    const html = await response.text();
    console.log('HTML length:', html.length);
    console.log('Has <article>:', html.includes('<article'));
    console.log('Has "ج.م":', html.includes('ج.م'));
    console.log('Has "منذ":', html.includes('منذ'));

    // عدد الـ articles
    const articleCount = (html.match(/<article/g) || []).length;
    console.log('Article count:', articleCount);

    // أول 500 حرف
    console.log('First 500 chars:', html.substring(0, 500));

    if (response.status === 200 && articleCount > 0) {
      console.log('\n✅ نجاح! يقدر يجلب من دوبيزل!');
      console.log('عدد الإعلانات:', articleCount);
      console.log('→ يمكن أتمتة المحرك 100% على Railway');
    } else if (response.status === 200 && articleCount === 0) {
      console.log('\n⚠️ الصفحة رجعت 200 لكن بدون articles');
      console.log('→ ممكن JavaScript rendering أو صفحة مختلفة');
    } else {
      console.log('\n❌ فشل! Status:', response.status);
      console.log('→ محظور — هنستخدم Chrome Extension');
    }
  } catch (error) {
    console.log('\n❌ خطأ:', error.message);
  }
};

testFetch();
