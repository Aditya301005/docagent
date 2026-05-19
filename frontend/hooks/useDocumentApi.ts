import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiUrl } from '../constants/api';
import { ClassifyResult, Entity, VQAResult } from '../types';

type ProcessResponse = {
  doc_type: string;
  confidence: number;
  classification: {
    class: string;
    confidence: number;
    source?: string;
  };
  entities: Entity[];
  processing_time_ms: number;
  needs_review?: boolean;
  raw_text?: string;
};

type UploadFileOptions = {
  filename?: string;
  mimeType?: string;
};

export function useDocumentApi() {
  const guessMimeType = (imageUri: string, mimeType?: string) => {
    if (mimeType) {
      return mimeType;
    }

    const cleanUri = imageUri.split('?')[0].toLowerCase();
    if (cleanUri.endsWith('.pdf')) return 'application/pdf';
    if (cleanUri.endsWith('.png')) return 'image/png';
    if (cleanUri.endsWith('.webp')) return 'image/webp';
    return 'image/jpeg';
  };

  const guessFilename = (imageUri: string, filename?: string, mimeType?: string) => {
    if (filename) {
      return filename;
    }

    const lastSegment = decodeURIComponent(imageUri.split('/').pop() || '').split('?')[0];
    if (lastSegment && lastSegment.includes('.')) {
      return lastSegment;
    }

    if (mimeType === 'application/pdf') return 'document.pdf';
    if (mimeType === 'image/png') return 'document.png';
    if (mimeType === 'image/webp') return 'document.webp';
    return 'document.jpg';
  };

  const buildImageFormData = (imageUri: string, options: UploadFileOptions = {}) => {
    const mimeType = guessMimeType(imageUri, options.mimeType);
    const filename = guessFilename(imageUri, options.filename, mimeType);
    const formData = new FormData();
    formData.append('file', {
      uri: imageUri,
      type: mimeType,
      name: filename,
    } as any);
    return formData;
  };

  const processDocument = async (imageUri: string, options: UploadFileOptions = {}): Promise<ProcessResponse> => {
    const apiBase = await getApiUrl();
    const res = await axios.post(`${apiBase}/api/process`, buildImageFormData(imageUri, options), {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 45000,
    });

    return res.data as ProcessResponse;
  };

  const classifyDocument = async (imageUri: string, options: UploadFileOptions = {}): Promise<ClassifyResult> => {
    const result = await processDocument(imageUri, options);
    return {
      class: (result.classification?.class || result.doc_type || 'unknown') as ClassifyResult['class'],
      confidence: result.classification?.confidence ?? result.confidence ?? 0,
      all_scores: {},
    };
  };

  const extractEntities = async (imageUri: string, options: UploadFileOptions = {}) => {
    const result = await processDocument(imageUri, options);
    return {
      entities: result.entities || [],
      raw_text: result.raw_text || '',
      source: result.classification?.source || '',
    };
  };

  const askQuestion = async (imageUri: string, question: string, options: UploadFileOptions = {}): Promise<VQAResult> => {
    const formData = buildImageFormData(imageUri, options);
    formData.append('question', question);

    const apiBase = await getApiUrl();
    const token = await AsyncStorage.getItem('auth_token');
    const headers: Record<string, string> = { 'Content-Type': 'multipart/form-data' };
    if (token && token !== 'guest') {
      headers.Authorization = `Bearer ${token}`;
    }

    const res = await axios.post(`${apiBase}/api/qa/inline`, formData, {
      headers,
      timeout: 120000, // 2 min — needed for multi-page PDF OCR + Gemini
    });

    return res.data as VQAResult;
  };

  return {
    processDocument,
    classifyDocument,
    extractEntities,
    askQuestion,
  };
}
