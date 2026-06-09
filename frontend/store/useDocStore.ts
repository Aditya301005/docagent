import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Document } from '../types';

interface DocStore {
  documents: Document[];
  currentUserKey: string;
  setCurrentUserKey: (userKey: string) => void;
  getVisibleDocuments: (includeLocked?: boolean) => Document[];
  addDocument: (doc: Document) => void;
  updateDocument: (id: string, updates: Partial<Document>) => void;
  removeDocument: (id: string) => void;
  clearAll: () => void;
  getById: (id: string) => Document | undefined;
  toggleLock: (id: string) => void;
  /**
   * Merges documents fetched from the server into the local store.
   * Server documents replace any local copy with the same ID.
   * Local-only documents (e.g. guest scans) are left untouched.
   */
  hydrateFromServer: (serverDocs: Document[]) => void;
  
  // 🔐 Vault
  isVaultAuthenticated: boolean;
  setVaultAuthenticated: (authenticated: boolean) => void;
  
  // 📁 Folders
  folders: Folder[];
  addFolder: (name: string, color?: string) => void;
  removeFolder: (id: string) => void;
  updateFolder: (id: string, updates: Partial<Folder>) => void;
  getFolders: () => Folder[];
}

import { Folder } from '../types';

const DEFAULT_USER_KEY = 'guest';

const normalizeUserKey = (userKey?: string | null) => {
  const trimmed = userKey?.trim().toLowerCase();
  return trimmed || DEFAULT_USER_KEY;
};

export const useDocStore = create<DocStore>()(
  persist(
    (set, get) => ({
      documents: [],
      folders: [],
      currentUserKey: DEFAULT_USER_KEY,
      isVaultAuthenticated: false,
      setVaultAuthenticated: (authenticated) => set({ isVaultAuthenticated: authenticated }),
      setCurrentUserKey: (userKey) =>
        set((state) => ({
          currentUserKey: normalizeUserKey(userKey),
        })),
      getVisibleDocuments: (includeLocked = false) => {
        const currentUserKey = normalizeUserKey(get().currentUserKey);
        return get().documents.filter((doc) => {
          const belongsToCurrentUser = normalizeUserKey(doc.ownerKey) === currentUserKey;
          if (!belongsToCurrentUser) return false;
          // If includeLocked is false, hide locked docs
          if (!includeLocked && doc.isLocked) return false;
          // If includeLocked is true, we ONLY want locked docs (for the Vault view)
          if (includeLocked && !doc.isLocked) return false;
          return true;
        });
      },
      addDocument: (doc) =>
        set((state) => ({
          documents: [
            { ...doc, ownerKey: doc.ownerKey || normalizeUserKey(state.currentUserKey) },
            ...state.documents,
          ],
        })),
      updateDocument: (id, updates) => set((state) => ({
        documents: state.documents.map((doc) => {
          const belongsToCurrentUser =
            normalizeUserKey(doc.ownerKey) === normalizeUserKey(state.currentUserKey);
          return doc.id === id && belongsToCurrentUser ? { ...doc, ...updates } : doc;
        })
      })),
      removeDocument: (id) => set((state) => ({
        documents: state.documents.filter((doc) => {
          const belongsToCurrentUser =
            normalizeUserKey(doc.ownerKey) === normalizeUserKey(state.currentUserKey);
          return !(doc.id === id && belongsToCurrentUser);
        })
      })),
      clearAll: () => set((state) => ({
        documents: state.documents.filter(
          (doc) => normalizeUserKey(doc.ownerKey) !== normalizeUserKey(state.currentUserKey)
        ),
      })),
      getById: (id) =>
        get().documents.find(
          (doc) =>
            doc.id === id &&
            normalizeUserKey(doc.ownerKey) === normalizeUserKey(get().currentUserKey)
        ),
      toggleLock: (id) => set((state) => ({
        documents: state.documents.map((doc) =>
          doc.id === id ? { ...doc, isLocked: !doc.isLocked } : doc
        )
      })),
      hydrateFromServer: (serverDocs) =>
        set((state) => {
          // Build a map of existing docs by id for O(1) lookup
          const existingById = new Map(state.documents.map((d) => [d.id, d]));
          // Upsert: server wins over local for the same id
          serverDocs.forEach((doc) => existingById.set(doc.id, doc));
          // Convert back to array; keep original order for local-only docs,
          // prepend server docs so they appear at top of history
          const serverIds = new Set(serverDocs.map((d) => d.id));
          const localOnly = state.documents.filter((d) => !serverIds.has(d.id));
          return { documents: [...serverDocs, ...localOnly] };
        }),
        
      // 📁 Folder Actions
      getFolders: () => {
        const currentUserKey = normalizeUserKey(get().currentUserKey);
        return get().folders.filter((f) => normalizeUserKey(f.ownerKey) === currentUserKey);
      },
      addFolder: (name, color = '#00C896') =>
        set((state) => ({
          folders: [
            {
              id: Date.now().toString(),
              name,
              color,
              ownerKey: normalizeUserKey(state.currentUserKey),
              createdAt: new Date().toISOString(),
            },
            ...state.folders,
          ],
        })),
      removeFolder: (id) =>
        set((state) => ({
          folders: state.folders.filter((f) => f.id !== id),
          // Remove this folder ID from all documents' folderIds lists
          documents: state.documents.map((doc) => 
            doc.folderIds?.includes(id) 
              ? { ...doc, folderIds: doc.folderIds.filter(fid => fid !== id) } 
              : doc
          ),
        })),
      updateFolder: (id, updates) =>
        set((state) => ({
          folders: state.folders.map((f) => (f.id === id ? { ...f, ...updates } : f)),
        })),
    }),
    {
      name: 'doc_history', // name of item in storage
      storage: createJSONStorage(() => AsyncStorage),
      // isVaultAuthenticated must NOT be persisted — it should always
      // reset to false on every app launch so the user must re-enter their PIN.
      // The actual PIN is stored separately under VAULT_PIN_KEY in AsyncStorage.
      partialize: (state) => {
        const { isVaultAuthenticated, ...rest } = state;
        return rest;
      },
    }
  )
);
