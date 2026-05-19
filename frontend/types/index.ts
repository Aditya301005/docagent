export interface Document {
  id: string;
  ownerKey?: string;
  filename: string;
  mimeType?: string;
  uploadedAt: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  type: DocumentType;
  confidence: number;
  imageUri: string;
  pages?: string[];        // for batch/multi-page scans
  entities?: Entity[];
  rawText?: string;
  folderIds?: string[];
  tags?: string[];
  isLocked?: boolean;
  notes?: string;          // user personal annotations
}

export interface Folder {
  id: string;
  name: string;
  color: string;
  ownerKey: string;
  createdAt: string;
}

export type DocumentType = 
  'invoice' | 'receipt' | 'contract' | 'form' | 
  'letter' | 'resume' | 'id_card' | 'report' | 'unknown';

export interface Entity {
  type: 'company' | 'date' | 'address' | 'total' | 'name' | 'phone' | 'email';
  value: string;
  confidence: number;
}

export interface QAMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ApiResponse<T = any> {
  status: 'done' | 'error';
  result: T;
  processing_time_ms: number;
}

export interface ClassifyResult {
  class: DocumentType;
  confidence: number;
  all_scores: Record<string, number>;
}

export interface ExtractResult {
  entities: Entity[];
}

export interface VQAResult {
  answer: string;
  confidence: number;
}
