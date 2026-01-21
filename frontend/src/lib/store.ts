import { create } from "zustand";
import { get, post, patch, del } from 'aws-amplify/api';
import { fetchAuthSession } from 'aws-amplify/auth';

export interface Notebook {
    id: string;
    title: string;
    snippet?: string;
    isFavorite?: boolean;
    contentKey: string;
    content?: string; // Cache
    tags: string[];
    lastEditedAt: number;
    createdAt: number;
}

interface NotebookStore {
    notebooks: Notebook[];
    loading: boolean;
    fetchNotebooks: () => Promise<void>;
    addNotebook: (title?: string) => Promise<string>;
    updateNotebook: (id: string, updates: Partial<Notebook>) => Promise<void>;
    deleteNotebook: (id: string) => Promise<void>;
    getNotebook: (id: string) => Promise<Notebook | undefined>;
    saveContent: (id: string, html: string) => Promise<void>;
    loadContent: (id: string) => Promise<string>;
    toggleFavorite: (id: string) => Promise<void>;
    currentFilter: 'all' | 'favorites' | 'trash';
    setFilter: (filter: 'all' | 'favorites' | 'trash') => void;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    uploadAsset: (file: File) => Promise<string>;
}

const getAuthHeaders = async (): Promise<Record<string, string>> => {
    try {
        const session = await fetchAuthSession();
        const token = session.tokens?.idToken?.toString();
        return token ? { Authorization: token } : {};
    } catch (e) {
        return {};
    }
};

const API_NAME = 'NotebookApi';

