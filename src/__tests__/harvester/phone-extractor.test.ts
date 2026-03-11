/**
 * اختبارات استخراج أرقام الهواتف المصرية
 */
import { extractPhone, extractAllPhones } from "@/lib/crm/harvester/parsers/phone-extractor";

describe("extractPhone", () => {
  // ═══ أرقام صحيحة ═══

  it("يستخرج رقم 010 بدون علامات", () => {
    expect(extractPhone("تواصل معايا 01012345678")).toBe("01012345678");
  });

  it("يستخرج رقم 011", () => {
    expect(extractPhone("الرقم 01112345678 للتواصل")).toBe("01112345678");
  });

  it("يستخرج رقم 012", () => {
    expect(extractPhone("01212345678")).toBe("01212345678");
  });

  it("يستخرج رقم 015", () => {
    expect(extractPhone("01512345678")).toBe("01512345678");
  });

  it("يستخرج رقم بشرطات", () => {
    expect(extractPhone("اتصل: 010-1234-5678")).toBe("01012345678");
  });

  it("يستخرج رقم بمسافات", () => {
    expect(extractPhone("رقمي 010 1234 5678")).toBe("01012345678");
  });

  it("يستخرج رقم بنقاط", () => {
    expect(extractPhone("010.1234.5678")).toBe("01012345678");
  });

  it("يستخرج رقم مع رمز الدولة +20", () => {
    expect(extractPhone("+201012345678")).toBe("01012345678");
  });

  it("يستخرج رقم مع رمز الدولة 20 بدون +", () => {
    expect(extractPhone("201012345678")).toBe("01012345678");
  });

  it("يستخرج رقم من وسط نص طويل", () => {
    const text = "سيارة تويوتا كورولا 2020 للبيع، للتواصل 01012345678 أو على الواتساب";
    expect(extractPhone(text)).toBe("01012345678");
  });

  // ═══ حالات فارغة / غير صحيحة ═══

  it("يرجع null لنص فارغ", () => {
    expect(extractPhone("")).toBeNull();
  });

  it("يرجع null لنص بدون رقم", () => {
    expect(extractPhone("سيارة للبيع بسعر مناسب")).toBeNull();
  });

  it("يرجع null لنص null", () => {
    expect(extractPhone(null as unknown as string)).toBeNull();
  });

  it("يرجع null لرقم أقل من 11 رقم", () => {
    expect(extractPhone("0101234567")).toBeNull();
  });

  it("يرجع null لرقم يبدأ بـ 013 (غير صالح)", () => {
    expect(extractPhone("01312345678")).toBeNull();
  });

  it("يرجع null لرقم يبدأ بـ 014 (غير صالح)", () => {
    expect(extractPhone("01412345678")).toBeNull();
  });
});

describe("extractAllPhones", () => {
  it("يستخرج كل الأرقام من نص فيه أكتر من رقم", () => {
    const text = "تواصل: 01012345678 أو 01198765432";
    const phones = extractAllPhones(text);
    expect(phones).toContain("01012345678");
    expect(phones).toContain("01198765432");
  });

  it("يرجع مصفوفة فارغة لنص فارغ", () => {
    expect(extractAllPhones("")).toEqual([]);
  });

  it("يرجع مصفوفة فارغة لنص null", () => {
    expect(extractAllPhones(null as unknown as string)).toEqual([]);
  });

  it("لا يكرر نفس الرقم", () => {
    const text = "اتصل 01012345678 أو واتساب 01012345678";
    const phones = extractAllPhones(text);
    expect(phones.length).toBe(1);
    expect(phones[0]).toBe("01012345678");
  });

  it("يستخرج أرقام بأنماط مختلطة", () => {
    const text = "+201012345678 و 011-2345-6789";
    const phones = extractAllPhones(text);
    expect(phones.length).toBeGreaterThanOrEqual(2);
    expect(phones).toContain("01012345678");
    expect(phones).toContain("01123456789");
  });
});
