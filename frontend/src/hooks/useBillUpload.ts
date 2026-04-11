import { useState } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { billsApi } from '../api/bills';
import type { UploadBillPayload } from '../types/bill.types';

export function useBillUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickDocument = async (): Promise<UploadBillPayload | null> => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
    });

    if (result.canceled) return null;

    const file = result.assets[0];
    return {
      uri: file.uri,
      name: file.name,
      mimeType: file.mimeType ?? 'application/pdf',
      city: '',
      state: '',
    };
  };

  const pickImage = async (): Promise<UploadBillPayload | null> => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (result.canceled) return null;

    const asset = result.assets[0];
    return {
      uri: asset.uri,
      name: `bill_${Date.now()}.jpg`,
      mimeType: 'image/jpeg',
      city: '',
      state: '',
    };
  };

  const uploadBill = async (payload: UploadBillPayload): Promise<string | null> => {
    try {
      setIsUploading(true);
      setError(null);
      const res = await billsApi.upload(payload);
      return res.data.data.billId;
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Upload failed. Please try again.');
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  return { pickDocument, pickImage, uploadBill, isUploading, error };
}
