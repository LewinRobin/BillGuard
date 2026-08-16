import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { AppStackParamList } from './types';
import DashboardScreen from '../screens/dashboard/DashboardScreen';
import UploadScreen from '../screens/upload/UploadScreen';
import AnalysisScreen from '../screens/analysis/AnalysisScreen';
import ReportScreen from '../screens/report/ReportScreen';
import { COLORS } from '../constants/theme';

const Stack = createNativeStackNavigator<AppStackParamList>();

export default function AppNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.surface },
        headerTintColor: COLORS.primary,
        headerTitleStyle: { fontWeight: '600', color: COLORS.textPrimary },
        headerShadowVisible: false,
      }}>
      <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'My Bills' }} />
      <Stack.Screen name="Upload" component={UploadScreen} options={{ title: 'Upload Bill' }} />
      <Stack.Screen
        name="Analysis"
        component={AnalysisScreen}
        options={{ title: 'Bill Analysis' }}
      />
      <Stack.Screen name="Report" component={ReportScreen} options={{ title: 'Export Report' }} />
    </Stack.Navigator>
  );
}
