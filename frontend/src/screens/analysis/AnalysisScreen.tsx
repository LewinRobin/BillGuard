import React from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  SafeAreaView, StatusBar, useState,
} from 'react-native';
import { useBillAnalysis } from '../../hooks/useBillAnalysis';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorView from '../../components/common/ErrorView';
import type { AnalysisScreenProps } from '../../navigation/types';
import type { BillItem, AnomalyLevel } from '../../types/bill.types';
import { formatINR } from '../../utils/currency';
import { getAnomalyLabel } from '../../utils/anomaly';

const RISK_COLOR: Record<AnomalyLevel, string> = {
  none: '#1A6B4A', low: '#1A6B4A', medium: '#D97706', high: '#DC2626',
};
const RISK_BG: Record<AnomalyLevel, string> = {
  none: '#ECFDF5', low: '#ECFDF5', medium: '#FFFBEB', high: '#FEF2F2',
};

function ItemRow({ item }: { item: BillItem }) {
  const [expanded, setExpanded] = React.useState(false);
  const isFlagged = item.anomalyFlag;

  return (
    <TouchableOpacity
      onPress={() => setExpanded((p) => !p)}
      activeOpacity={0.85}
      style={{
        backgroundColor: isFlagged ? '#FEF2F2' : '#ffffff',
        borderRadius: 14,
        marginBottom: 8,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: isFlagged ? '#FECACA' : '#F3F4F6',
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14 }}>
        {isFlagged && (
          <View style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: '#FEE2E2',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 10,
          }}>
            <Text style={{ fontSize: 12 }}>⚠</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }} numberOfLines={expanded ? undefined : 1}>
            {item.normalizedServiceName}
          </Text>
          {isFlagged && item.percentAboveAverage != null && (
            <Text style={{ fontSize: 12, color: '#DC2626', marginTop: 2 }}>
              {Math.round(item.percentAboveAverage)}% above regional average
            </Text>
          )}
        </View>
        <Text style={{
          fontSize: 15,
          fontWeight: '700',
          color: isFlagged ? '#DC2626' : '#111827',
          marginLeft: 8,
        }}>
          {formatINR(item.totalPrice)}
        </Text>
      </View>

      {expanded && (
        <View style={{
          borderTopWidth: 1,
          borderTopColor: isFlagged ? '#FECACA' : '#F3F4F6',
          padding: 14,
          gap: 8,
        }}>
          {item.avgRegionalPrice != null && (
            <>
              <DetailRow label="Regional average" value={formatINR(item.avgRegionalPrice)} />
              <DetailRow
                label="Fair range"
                value={`${formatINR(item.minRegionalPrice ?? 0)} – ${formatINR(item.maxRegionalPrice ?? 0)}`}
              />
            </>
          )}
          <DetailRow label="Quantity" value={String(item.quantity)} />
          <DetailRow label="Unit price" value={formatINR(item.unitPrice)} />
          {item.avgRegionalPrice == null && (
            <Text style={{ fontSize: 12, color: '#9CA3AF', fontStyle: 'italic' }}>
              No benchmark data available for this region.
            </Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text style={{ fontSize: 13, color: '#6B7280' }}>{label}</Text>
      <Text style={{ fontSize: 13, fontWeight: '500', color: '#374151' }}>{value}</Text>
    </View>
  );
}

export default function AnalysisScreen({ route, navigation }: AnalysisScreenProps) {
  const { billId } = route.params;
  const { bill, isPolling, error } = useBillAnalysis(billId);

  if (isPolling && !bill) return <LoadingSpinner message="Analysing bill against regional benchmarks…" />;
  if (error) return <ErrorView message={error} />;
  if (!bill) return null;
  if (bill.status === 'processing') return <LoadingSpinner message="Still processing… almost there." />;

  const flagged = bill.items.filter((i) => i.anomalyFlag);
  const normal = bill.items.filter((i) => !i.anomalyFlag);
  const riskColor = RISK_COLOR[bill.riskLevel];
  const riskBg = RISK_BG[bill.riskLevel];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F7F8FA' }}>
      <StatusBar barStyle="dark-content" />
      <FlatList
        data={[...flagged, ...normal]}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => <ItemRow item={item} />}
        ListHeaderComponent={
          <View>
            {/* Summary card */}
            <View style={{
              backgroundColor: '#ffffff',
              borderRadius: 20,
              padding: 20,
              marginBottom: 16,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.06,
              shadowRadius: 10,
              elevation: 3,
            }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '700', fontSize: 17, color: '#111827' }} numberOfLines={2}>
                    {bill.hospitalName}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 3 }}>
                    {bill.city}, {bill.state}
                  </Text>
                </View>
                <View style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 20,
                  backgroundColor: riskBg,
                  marginLeft: 12,
                }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: riskColor }}>
                    {bill.riskLevel === 'none' ? 'All clear' : `${bill.riskLevel.charAt(0).toUpperCase() + bill.riskLevel.slice(1)} risk`}
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1, backgroundColor: '#F9FAFB', borderRadius: 12, padding: 14 }}>
                  <Text style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 4 }}>Bill total</Text>
                  <Text style={{ fontSize: 20, fontWeight: '700', color: '#111827' }}>
                    {formatINR(bill.totalAmount)}
                  </Text>
                </View>
                {bill.totalFlaggedAmount > 0 && (
                  <View style={{ flex: 1, backgroundColor: '#FEF2F2', borderRadius: 12, padding: 14 }}>
                    <Text style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 4 }}>Anomaly amount</Text>
                    <Text style={{ fontSize: 20, fontWeight: '700', color: '#DC2626' }}>
                      {formatINR(bill.totalFlaggedAmount)}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {flagged.length > 0 && (
              <View style={{
                backgroundColor: '#FFF7ED',
                borderRadius: 14,
                padding: 14,
                marginBottom: 16,
                flexDirection: 'row',
                gap: 10,
                borderWidth: 1,
                borderColor: '#FED7AA',
              }}>
                <Text style={{ fontSize: 18 }}>⚠️</Text>
                <Text style={{ flex: 1, fontSize: 13, color: '#92400E', lineHeight: 20 }}>
                  {flagged.length} item{flagged.length !== 1 ? 's show' : ' shows'} potential pricing anomalies based on available regional benchmarks. This is not an accusation of fraud.
                </Text>
              </View>
            )}

            <Text style={{
              fontSize: 12, fontWeight: '600', color: '#9CA3AF',
              letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10,
            }}>
              Bill items · tap to expand
            </Text>
          </View>
        }
        ListFooterComponent={
          <TouchableOpacity
            onPress={() => navigation.navigate('Report', { billId })}
            style={{
              marginTop: 16,
              borderRadius: 16,
              height: 54,
              backgroundColor: '#1A6B4A',
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#1A6B4A',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 10,
              elevation: 5,
            }}
          >
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
              Export Report
            </Text>
          </TouchableOpacity>
        }
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      />
    </SafeAreaView>
  );
}