export const useNotebookStore = create<NotebookStore>((set, getStore) => ({
    notebooks: [],
    loading: false,
    currentFilter: 'all',
    searchQuery: "",

    setFilter: (filter) => set({ currentFilter: filter }),
    setSearchQuery: (query) => set({ searchQuery: query }),

    fetchNotebooks: async () => {
        set({ loading: true });
        try {
            const operation = get({
                apiName: API_NAME,
                path: '/notebooks',
                options: { headers: await getAuthHeaders() }
            });
            const { body } = await operation.response;
            const items = await body.json() as any[];
            set({ notebooks: items || [], loading: false });
        } catch (error: any) {
            console.error("Error fetching notebooks:", error);
            set({ loading: false });
        }
    },

    addNotebook: async (title = "Untitled Document") => {
        try {
            const operation = post({
                apiName: API_NAME,
                path: '/notebooks',
                options: {
                    body: { title },
                    headers: await getAuthHeaders()
                }
            });
            const { body } = await operation.response;
            const newNotebook = await body.json() as any;
            set((state) => ({
                notebooks: [newNotebook, ...state.notebooks],
            }));
            return newNotebook.id;
        } catch (error) {
            console.error("Error adding notebook:", error);
            throw error;
        }
    },

    updateNotebook: async (id, updates) => {
        // Optimistic update
        set((state) => ({
            notebooks: state.notebooks.map((nb) =>
                nb.id === id ? { ...nb, ...updates, lastEditedAt: Date.now() } : nb
            ),
        }));

        try {
            await patch({
                apiName: API_NAME,
                path: `/notebooks/${id}`,
                options: {
                    body: updates as any,
                    headers: await getAuthHeaders()
                }
            }).response;
        } catch (error) {
            console.error("Error updating notebook:", error);
        }
    },

    deleteNotebook: async (id) => {
        set((state) => ({
            notebooks: state.notebooks.filter((nb) => nb.id !== id),
        }));

        try {
            await del({
                apiName: API_NAME,
                path: `/notebooks/${id}`,
                options: { headers: await getAuthHeaders() }
            }).response;
        } catch (error) {
            console.error("Error deleting notebook:", error);
        }
    },

    getNotebook: async (id) => {
        const existing = getStore().notebooks.find((nb) => nb.id === id);
        if (existing && existing.content) return existing;

        try {
            const operation = get({
                apiName: API_NAME,
                path: `/notebooks/${id}`,
                options: { headers: await getAuthHeaders() }
            });
            const { body } = await operation.response;
            const nb = await body.json() as any;
            if (nb) {
                set((state) => ({
                    notebooks: state.notebooks.map(n => n.id === id ? { ...n, ...nb } : n)
                }));
                return nb;
            }
            return nb;
        } catch (error) {
            console.error("Error getting notebook:", error);
            return undefined;
        }
    },

    saveContent: async (id, html) => {
        try {
            console.log(`[Store] Saving content for notebook ${id}`);

            // 1. Get Upload URL
            const urlOp = get({
                apiName: API_NAME,
                path: '/notebooks/urls/upload',
                options: {
                    queryParams: { id },
                    headers: await getAuthHeaders()
                }
            });
            const { body: urlBody } = await urlOp.response;
            const { url: uploadUrl } = await urlBody.json() as any;

            // 2. Upload to S3
            const response = await fetch(uploadUrl, {
                method: 'PUT',
                body: html,
                headers: { 'Content-Type': 'text/html' }
            });

            if (!response.ok) {
                throw new Error(`S3 upload failed with status: ${response.status}`);
            }

            // 3. Update snippet and local cache
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;
            const textContent = tempDiv.innerText || "";
            const snippet = textContent.slice(0, 100) + (textContent.length > 100 ? '...' : '');

            // Update local state
            set((state) => ({
                notebooks: state.notebooks.map((nb) =>
                    nb.id === id ? {
                        ...nb,
                        snippet,
                        lastEditedAt: Date.now(),
                        content: html
                    } : nb
                ),
            }));

            // 4. Persist snippet and metadata to DynamoDB
            await getStore().updateNotebook(id, { snippet });
            console.log(`[Store] Save complete for ${id}`);
        } catch (error) {
            console.error("Error saving content to S3:", error);
        }
    },

    loadContent: async (id) => {
        try {
            console.log(`[Store] Loading content for notebook ${id}`);
            // Check cache first
            const notebook = getStore().notebooks.find(nb => nb.id === id);
            if (notebook?.content) {
                console.log(`[Store] Returning content from cache`);
                return notebook.content;
            }

            // 1. Get Download URL
            const urlOp = get({
                apiName: API_NAME,
                path: '/notebooks/urls/download',
                options: {
                    queryParams: { id },
                    headers: await getAuthHeaders()
                }
            });
            const { body: urlBody } = await urlOp.response;
            const { url: downloadUrl } = await urlBody.json() as any;

            if (!downloadUrl) {
                console.warn("[Store] No download URL returned");
                return "";
            }

            // 2. Fetch from S3
            console.log(`[Store] Fetching from S3...`);
            const response = await fetch(downloadUrl);
            if (!response.ok) {
                console.warn(`[Store] S3 fetch failed with status: ${response.status}`);
                return "";
            }

            const html = await response.text();
            console.log(`[Store] Content fetched successfully (${html.length} chars)`);

            // 3. Cache in store
            set((state) => ({
                notebooks: state.notebooks.map((nb) =>
                    nb.id === id ? { ...nb, content: html } : nb
                ),
            }));

            return html;
        } catch (error: any) {
            console.error("Error loading content from S3:", error);
            return "";
        }
    },

    uploadAsset: async (file: File) => {
        try {
            console.log(`[Store] Uploading asset: ${file.name}`);

            // 1. Get Asset Upload URL
            const urlOp = get({
                apiName: API_NAME,
                path: '/assets/upload',
                options: {
                    queryParams: {
                        filename: file.name,
                        contentType: file.type
                    },
                    headers: await getAuthHeaders()
                }
            });
            const { body: urlBody } = await urlOp.response;
            const { url: uploadUrl } = await urlBody.json() as any;

            if (!uploadUrl) throw new Error("No upload URL returned");

            // 2. Upload to S3
            await fetch(uploadUrl, {
                method: 'PUT',
                body: file,
                headers: { 'Content-Type': file.type }
            });

            // Return clean URL (strip query params)
            const publicUrl = uploadUrl.split('?')[0];
            return publicUrl;
        } catch (error) {
            console.error("Error uploading asset:", error);
            throw error;
        }
    },

    toggleFavorite: async (id: string) => {
        const notebook = getStore().notebooks.find(n => n.id === id);
        if (!notebook) return;

        const newValue = !notebook.isFavorite;

        // Optimistic update
        set((state) => ({
            notebooks: state.notebooks.map((nb) =>
                nb.id === id ? { ...nb, isFavorite: newValue } : nb
            ),
        }));

        try {
            await patch({
                apiName: API_NAME,
                path: `/notebooks/${id}`,
                options: {
                    body: { isFavorite: newValue },
                    headers: await getAuthHeaders()
                }
            }).response;
        } catch (error) {
            console.error("Error toggling favorite:", error);
            // Revert on error
            set((state) => ({
                notebooks: state.notebooks.map((nb) =>
                    nb.id === id ? { ...nb, isFavorite: !newValue } : nb
                ),
            }));
        }
    },
}));
