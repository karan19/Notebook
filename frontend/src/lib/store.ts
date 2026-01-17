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
}

export const useNotebookStore = create<NotebookStore>((set, get) => ({
    notebooks: [],
    loading: false,

    fetchNotebooks: async () => {
        set({ loading: true });
        try {
            const result = await getClient().graphql({ query: queries.listNotebooks }) as any;
            const items = result.data.listNotebooks || [];
            set({ notebooks: items, loading: false });
        } catch (error) {
            console.error("Error fetching notebooks:", error);
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
            const urlResult = await getClient().graphql({
                query: queries.getDownloadUrl,
                variables: { id }
            }) as any;
            const downloadUrl = urlResult.data.getDownloadUrl;

            // 2. Fetch from S3
            const response = await fetch(downloadUrl);
            const html = await response.text();

            // 3. Cache in store
            set((state) => ({
                notebooks: state.notebooks.map((nb) =>
                    nb.id === id ? { ...nb, content: html } : nb
                ),
            }));

            return html;
        } catch (error) {
            console.error("Error loading content from S3:", error);
            return "";
        }
    },
}));
