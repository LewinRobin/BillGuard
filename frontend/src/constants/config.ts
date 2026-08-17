export const API_BASE_URL = __DEV__
  ? 'http://127.0.0.1:8000' // local dev server
  : 'http://YOUR_EC2_PUBLIC_IP:8000'; // TODO: replace with your EC2 public IP after deployment

export const ANOMALY_THRESHOLD = 1.3; // 30% above average

export const RISK_THRESHOLDS = {
  LOW: 10, // anomaly score 0–10
  MEDIUM: 40, // 11–40
  HIGH: 100, // 41–100
} as const;

export const SUPPORTED_STATES = [
  'Andhra Pradesh',
  'Delhi',
  'Gujarat',
  'Karnataka',
  'Kerala',
  'Maharashtra',
  'Tamil Nadu',
  'Telangana',
  'Uttar Pradesh',
  'West Bengal',
];
