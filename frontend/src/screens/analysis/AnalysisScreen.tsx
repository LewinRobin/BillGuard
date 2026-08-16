import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useBillAnalysis } from '../../hooks/useBillAnalysis';
import { billsApi } from '../../api/bills';
import { servicesApi, ServiceItem } from '../../api/services';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorView from '../../components/common/ErrorView';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { showAlert } from '../../utils/alert';
import type { AnalysisScreenProps } from '../../navigation/types';
import type { BillItem, AnomalyLevel } from '../../types/bill.types';
import { formatINR } from '../../utils/currency';

const RISK_COLOR: Record<AnomalyLevel, string> = {
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

function ItemRow({ item, onEdit }: { item: BillItem; onEdit: (item: BillItem) => void }) {
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
      }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14 }}>
        {isFlagged && (
          <View
            style={{
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
          <Text
            style={{ fontSize: 14, fontWeight: '600', color: '#111827' }}
            numberOfLines={expanded ? undefined : 1}>
            {item.normalizedServiceName}
          </Text>
          {isFlagged && item.percentAboveAverage != null && (
            <Text style={{ fontSize: 12, color: '#DC2626', marginTop: 2 }}>
              {Math.round(item.percentAboveAverage)}% above regional average
            </Text>
          )}
        </View>
        <Text
          style={{
            fontSize: 15,
            fontWeight: '700',
            color: isFlagged ? '#DC2626' : '#111827',
            marginLeft: 8,
          }}>
          {formatINR(item.totalPrice)}
        </Text>
      </View>

      {expanded && (
        <View
          style={{
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
          <TouchableOpacity
            onPress={() => onEdit(item)}
            style={{
              marginTop: 12,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: '#D1D5DB',
              paddingVertical: 10,
              alignItems: 'center',
            }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#1A6B4A' }}>Edit mapping</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
}

function CorrectionModal({
  billId,
  item,
  onClose,
  onSaved,
}: {
  billId: string;
  item: BillItem;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ServiceItem[]>([]);
  const [selected, setSelected] = useState<ServiceItem | null>(null);
  const [customName, setCustomName] = useState('');
  const [saving, setSaving] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await servicesApi.search(q);
        setResults(res.data.data.items);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSave = async () => {
    if (!selected && !customName.trim()) {
      setError('Pick a service or enter a custom name.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (selected) {
        await billsApi.correctItem(billId, item.id, { serviceId: selected.id });
      } else {
        await billsApi.correctItem(billId, item.id, { customName: customName.trim() });
      }
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Could not save the mapping.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.4)',
          justifyContent: 'center',
          padding: 24,
        }}>
        <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 20, maxHeight: '82%' }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 4 }}>
            Correct mapping
          </Text>
          <Text style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 16 }} numberOfLines={1}>
            {item.extractedText} · {formatINR(item.totalPrice)}
          </Text>

          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search service or category…"
            placeholderTextColor="#9CA3AF"
            style={{
              backgroundColor: '#F9FAFB',
              borderRadius: 10,
              borderWidth: 1,
              borderColor: '#E5E7EB',
              paddingHorizontal: 12,
              height: 44,
              fontSize: 14,
              color: '#111827',
              marginBottom: 8,
            }}
          />
          {searching && (
            <ActivityIndicator size="small" color="#1A6B4A" style={{ marginVertical: 8 }} />
          )}
          <View style={{ maxHeight: 160 }}>
            {results.map((s) => {
              const isSelected = selected?.id === s.id;
              return (
                <TouchableOpacity
                  key={s.id}
                  onPress={() => {
                    setSelected(s);
                    setCustomName('');
                  }}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingVertical: 10,
                    paddingHorizontal: 8,
                    borderBottomWidth: 1,
                    borderBottomColor: '#F3F4F6',
                    borderRadius: 8,
                    backgroundColor: isSelected ? '#ECFDF5' : 'transparent',
                  }}>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{ fontSize: 14, fontWeight: '600', color: '#111827' }}
                      numberOfLines={1}>
                      {s.canonicalName}
                    </Text>
                    <Text style={{ fontSize: 11, color: '#9CA3AF' }}>{s.category}</Text>
                  </View>
                  {isSelected && <Text style={{ color: '#1A6B4A', fontWeight: '700' }}>✓</Text>}
                </TouchableOpacity>
              );
            })}
          </View>

          {results.length > 0 && (
            <Text
              style={{
                fontSize: 12,
                color: '#9CA3AF',
                textAlign: 'center',
                marginVertical: 8,
              }}>
              — or create your own —
            </Text>
          )}

          <TextInput
            value={customName}
            onChangeText={setCustomName}
            placeholder="Custom service name (e.g. ICU Day Charge)"
            placeholderTextColor="#9CA3AF"
            style={{
              backgroundColor: '#F9FAFB',
              borderRadius: 10,
              borderWidth: 1,
              borderColor: '#E5E7EB',
              paddingHorizontal: 12,
              height: 44,
              fontSize: 14,
              color: '#111827',
              marginBottom: 12,
            }}
          />

          {error && (
            <Text style={{ fontSize: 12, color: '#DC2626', marginBottom: 8 }}>{error}</Text>
          )}

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              onPress={onClose}
              style={{
                flex: 1,
                borderRadius: 12,
                height: 48,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: '#E5E7EB',
              }}>
              <Text style={{ color: '#374151', fontSize: 15, fontWeight: '600' }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSave}
              disabled={saving}
              style={{
                flex: 1,
                borderRadius: 12,
                height: 48,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#1A6B4A',
              }}>
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
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
  const { bill, isPolling, error, refresh } = useBillAnalysis(billId);
  const [editingItem, setEditingItem] = useState<BillItem | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = useCallback(async () => {
    setDeleting(true);
    try {
      await billsApi.deleteBill(billId);
      navigation.popToTop();
    } catch {
      showAlert('Error', 'Could not delete the bill. Please try again.');
      setConfirmDelete(false);
    } finally {
      setDeleting(false);
    }
  }, [billId, navigation]);

  if (isPolling && !bill)
    return <LoadingSpinner message="Analysing bill against regional benchmarks…" />;
  if (error) return <ErrorView message={error} />;
  if (!bill) return null;
  if (bill.status === 'processing')
    return <LoadingSpinner message="Still processing… almost there." />;

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
        renderItem={({ item }) => <ItemRow item={item} onEdit={setEditingItem} />}
        ListHeaderComponent={
          <View>
            {/* Summary card */}
            <View
              style={{
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
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: 16,
                }}>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{ fontWeight: '700', fontSize: 17, color: '#111827' }}
                    numberOfLines={2}>
                    {bill.hospitalName}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 3 }}>
                    {bill.city}, {bill.state}
                  </Text>
                </View>
                <View
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 20,
                    backgroundColor: riskBg,
                    marginLeft: 12,
                  }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: riskColor }}>
                    {bill.riskLevel === 'none'
                      ? 'All clear'
                      : `${bill.riskLevel.charAt(0).toUpperCase() + bill.riskLevel.slice(1)} risk`}
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View
                  style={{ flex: 1, backgroundColor: '#F9FAFB', borderRadius: 12, padding: 14 }}>
                  <Text style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 4 }}>
                    Bill total
                  </Text>
                  <Text style={{ fontSize: 20, fontWeight: '700', color: '#111827' }}>
                    {formatINR(bill.totalAmount)}
                  </Text>
                </View>
                {bill.totalFlaggedAmount > 0 && (
                  <View
                    style={{ flex: 1, backgroundColor: '#FEF2F2', borderRadius: 12, padding: 14 }}>
                    <Text style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 4 }}>
                      Anomaly amount
                    </Text>
                    <Text style={{ fontSize: 20, fontWeight: '700', color: '#DC2626' }}>
                      {formatINR(bill.totalFlaggedAmount)}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {flagged.length > 0 && (
              <View
                style={{
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
                  {flagged.length} item{flagged.length !== 1 ? 's show' : ' shows'} potential
                  pricing anomalies based on available regional benchmarks. This is not an
                  accusation of fraud.
                </Text>
              </View>
            )}

            <Text
              style={{
                fontSize: 12,
                fontWeight: '600',
                color: '#9CA3AF',
                letterSpacing: 0.5,
                textTransform: 'uppercase',
                marginBottom: 10,
              }}>
              Bill items · tap to expand
            </Text>
          </View>
        }
        ListFooterComponent={
          <View>
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
              }}>
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Export Report</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setConfirmDelete(true)}
              style={{
                marginTop: 12,
                borderRadius: 16,
                height: 54,
                backgroundColor: '#FEF2F2',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: '#FECACA',
              }}>
              <Text style={{ color: '#DC2626', fontSize: 15, fontWeight: '600' }}>Delete Bill</Text>
            </TouchableOpacity>
          </View>
        }
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      />

      {editingItem && (
        <CorrectionModal
          billId={billId}
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSaved={refresh}
        />
      )}
      <ConfirmDialog
        visible={confirmDelete}
        title="Delete Bill"
        message="This bill and its analysis will be permanently deleted."
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => {
          if (!deleting) setConfirmDelete(false);
        }}
      />
    </SafeAreaView>
  );
}
