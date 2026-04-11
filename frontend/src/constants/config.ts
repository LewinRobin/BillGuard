export const API_BASE_URL = __DEV__
  ? 'http://192.168.1.x:8000' // replace with your local IP
  : 'https://api.yourapp.com';

export const ANOMALY_THRESHOLD = 1.3; // 30% above average

export const RISK_THRESHOLDS = {
  LOW: 10,       // anomaly score 0–10
  MEDIUM: 40,    // 11–40
  HIGH: 100,     // 41–100
} as const;

export const SUPPORTED_STATES = [
  'Andhra Pradesh', 'Delhi', 'Gujarat', 'Karnataka',
  'Kerala', 'Maharashtra', 'Tamil Nadu', 'Telangana',
  'Uttar Pradesh', 'West Bengal',
];
