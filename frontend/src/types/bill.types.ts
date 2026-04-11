export type AnomalyLevel = 'low' | 'medium' | 'high' | 'none';

export type BillItemCategory =
  | 'consultation'
  | 'lab_test'
  | 'imaging'
  | 'procedure'
  | 'pharmacy'
  | 'room_charges'
  | 'other';

export interface BillItem {
  id: string;
  extractedText: string;
  normalizedServiceName: string;
  category: BillItemCategory;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  avgRegionalPrice: number | null;
  minRegionalPrice: number | null;
  maxRegionalPrice: number | null;
  anomalyFlag: boolean;
  anomalyScore: number; // 0–100
  percentAboveAverage: number | null;
}

export interface Bill {
  id: string;
  hospitalName: string;
  city: string;
  state: string;
  totalAmount: number;
  totalFlaggedAmount: number;
  riskLevel: AnomalyLevel;
  uploadedAt: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  items: BillItem[];
}

export interface UploadBillPayload {
  uri: string;
  name: string;
  mimeType: string;
  city: string;
  state: string;
}
