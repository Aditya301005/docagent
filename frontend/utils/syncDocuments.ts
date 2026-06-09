/**
 * syncDocuments.ts
 *
 * Fetches all documents for the currently authenticated user from the
 * doc-agent backend and maps the server response to the frontend Document
 * type used by the Zustand store.
 *
 * This is the bridge that makes document history survive app reinstalls /
 * data clears — the server is the source of truth.
 */

import { getApiUrl } from '../constants/api';
import { Document, DocumentType, Entity } from '../types';

// ── Server response shape (matches DocumentResponse + ExtractionResultResponse) ─

interface ServerEntity {
  type: string;
  value: string;
  confidence?: number;
}

interface ServerClassification {
  class?: string;
  confidence?: number;
  all_scores?: Record<string, number>;
}

interface ServerResult {
  id: string;
  document_id: string;
  entities: ServerEntity[];
  classification: ServerClassification;
  structured_data?: any;
  processing_time_ms?: number;
  created_at: string;
}

interface ServerDocument {
  id: string;
  filename: string;
  status: string;
  is_locked: boolean;
  file_hash?: string | null;
  doc_type?: string | null;
  confidence?: number | null;
  created_at: string;
  result?: ServerResult | null;
}

// ── Mapping helpers ───────────────────────────────────────────────────────────

/**
 * Maps a server entity type string to the frontend Entity type union.
 * Unknown types fall back to 'name'.
 */
function mapEntityType(raw: string): Entity['type'] {
  const allowed: Entity['type'][] = ['company', 'date', 'address', 'total', 'name', 'phone', 'email'];
  const lower = raw?.toLowerCase() as Entity['type'];
  return allowed.includes(lower) ? lower : 'name';
}

/**
 * Maps a server document type string to the frontend DocumentType union.
 * Unknown types fall back to 'unknown'.
 */
function mapDocType(raw?: string | null): DocumentType {
  const allowed: DocumentType[] = [
    'invoice', 'receipt', 'contract', 'form',
    'letter', 'resume', 'id_card', 'report', 'unknown',
  ];
  if (!raw) return 'unknown';
  const lower = raw.toLowerCase() as DocumentType;
  return allowed.includes(lower) ? lower : 'unknown';
}

/**
 * Maps a single server DocumentResponse to the frontend Document interface.
 * The ownerKey is set by the caller so the Zustand store can scope it
 * correctly to the logged-in user.
 */
function mapServerDoc(serverDoc: ServerDocument, ownerKey: string): Document {
  const entities: Entity[] = (serverDoc.result?.entities ?? []).map((e) => ({
    type: mapEntityType(e.type),
    value: e.value,
    confidence: e.confidence ?? 1,
  }));

  // Prefer the classification result's confidence if available
  const confidence =
    serverDoc.result?.classification?.confidence ??
    serverDoc.confidence ??
    0;

  // Prefer the classification result's class if available
  const docType = mapDocType(
    serverDoc.result?.classification?.class ?? serverDoc.doc_type
  );

  return {
    id: serverDoc.id,
    ownerKey,
    filename: serverDoc.filename,
    uploadedAt: serverDoc.created_at,
    status: mapStatus(serverDoc.status),
    type: docType,
    confidence,
    // imageUri is a local camera URI and cannot be restored from the server.
    // We set it to '' — the history card gracefully falls back to the doc-type icon.
    imageUri: '',
    isLocked: serverDoc.is_locked,
    entities,
    structuredData: serverDoc.result?.structured_data ?? undefined,
  };
}

/**
 * Normalises the backend status value to the frontend union.
 * Backend uses mixed-case strings like "Completed"; frontend uses lowercase.
 */
function mapStatus(raw: string): Document['status'] {
  const lower = raw?.toLowerCase();
  if (lower === 'done' || lower === 'completed') return 'done';
  if (lower === 'processing') return 'processing';
  if (lower === 'error') return 'error';
  return 'pending';
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Fetches the authenticated user's document list from the doc-agent backend.
 *
 * @param token   - The JWT Bearer token stored in AsyncStorage after login.
 * @param ownerKey - The user's email (used as the Zustand ownerKey).
 * @returns An array of frontend Document objects ready to hydrate the store,
 *          or an empty array if the request fails (network error, 401, etc.).
 */
export async function syncDocumentsFromServer(
  token: string,
  ownerKey: string
): Promise<Document[]> {
  try {
    const baseUrl = await getApiUrl();
    const response = await fetch(`${baseUrl}/api/documents/`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      // Non-2xx — server is reachable but returned an error (e.g. 401 expired token).
      // Fail silently so the user still lands on the history screen.
      console.warn('[syncDocuments] server returned', response.status);
      return [];
    }

    const serverDocs: ServerDocument[] = await response.json();
    return serverDocs.map((doc) => mapServerDoc(doc, ownerKey));
  } catch (err) {
    // Network offline, timeout, JSON parse error, etc.
    console.warn('[syncDocuments] fetch failed:', err);
    return [];
  }
}

/**
 * Persists a locally-processed document to the server so it survives
 * app reinstalls / data clears.
 *
 * This is called fire-and-forget from the results screen — if it fails,
 * the user still has the document in their local store.
 *
 * @param token     - JWT Bearer token
 * @param imageUri  - Local file URI of the scanned image
 * @param doc       - The frontend Document object with processing results
 */
export async function saveDocumentToServer(
  token: string,
  imageUri: string,
  doc: Document,
): Promise<void> {
  try {
    const baseUrl = await getApiUrl();

    const formData = new FormData();

    // Determine the mime type and filename for the upload
    const mimeType = doc.mimeType || 'image/jpeg';
    const filename = doc.filename || 'scan.jpg';

    formData.append('file', {
      uri: imageUri,
      type: mimeType,
      name: filename,
    } as any);

    formData.append('doc_type', doc.type || 'unknown');
    formData.append('confidence', String(doc.confidence ?? 0));
    formData.append('entities_json', JSON.stringify(doc.entities || []));
    formData.append('classification_json', JSON.stringify({
      class: doc.type,
      confidence: doc.confidence,
    }));
    formData.append('structured_data_json', JSON.stringify(doc.structuredData || {}));
    if (doc.rawText) {
      formData.append('ocr_text', doc.rawText);
    }

    const response = await fetch(`${baseUrl}/api/documents/sync`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        // Note: Do NOT set Content-Type for multipart — fetch sets it with boundary
      },
      body: formData,
    });

    if (!response.ok) {
      console.warn('[saveDocumentToServer] server returned', response.status);
    }
  } catch (err) {
    // Fire-and-forget — don't crash the app if sync fails
    console.warn('[saveDocumentToServer] failed:', err);
  }
}

