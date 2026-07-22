/** Fallback Egypt locations when the API returns sparse data. */
export interface LocOption {
  id: number;
  name: string;
  nameAr: string;
}

export interface LocCity extends LocOption {
  governorateId: number;
}

export interface LocDistrict extends LocOption {
  cityId: number;
}

/** Static IDs start at 1000 to avoid colliding with API ids (1, 2, 3…). */
export const EGYPT_GOVERNORATES: LocOption[] = [
  { id: 1, name: 'Giza', nameAr: 'الجيزة' },
  { id: 1001, name: 'Cairo', nameAr: 'القاهرة' },
  { id: 1002, name: 'Alexandria', nameAr: 'الإسكندرية' },
  { id: 1003, name: 'Qalyubia', nameAr: 'القليوبية' },
  { id: 1004, name: 'Sharqia', nameAr: 'الشرقية' },
  { id: 1005, name: 'Dakahlia', nameAr: 'الدقهلية' },
  { id: 1006, name: 'Beheira', nameAr: 'البحيرة' },
  { id: 1007, name: 'Monufia', nameAr: 'المنوفية' },
  { id: 1008, name: 'Gharbia', nameAr: 'الغربية' },
  { id: 1009, name: 'Kafr El Sheikh', nameAr: 'كفر الشيخ' },
  { id: 1010, name: 'Damietta', nameAr: 'دمياط' },
  { id: 1011, name: 'Port Said', nameAr: 'بورسعيد' },
  { id: 1012, name: 'Ismailia', nameAr: 'الإسماعيلية' },
  { id: 1013, name: 'Suez', nameAr: 'السويس' },
  { id: 1014, name: 'Fayoum', nameAr: 'الفيوم' },
  { id: 1015, name: 'Beni Suef', nameAr: 'بني سويف' },
  { id: 1016, name: 'Minya', nameAr: 'المنيا' },
  { id: 1017, name: 'Assiut', nameAr: 'أسيوط' },
  { id: 1018, name: 'Sohag', nameAr: 'سوهاج' },
  { id: 1019, name: 'Qena', nameAr: 'قنا' },
  { id: 1020, name: 'Luxor', nameAr: 'الأقصر' },
  { id: 1021, name: 'Aswan', nameAr: 'أسوان' },
  { id: 1022, name: 'Red Sea', nameAr: 'البحر الأحمر' },
  { id: 1023, name: 'New Valley', nameAr: 'الوادي الجديد' },
  { id: 1024, name: 'Matrouh', nameAr: 'مطروح' },
  { id: 1025, name: 'North Sinai', nameAr: 'شمال سيناء' },
  { id: 1026, name: 'South Sinai', nameAr: 'جنوب سيناء' },
];

