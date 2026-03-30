-- ══════════════════════════════════════════════
-- Migration 00099: Update ALL scope URLs with correct links
-- Based on verified URLs from browser
-- ══════════════════════════════════════════════

-- ═══ سيارات ═══

-- Hatla2ee: /ar/car/city/alexandria → /ar/car/search?city=12
UPDATE ahe_scopes
SET base_url = 'https://eg.hatla2ee.com/ar/car/search?city=12',
    updated_at = NOW()
WHERE code = 'HAT-CAR-ALEX';

-- OpenSooq: keep Arabic URL (already correct — all vehicles for sale)
UPDATE ahe_scopes
SET base_url = 'https://eg.opensooq.com/ar/%D8%A7%D9%84%D8%A5%D8%B3%D9%83%D9%86%D8%AF%D8%B1%D9%8A%D8%A9/%D8%B3%D9%8A%D8%A7%D8%B1%D8%A7%D8%AA-%D9%88%D9%85%D8%B1%D9%83%D8%A8%D8%A7%D8%AA/%D8%B3%D9%8A%D8%A7%D8%B1%D8%A7%D8%AA-%D9%84%D9%84%D8%A8%D9%8A%D8%B9',
    updated_at = NOW()
WHERE code = 'OPS-CAR-ALEX';

-- ContactCars: /en/used-cars?city=alexandria → /ar/cars?status=4&governorate=5
UPDATE ahe_scopes
SET base_url = 'https://www.contactcars.com/ar/cars?status=4&governorate=5&sortBy=sortingDate&sortOrder=false',
    updated_at = NOW()
WHERE code = 'CC-CAR-ALEX';

-- ═══ عقارات ═══

-- AqarMap: keep for-sale (confirmed correct)
UPDATE ahe_scopes
SET base_url = 'https://aqarmap.com.eg/ar/for-sale/property-type/alexandria/',
    updated_at = NOW()
WHERE code = 'AQR-PROP-ALEX';

-- PropertyFinder: keep buy (confirmed correct)
UPDATE ahe_scopes
SET base_url = 'https://www.propertyfinder.eg/en/buy/alexandria/properties-for-sale.html',
    updated_at = NOW()
WHERE code = 'PF-PROP-ALEX';

-- SemsarMasr: residential for sale in Alexandria (governorate=979)
UPDATE ahe_scopes
SET base_url = 'https://www.semsarmasr.com/3akarat?r=70&purpose=sale&cid=952&s=1&g=979&a=0&pf=0&pt=0&af=0&at=0&ismortgage=-1&pm=any&furniture=-1&finishing=-1&rooms=0&q=',
    updated_at = NOW()
WHERE code = 'SEM-PROP-ALEX';
