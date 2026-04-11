import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type AuthStackParamList = {
  Login: undefined;
  VerifyOtp: { email: string };
};

export type AppStackParamList = {
  Dashboard: undefined;
  Upload: undefined;
  Analysis: { billId: string };
  Report: { billId: string };
};

export type RootStackParamList = {
  Auth: undefined;
  App: undefined;
};

export type LoginScreenProps = NativeStackScreenProps<AuthStackParamList, 'Login'>;
export type VerifyOtpScreenProps = NativeStackScreenProps<AuthStackParamList, 'VerifyOtp'>;
export type DashboardScreenProps = NativeStackScreenProps<AppStackParamList, 'Dashboard'>;
export type UploadScreenProps = NativeStackScreenProps<AppStackParamList, 'Upload'>;
export type AnalysisScreenProps = NativeStackScreenProps<AppStackParamList, 'Analysis'>;
export type ReportScreenProps = NativeStackScreenProps<AppStackParamList, 'Report'>;
