// Sarh AI — صرح الذكي. Violations & Fines (contractors only).

export type ViolationAssetType = 'id_card' | 'vehicle_sticker';

// lost      => فقدان البطاقة / تصريح المركبة
// not_returned => عدم إعادة البطاقة/التصريح المنتهي لإدارة الأمن الصناعي
export type ViolationType = 'lost' | 'not_returned';

export type ViolationPaymentStatus = 'unpaid' | 'paid' | 'waived';

export interface ViolationRecord {
  id: string;
  violationNumber: string; // VIO-YYYY-00001
  assetType: ViolationAssetType;
  violationType: ViolationType;

  // Contractor (violations apply to contractors only)
  contractorName: string;      // اسم الشخص المخالف
  contractorCompany: string;   // اسم شركة المقاول
  employeeId: string;
  documentNumber: string;      // رقم البطاقة أو رقم تصريح المركبة
  linkedRequestId?: string;    // ربط اختياري بطلب في النظام

  incidentDate: string;        // تاريخ الفقدان / تاريخ الانتهاء
  offenseNumber: number;       // المرة الأولى/الثانية/الثالثة (لحالات الفقدان)
  weeksOverdue: number;        // عدد الأسابيع (لحالات عدم الإعادة)

  fineAmount: number;          // ريال سعودي
  banned: boolean;             // يُحرم من الإصدار
  referredToSecurity: boolean; // يحال للجهة الأمنية

  paymentStatus: ViolationPaymentStatus;
  paidAt?: string;
  receiptNumber?: string;

  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