export const EGYPT_CITIES: LocCity[] = [
  // Giza (API-backed ids preferred when present)
  { id: 1, name: 'Hadayek Al-Ahram', nameAr: 'حدائق الأهرام', governorateId: 1 },
  { id: 2, name: 'Sheikh Zayed', nameAr: 'الشيخ زايد', governorateId: 1 },
  { id: 3, name: 'Zeweil', nameAr: 'الزويل', governorateId: 1 },
  { id: 1101, name: '6th of October', nameAr: 'السادس من أكتوبر', governorateId: 1 },
  { id: 1102, name: 'Haram', nameAr: 'الهرم', governorateId: 1 },
  { id: 1103, name: 'Faisal', nameAr: 'فيصل', governorateId: 1 },
  { id: 1104, name: 'Dokki', nameAr: 'الدقي', governorateId: 1 },
  { id: 1105, name: 'Mohandessin', nameAr: 'المهندسين', governorateId: 1 },
  // Cairo
  { id: 1201, name: 'Nasr City', nameAr: 'مدينة نصر', governorateId: 1001 },
  { id: 1202, name: 'Heliopolis', nameAr: 'مصر الجديدة', governorateId: 1001 },
  { id: 1203, name: 'Maadi', nameAr: 'المعادي', governorateId: 1001 },
  { id: 1204, name: 'New Cairo', nameAr: 'القاهرة الجديدة', governorateId: 1001 },
  { id: 1205, name: 'Shubra', nameAr: 'شبرا', governorateId: 1001 },
  { id: 1206, name: 'Downtown', nameAr: 'وسط البلد', governorateId: 1001 },
  // Alexandria
  { id: 1301, name: 'Smouha', nameAr: 'سموحة', governorateId: 1002 },
  { id: 1302, name: 'Stanley', nameAr: 'ستانلي', governorateId: 1002 },
  { id: 1303, name: 'Miami', nameAr: 'ميامي', governorateId: 1002 },
  { id: 1304, name: 'Sidi Gaber', nameAr: 'سيدي جابر', governorateId: 1002 },
  // Qalyubia
  { id: 1401, name: 'Banha', nameAr: 'بنها', governorateId: 1003 },
  { id: 1402, name: 'Shubra El Kheima', nameAr: 'شبرا الخيمة', governorateId: 1003 },
  { id: 1403, name: 'Obour', nameAr: 'العبور', governorateId: 1003 },
  // Rest of Egypt — at least one city each so cascading never empties
  { id: 1501, name: 'Zagazig', nameAr: 'الزقازيق', governorateId: 1004 },
  { id: 1502, name: '10th of Ramadan', nameAr: 'العاشر من رمضان', governorateId: 1004 },
  { id: 1601, name: 'Mansoura', nameAr: 'المنصورة', governorateId: 1005 },
  { id: 1602, name: 'Talkha', nameAr: 'طلخا', governorateId: 1005 },
  { id: 1701, name: 'Damanhur', nameAr: 'دمنهور', governorateId: 1006 },
  { id: 1702, name: 'Kafr El Dawwar', nameAr: 'كفر الدوار', governorateId: 1006 },
  { id: 1801, name: 'Shibin El Kom', nameAr: 'شبين الكوم', governorateId: 1007 },
  { id: 1802, name: 'Menouf', nameAr: 'منوف', governorateId: 1007 },
  { id: 1901, name: 'Tanta', nameAr: 'طنطا', governorateId: 1008 },
  { id: 1902, name: 'El Mahalla', nameAr: 'المحلة الكبرى', governorateId: 1008 },
  { id: 2001, name: 'Kafr El Sheikh', nameAr: 'كفر الشيخ', governorateId: 1009 },
  { id: 2002, name: 'Desouk', nameAr: 'دسوق', governorateId: 1009 },
  { id: 2101, name: 'Damietta', nameAr: 'دمياط', governorateId: 1010 },
  { id: 2102, name: 'New Damietta', nameAr: 'دمياط الجديدة', governorateId: 1010 },
  { id: 2201, name: 'Port Said', nameAr: 'بورسعيد', governorateId: 1011 },
  { id: 2301, name: 'Ismailia', nameAr: 'الإسماعيلية', governorateId: 1012 },
  { id: 2401, name: 'Suez', nameAr: 'السويس', governorateId: 1013 },
  { id: 2501, name: 'Fayoum', nameAr: 'الفيوم', governorateId: 1014 },
  { id: 2601, name: 'Beni Suef', nameAr: 'بني سويف', governorateId: 1015 },
  { id: 2701, name: 'Minya', nameAr: 'المنيا', governorateId: 1016 },
  { id: 2801, name: 'Assiut', nameAr: 'أسيوط', governorateId: 1017 },
  { id: 2901, name: 'Sohag', nameAr: 'سوهاج', governorateId: 1018 },
  { id: 3001, name: 'Qena', nameAr: 'قنا', governorateId: 1019 },
  { id: 3101, name: 'Luxor', nameAr: 'الأقصر', governorateId: 1020 },
  { id: 3201, name: 'Aswan', nameAr: 'أسوان', governorateId: 1021 },
  { id: 3301, name: 'Hurghada', nameAr: 'الغردقة', governorateId: 1022 },
  { id: 3401, name: 'Kharga', nameAr: 'الخارجة', governorateId: 1023 },
  { id: 3501, name: 'Marsa Matrouh', nameAr: 'مرسى مطروح', governorateId: 1024 },
  { id: 3601, name: 'Arish', nameAr: 'العريش', governorateId: 1025 },
  { id: 3701, name: 'Sharm El Sheikh', nameAr: 'شرم الشيخ', governorateId: 1026 },
];

