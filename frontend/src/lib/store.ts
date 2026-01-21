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

export interface Page {
    id: string;
    title?: string;
    contentKey: string;
    content?: string; // Loaded on demand
}

export interface Notebook {
    id: string;
    title: string;
    snippet?: string;
    isFavorite?: boolean;
    contentKey: string;
    content?: string; // DEPRECATED: use pages instead
    pages: Page[];
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
    saveContent: (id: string, html: string, pageId?: string) => Promise<void>;
    loadContent: (id: string, pageId?: string) => Promise<string>;
    toggleFavorite: (id: string) => Promise<void>;
    currentFilter: 'all' | 'favorites' | 'trash';
    setFilter: (filter: 'all' | 'favorites' | 'trash') => void;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    uploadAsset: (file: File) => Promise<string>;
    addPage: (notebookId: string, title?: string) => Promise<void>;
    updatePage: (notebookId: string, pageId: string, title: string) => Promise<void>;
    deletePage: (notebookId: string, pageId: string) => Promise<void>;
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
            // Ensure pages is always an array
            const sanitizedItems = items.map((item: any) => ({
                ...item,
                pages: item.pages || []
            }));
            set({ notebooks: sanitizedItems, loading: false });
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
                notebooks: [{ ...newNotebook, pages: newNotebook.pages || [] }, ...state.notebooks],
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
                    contentKey: updates.contentKey,
                    tags: updates.tags,
                    pages: updates.pages?.map(p => ({
                        id: p.id,
                        title: p.title,
                        contentKey: p.contentKey
                    }))
                }
            });
        } catch (error) {
            console.error("Error updating notebook:", error);
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
        if (existing && existing.pages && existing.pages.length > 0) return existing;

        try {
            const result = await getClient().graphql({
                query: queries.getNotebook,
                variables: { id }
            }) as any;
            const nb = result.data.getNotebook;
            if (nb) {
                const sanitizedNb = { ...nb, pages: nb.pages || [] };
                set((state) => ({
                    notebooks: state.notebooks.map(n => n.id === id ? { ...n, ...sanitizedNb } : n)
                }));
                return sanitizedNb;
            }
            return nb;
        } catch (error) {
            console.error("Error getting notebook:", error);
            return undefined;
        }
    },

    saveContent: async (id, html, pageId) => {
        try {
            // 1. Get Upload URL
            const urlResult = await getClient().graphql({
                query: queries.getUploadUrl,
                variables: { id, pageId }
            }) as any;
            const uploadUrl = urlResult.data.getUploadUrl;

            // 2. Upload to S3
            await fetch(uploadUrl, {
                method: 'PUT',
                body: html,
                headers: { 'Content-Type': 'text/html' }
            });

            // 3. Update snippet and local cache
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;
            const snippet = tempDiv.innerText.slice(0, 100) + '...';

            if (pageId) {
                set((state) => ({
                    notebooks: state.notebooks.map((nb) =>
                        nb.id === id ? {
                            ...nb,
                            snippet,
                            pages: nb.pages.map(p => p.id === pageId ? { ...p, content: html } : p)
                        } : nb
                    ),
                }));
            } else {
                await get().updateNotebook(id, { snippet });
            }
        } catch (error) {
            console.error("Error saving content to S3:", error);
        }
    },

    loadContent: async (id, pageId) => {
        try {
            // Check cache first
            const notebook = get().notebooks.find(nb => nb.id === id);
            if (pageId) {
                const page = notebook?.pages.find(p => p.id === pageId);
                if (page?.content) return page.content;
            } else if (notebook?.content) {
                return notebook.content;
            }

            // 1. Get Download URL
            const urlResult = await getClient().graphql({
                query: queries.getDownloadUrl,
                variables: { id, pageId }
            }) as any;

            if (urlResult.errors) return "";
            const downloadUrl = urlResult.data?.getDownloadUrl;
            if (!downloadUrl) return "";

            // 2. Fetch from S3
            const response = await fetch(downloadUrl);
            if (!response.ok) return "";

            const html = await response.text();

            // 3. Cache in store
            set((state) => ({
                notebooks: state.notebooks.map((nb) =>
                    nb.id === id ? (
                        pageId ? {
                            ...nb,
                            pages: nb.pages.map(p => p.id === pageId ? { ...p, content: html } : p)
                        } : { ...nb, content: html }
                    ) : nb
                ),
            }));

            return html;
        } catch (error: any) {
            console.error("Error loading content from S3:", error);
            return "";
        }
    },

    addPage: async (notebookId, title = "New Page") => {
        const notebook = get().notebooks.find(n => n.id === notebookId);
        if (!notebook) return;

        const newPage: Page = {
            id: crypto.randomUUID(),
            title,
            contentKey: `notes/${notebookId}/pages/${Date.now()}.html`,
        };

        const updatedPages = [...notebook.pages, newPage];
        await get().updateNotebook(notebookId, { pages: updatedPages });
    },

    updatePage: async (notebookId, pageId, title) => {
        const notebook = get().notebooks.find(n => n.id === notebookId);
        if (!notebook) return;

        const updatedPages = notebook.pages.map(p =>
            p.id === pageId ? { ...p, title } : p
        );
        await get().updateNotebook(notebookId, { pages: updatedPages });
    },

    deletePage: async (notebookId, pageId) => {
        const notebook = get().notebooks.find(n => n.id === notebookId);
        if (!notebook) return;

        const updatedPages = notebook.pages.filter(p => p.id !== pageId);
        await get().updateNotebook(notebookId, { pages: updatedPages });
    },

    uploadAsset: async (file: File) => {
        try {
            console.log(`[Store] Uploading asset: ${file.name}`);
            const result = await getClient().graphql({
                query: queries.getAssetUploadUrl,
                variables: {
                    filename: file.name,
                    contentType: file.type
                }
            }) as any;

            const uploadUrl = result.data.getAssetUploadUrl;
            if (!uploadUrl) throw new Error("No upload URL returned");

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
