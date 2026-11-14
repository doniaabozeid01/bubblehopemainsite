/**
 * Well-known areas per city (keyed by cityId), shown in the District list until the
 * dashboard has them as real districts (same list as docs/districts-to-add.csv).
 * An area whose Arabic name already exists as a district is hidden automatically.
 */
export interface KnownArea {
  name: string;
  name_ar: string;
}

const area = (name: string, name_ar: string): KnownArea => ({ name, name_ar });

export const KNOWN_AREAS: Record<number, KnownArea[]> = {
  // Hadayek Al-Ahram
  1: [
    area('Gate 1 - Khufu', 'البوابة الأولى - خوفو'),
    area('Gate 2 - Khafre', 'البوابة الثانية - خفرع'),
    area('Gate 3 - Menkaure', 'البوابة الثالثة - منقرع'),
    area('Gate 4 - Mina', 'البوابة الرابعة - مينا'),
    area('Ahmose Gate', 'بوابة أحمس'),
    area('Horus Gate', 'بوابة حورس'),
    area('Zone Alef', 'منطقة أ'),
    area('Zone Baa', 'منطقة ب'),
    area('Zone Geem', 'منطقة ج'),
    area('Zone Dal', 'منطقة د'),
    area('Zone Haa', 'منطقة هـ'),
    area('Zone Waw', 'منطقة و'),
    area('Zone Zay', 'منطقة ز'),
    area('Zone Hah', 'منطقة ح'),
    area('Zone Taa', 'منطقة ط'),
    area('Zone Kaf', 'منطقة ك'),
    area('Zone Lam', 'منطقة ل'),
    area('Zone Meem', 'منطقة م'),
    area('Zone Noon', 'منطقة ن'),
    area('Zone Seen', 'منطقة س'),
    area('Zone Sad', 'منطقة ص'),
    area('Zone Ain', 'منطقة ع'),
  ],
  // Sheikh Zayed
  2: [
    area('District 1', 'الحي الأول'),
    area('District 2', 'الحي الثاني'),
    area('District 3', 'الحي الثالث'),
    area('District 4', 'الحي الرابع'),
    area('District 5', 'الحي الخامس'),
    area('District 6', 'الحي السادس'),
    area('District 7', 'الحي السابع'),
    area('District 8', 'الحي الثامن'),
    area('District 9', 'الحي التاسع'),
    area('District 10', 'الحي العاشر'),
    area('District 11', 'الحي الحادي عشر'),
    area('District 12', 'الحي الثاني عشر'),
    area('District 13', 'الحي الثالث عشر'),
    area('District 14', 'الحي الرابع عشر'),
    area('District 15', 'الحي الخامس عشر'),
    area('District 16', 'الحي السادس عشر'),
    area('New Zayed', 'زايد الجديدة'),
    area('Beverly Hills', 'بيفرلي هيلز'),
    area('Westown', 'ويست تاون'),
    area('Allegria', 'أليجريا'),
    area('Casa', 'كازا'),
    area('El Rabwa', 'الربوة'),
    area('Zayed Dunes', 'زايد ديونز'),
    area('Cairo Gate', 'كايرو جيت'),
    area('ZED', 'زيد'),
  ],
};
