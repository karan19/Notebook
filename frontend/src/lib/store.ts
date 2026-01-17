import { create } from "zustand";
import { generateClient } from 'aws-amplify/api';
import * as queries from './graphql';
import * as mutations from './graphql';

let client: any = null;
const getClient = () => {
    if (!client) {
        client = generateClient();
    }
    return client;
};

export interface Notebook {
    id: string;
    title: string;
    snippet?: string;
    isFavorite?: boolean;
    contentKey: string;
    content?: string; // Loaded on demand
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
}

export const useNotebookStore = create<NotebookStore>((set, get) => ({
    notebooks: [],
    loading: false,
    currentFilter: 'all',
    searchQuery: "",

    setFilter: (filter) => set({ currentFilter: filter }),
    setSearchQuery: (query) => set({ searchQuery: query }),

    fetchNotebooks: async () => {
        set({ loading: true });
        try {
            const result = await getClient().graphql({ query: queries.listNotebooks }) as any;
            const items = result.data.listNotebooks || [];
            set({ notebooks: items, loading: false });
        } catch (error: any) {
            console.error("Error fetching notebooks:");
            if (error.errors) {
                console.error("GraphQL Errors:", JSON.stringify(error.errors, null, 2));
            } else {
                console.error(error);
            }
            set({ loading: false });
        }
    },

    addNotebook: async (title = "Untitled Document") => {
        try {
            const result = await getClient().graphql({
                query: mutations.createNotebook,
                variables: { title }
            }) as any;
            const newNotebook = result.data.createNotebook;
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
            await getClient().graphql({
                query: mutations.updateNotebook,
                variables: {
                    id,
                    title: updates.title,
                    snippet: updates.snippet,
                    isFavorite: updates.isFavorite,
                    contentKey: updates.contentKey
                }
            });
        } catch (error) {
            console.error("Error updating notebook:", error);
            // Revert on error?
        }
    },

    deleteNotebook: async (id) => {
        set((state) => ({
            notebooks: state.notebooks.filter((nb) => nb.id !== id),
        }));

        try {
            await getClient().graphql({
                query: mutations.deleteNotebook,
                variables: { id }
            });
        } catch (error) {
            console.error("Error deleting notebook:", error);
        }
    },

    getNotebook: async (id) => {
        const existing = get().notebooks.find((nb) => nb.id === id);
        if (existing && existing.content) return existing;

        try {
            const result = await getClient().graphql({
                query: queries.getNotebook,
                variables: { id }
            }) as any;
            const nb = result.data.getNotebook;
            if (nb) {
                set((state) => ({
                    notebooks: state.notebooks.map(n => n.id === id ? { ...n, ...nb } : n)
                }));
            }
            return nb;
        } catch (error) {
            console.error("Error getting notebook:", error);
            return undefined;
        }
    },

    saveContent: async (id, html) => {
        try {
            // 1. Get Upload URL
            const urlResult = await getClient().graphql({
                query: queries.getUploadUrl,
                variables: { id }
            }) as any;
            const uploadUrl = urlResult.data.getUploadUrl;

            // 2. Upload to S3
            await fetch(uploadUrl, {
                method: 'PUT',
                body: html,
                headers: { 'Content-Type': 'text/html' }
            });

            // 3. Update snippet in DB (optional, first 100 chars of text)
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;
            const snippet = tempDiv.innerText.slice(0, 100) + '...';

            await get().updateNotebook(id, { snippet });
        } catch (error) {
            console.error("Error saving content to S3:", error);
        }
    },

    loadContent: async (id) => {
        try {
            // 1. Get Download URL
            console.log(`[Store] Requesting download URL for notebook: ${id}`);
            const urlResult = await getClient().graphql({
                query: queries.getDownloadUrl,
                variables: { id }
            }) as any;

            if (urlResult.errors) {
                console.error("[Store] AppSync errors for getDownloadUrl:", urlResult.errors);
                return "";
            }

            const downloadUrl = urlResult.data?.getDownloadUrl;
            if (!downloadUrl) {
                console.error("[Store] No download URL returned from AppSync");
                return "";
            }

            // 2. Fetch from S3
            const response = await fetch(downloadUrl);

            if (response.status === 404 || response.status === 403) {
                // If the file doesn't exist yet, it's a new notebook
                console.log("[Store] Content not found in S3 (likely a new notebook), returning empty.");
                return "";
            }

            if (!response.ok) {
                console.error(`[Store] S3 Fetch failed with status ${response.status}:`, await response.text());
                return "";
            }

            const html = await response.text();

            // 3. Cache in store
            set((state) => ({
                notebooks: state.notebooks.map((nb) =>
                    nb.id === id ? { ...nb, content: html } : nb
                ),
            }));

            return html;
        } catch (error: any) {
            console.error("Error loading content from S3:", error);
            // Log more details if it's a TypeError or similar
            if (error.message) console.error("Error Message:", error.message);
            return "";
        }
    },

    toggleFavorite: async (id: string) => {
        const notebook = get().notebooks.find(n => n.id === id);
        if (!notebook) return;

        const newValue = !notebook.isFavorite;

        // Optimistic update
        set((state) => ({
            notebooks: state.notebooks.map((nb) =>
                nb.id === id ? { ...nb, isFavorite: newValue } : nb
            ),
        }));

        try {
            await getClient().graphql({
                query: mutations.updateNotebook,
                variables: {
                    id,
                    isFavorite: newValue
                }
            });
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
