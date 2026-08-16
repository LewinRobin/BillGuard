import React, { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { billsApi } from '../../api/bills';
import { useBillStore } from '../../store/useBillStore';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorView from '../../components/common/ErrorView';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { showAlert } from '../../utils/alert';
import type { DashboardScreenProps } from '../../navigation/types';
import { formatINR } from '../../utils/currency';
import type { Bill, AnomalyLevel } from '../../types/bill.types';

const RISK_COLORS: Record<AnomalyLevel, string> = {
  none: '#1A6B4A',
  low: '#1A6B4A',
  medium: '#D97706',
  high: '#DC2626',
};
const RISK_BG: Record<AnomalyLevel, string> = {
  none: '#ECFDF5',
  low: '#ECFDF5',
  medium: '#FFFBEB',
  high: '#FEF2F2',
};
const RISK_LABELS: Record<AnomalyLevel, string> = {
  none: 'Clear',
  low: 'Low risk',
  medium: 'Medium risk',
  high: 'High risk',
};

function BillCard({
  bill,
  onPress,
  onDelete,
}: {
  bill: Bill;
  onPress: () => void;
  onDelete: () => void;
}) {
  const flagged = bill.items.filter((i) => i.anomalyFlag).length;
  const color = RISK_COLORS[bill.riskLevel];
  const bg = RISK_BG[bill.riskLevel];

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.78}
      style={{
        backgroundColor: '#ffffff',
        borderRadius: 18,
        padding: 18,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
      }}>
      <View
        style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1, marginRight: 12 }}>
          <Text style={{ fontWeight: '700', fontSize: 15, color: '#111827' }} numberOfLines={1}>
            {bill.hospitalName}
          </Text>
          <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 3 }}>
            {bill.city}, {bill.state}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View
            style={{
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 20,
              backgroundColor: bg,
            }}>
            <Text style={{ fontSize: 11, fontWeight: '600', color }}>
              {RISK_LABELS[bill.riskLevel]}
            </Text>
          </View>
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: '#FEF2F2',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Text style={{ fontSize: 14 }}>🗑</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View
        style={{
          height: 1,
          backgroundColor: '#F3F4F6',
          marginVertical: 14,
        }}
      />

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View>
          <Text style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 3 }}>Bill total</Text>
          <Text style={{ fontSize: 20, fontWeight: '700', color: '#111827' }}>
            {formatINR(bill.totalAmount)}
          </Text>
        </View>
        {flagged > 0 && (
          <View
            style={{
              backgroundColor: '#FEF2F2',
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 8,
              alignItems: 'flex-end',
            }}>
            <Text style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 2 }}>Flagged</Text>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#DC2626' }}>
              {flagged} item{flagged !== 1 ? 's' : ''}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function DashboardScreen({ navigation }: DashboardScreenProps) {
  const { bills, setBills, removeBill } = useBillStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Bill | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = useCallback((bill: Bill) => {
    setDeleteTarget(bill);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await billsApi.deleteBill(deleteTarget.id);
      removeBill(deleteTarget.id);
      setDeleteTarget(null);
    } catch {
      showAlert('Error', 'Could not delete the bill. Please try again.');
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, removeBill]);

  const fetchBills = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) setRefreshing(true);
        const res = await billsApi.getUserBills();
        setBills(res.data.data.items);
        setError(null);
      } catch {
        setError('Could not load your bills. Check your connection and try again.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [setBills]
  );

  useFocusEffect(
    useCallback(() => {
      fetchBills();
    }, [fetchBills])
  );

  const totalAmount = bills.reduce((s, b) => s + b.totalAmount, 0);
  const totalFlagged = bills.reduce((s, b) => s + b.totalFlaggedAmount, 0);
  const highRiskCount = bills.filter((b) => b.riskLevel === 'high').length;

  if (loading) return <LoadingSpinner message="Loading your bills…" />;
  if (error) return <ErrorView message={error} onRetry={() => fetchBills()} />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F7F8FA' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F8FA" />
      <FlatList
        data={bills}
        keyExtractor={(b) => b.id}
        renderItem={({ item }) => (
          <BillCard
            bill={item}
            onPress={() => navigation.navigate('Analysis', { billId: item.id })}
            onDelete={() => handleDelete(item)}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchBills(true)}
            tintColor="#1A6B4A"
          />
        }
        ListHeaderComponent={
          <View>
            {/* Header */}
            <View
              style={{
                backgroundColor: '#1A6B4A',
                paddingTop: 20,
                paddingBottom: 80,
                paddingHorizontal: 20,
                borderBottomLeftRadius: 28,
                borderBottomRightRadius: 28,
                marginBottom: -52,
              }}>
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 4 }}>
                Welcome back
              </Text>
              <Text style={{ color: '#fff', fontSize: 24, fontWeight: '700' }}>Your Bills</Text>
            </View>

            {/* Summary cards */}
            <View
              style={{
                flexDirection: 'row',
                gap: 12,
                marginHorizontal: 16,
                marginBottom: 24,
              }}>
              <View
                style={{
                  flex: 1,
                  backgroundColor: '#ffffff',
                  borderRadius: 16,
                  padding: 16,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.08,
                  shadowRadius: 12,
                  elevation: 4,
                }}>
                <Text
                  style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 6, fontWeight: '500' }}>
                  TOTAL SPENT
                </Text>
                <Text style={{ fontSize: 20, fontWeight: '700', color: '#111827' }}>
                  {formatINR(totalAmount)}
                </Text>
                <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>
                  across {bills.length} bill{bills.length !== 1 ? 's' : ''}
                </Text>
              </View>

              <View
                style={{
                  flex: 1,
                  backgroundColor: totalFlagged > 0 ? '#FEF2F2' : '#ECFDF5',
                  borderRadius: 16,
                  padding: 16,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.06,
                  shadowRadius: 12,
                  elevation: 3,
                }}>
                <Text
                  style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 6, fontWeight: '500' }}>
                  POTENTIAL ANOMALY
                </Text>
                <Text
                  style={{
                    fontSize: 20,
                    fontWeight: '700',
                    color: totalFlagged > 0 ? '#DC2626' : '#1A6B4A',
                  }}>
                  {formatINR(totalFlagged)}
                </Text>
                <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>
                  {highRiskCount > 0
                    ? `${highRiskCount} high-risk bill${highRiskCount !== 1 ? 's' : ''}`
                    : 'all clear'}
                </Text>
              </View>
            </View>

            {bills.length > 0 && (
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '600',
                  color: '#6B7280',
                  letterSpacing: 0.5,
                  textTransform: 'uppercase',
                  marginBottom: 12,
                }}>
                Recent bills
              </Text>
            )}
          </View>
        }
        ListEmptyComponent={
          <View
            style={{
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 60,
              paddingHorizontal: 32,
            }}>
            {/* Document illustration */}
            <View
              style={{
                width: 80,
                height: 96,
                backgroundColor: '#E5E7EB',
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 20,
              }}>
              {[0, 1, 2].map((i) => (
                <View
                  key={i}
                  style={{
                    width: 44,
                    height: 4,
                    backgroundColor: '#D1D5DB',
                    borderRadius: 2,
                    marginBottom: 6,
                  }}
                />
              ))}
            </View>
            <Text style={{ fontSize: 17, fontWeight: '700', color: '#374151', marginBottom: 8 }}>
              No bills yet
            </Text>
            <Text style={{ fontSize: 14, color: '#9CA3AF', textAlign: 'center', lineHeight: 20 }}>
              Upload your first hospital bill to start checking for pricing anomalies.
            </Text>
          </View>
        }
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
      />

      {/* FAB */}
      <View
        style={{
          position: 'absolute',
          bottom: 28,
          left: 20,
          right: 20,
        }}>
        <TouchableOpacity
          onPress={() => navigation.navigate('Upload')}
          style={{
            borderRadius: 16,
            height: 56,
            backgroundColor: '#1A6B4A',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#1A6B4A',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.35,
            shadowRadius: 12,
            elevation: 8,
          }}
          activeOpacity={0.85}>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>+ Upload Bill</Text>
        </TouchableOpacity>
      </View>
      <ConfirmDialog
        visible={deleteTarget !== null}
        title="Delete Bill"
        message={
          deleteTarget
            ? `Remove "${deleteTarget.hospitalName}"? This bill and its analysis will be permanently deleted.`
            : ''
        }
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => {
          if (!deleting) setDeleteTarget(null);
        }}
      />
    </SafeAreaView>
  );
}