export const EGYPT_DISTRICTS: LocDistrict[] = [
  { id: 1, name: 'el-tharwa el-madaneia', nameAr: 'الثروة المعدنية', cityId: 1 },
  { id: 4101, name: 'Center', nameAr: 'المنطقة المركزية', cityId: 2 },
  { id: 3, name: 'Al Ashgar District', nameAr: 'الأشجار', cityId: 3 },
  { id: 4102, name: 'Al Montazah District', nameAr: 'المنتزه', cityId: 3 },
  { id: 4103, name: 'Zewail City', nameAr: 'مدينة زويل', cityId: 3 },
  { id: 4104, name: 'Hadayek October', nameAr: 'حدائق أكتوبر', cityId: 3 },
  { id: 4201, name: 'Main District', nameAr: 'الحي الرئيسي', cityId: 1101 },
  { id: 4202, name: 'Main District', nameAr: 'الحي الرئيسي', cityId: 1102 },
  { id: 4203, name: 'Main District', nameAr: 'الحي الرئيسي', cityId: 1103 },
  { id: 4204, name: 'Main District', nameAr: 'الحي الرئيسي', cityId: 1104 },
  { id: 4205, name: 'Main District', nameAr: 'الحي الرئيسي', cityId: 1105 },
  { id: 4301, name: 'Main District', nameAr: 'الحي الرئيسي', cityId: 1201 },
  { id: 4302, name: 'Main District', nameAr: 'الحي الرئيسي', cityId: 1202 },
  { id: 4303, name: 'Main District', nameAr: 'الحي الرئيسي', cityId: 1203 },
  { id: 4304, name: 'Main District', nameAr: 'الحي الرئيسي', cityId: 1204 },
  { id: 4305, name: 'Main District', nameAr: 'الحي الرئيسي', cityId: 1205 },
  { id: 4306, name: 'Main District', nameAr: 'الحي الرئيسي', cityId: 1206 },
  { id: 4401, name: 'Main District', nameAr: 'الحي الرئيسي', cityId: 1301 },
  { id: 4402, name: 'Main District', nameAr: 'الحي الرئيسي', cityId: 1302 },
  { id: 4403, name: 'Main District', nameAr: 'الحي الرئيسي', cityId: 1303 },
  { id: 4404, name: 'Main District', nameAr: 'الحي الرئيسي', cityId: 1304 },
  { id: 4501, name: 'Main District', nameAr: 'الحي الرئيسي', cityId: 1401 },
  { id: 4502, name: 'Main District', nameAr: 'الحي الرئيسي', cityId: 1402 },
  { id: 4503, name: 'Main District', nameAr: 'الحي الرئيسي', cityId: 1403 },
  { id: 4601, name: 'Main District', nameAr: 'الحي الرئيسي', cityId: 1501 },
  { id: 4602, name: 'Main District', nameAr: 'الحي الرئيسي', cityId: 1502 },
  { id: 4701, name: 'Main District', nameAr: 'الحي الرئيسي', cityId: 1601 },
  { id: 4702, name: 'Main District', nameAr: 'الحي الرئيسي', cityId: 1602 },
  { id: 4801, name: 'Main District', nameAr: 'الحي الرئيسي', cityId: 1701 },
  { id: 4802, name: 'Main District', nameAr: 'الحي الرئيسي', cityId: 1702 },
  { id: 4901, name: 'Main District', nameAr: 'الحي الرئيسي', cityId: 1801 },
  { id: 4902, name: 'Main District', nameAr: 'الحي الرئيسي', cityId: 1802 },
  { id: 5001, name: 'Main District', nameAr: 'الحي الرئيسي', cityId: 1901 },
  { id: 5002, name: 'Main District', nameAr: 'الحي الرئيسي', cityId: 1902 },
  { id: 5101, name: 'Main District', nameAr: 'الحي الرئيسي', cityId: 2001 },
  { id: 5102, name: 'Main District', nameAr: 'الحي الرئيسي', cityId: 2002 },
  { id: 5201, name: 'Main District', nameAr: 'الحي الرئيسي', cityId: 2101 },
  { id: 5202, name: 'Main District', nameAr: 'الحي الرئيسي', cityId: 2102 },
  { id: 5301, name: 'Main District', nameAr: 'الحي الرئيسي', cityId: 2201 },
  { id: 5401, name: 'Main District', nameAr: 'الحي الرئيسي', cityId: 2301 },
  { id: 5501, name: 'Main District', nameAr: 'الحي الرئيسي', cityId: 2401 },
  { id: 5601, name: 'Main District', nameAr: 'الحي الرئيسي', cityId: 2501 },
  { id: 5701, name: 'Main District', nameAr: 'الحي الرئيسي', cityId: 2601 },
  { id: 5801, name: 'Main District', nameAr: 'الحي الرئيسي', cityId: 2701 },
  { id: 5901, name: 'Main District', nameAr: 'الحي الرئيسي', cityId: 2801 },
  { id: 6001, name: 'Main District', nameAr: 'الحي الرئيسي', cityId: 2901 },
  { id: 6101, name: 'Main District', nameAr: 'الحي الرئيسي', cityId: 3001 },
  { id: 6201, name: 'Main District', nameAr: 'الحي الرئيسي', cityId: 3101 },
  { id: 6301, name: 'Main District', nameAr: 'الحي الرئيسي', cityId: 3201 },
  { id: 6401, name: 'Main District', nameAr: 'الحي الرئيسي', cityId: 3301 },
  { id: 6501, name: 'Main District', nameAr: 'الحي الرئيسي', cityId: 3401 },
  { id: 6601, name: 'Main District', nameAr: 'الحي الرئيسي', cityId: 3501 },
  { id: 6701, name: 'Main District', nameAr: 'الحي الرئيسي', cityId: 3601 },
  { id: 6801, name: 'Main District', nameAr: 'الحي الرئيسي', cityId: 3701 },
];

export function mergeById<T extends { id: number }>(primary: T[], fallback: T[]): T[] {
  const map = new Map<number, T>();
  [...fallback, ...primary].forEach((item) => map.set(item.id, item));
  return Array.from(map.values());
}

export function labelOf(item: { name?: string; nameAr?: string; governorate_name?: string; governorate_name_ar?: string; city_name?: string; city_name_ar?: string; district_name?: string; district_name_ar?: string }, isAr: boolean): string {
  if (isAr) {
    return (
      item.nameAr ||
      item.governorate_name_ar ||
      item.city_name_ar ||
      item.district_name_ar ||
      item.name ||
      item.governorate_name ||
      item.city_name ||
      item.district_name ||
      ''
    );
  }
  return (
    item.name ||
    item.governorate_name ||
    item.city_name ||
    item.district_name ||
    item.nameAr ||
    item.governorate_name_ar ||
    item.city_name_ar ||
    item.district_name_ar ||
    ''
  );
}
