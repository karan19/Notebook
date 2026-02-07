import { create } from "zustand";
import { get, post, patch, del } from 'aws-amplify/api';
import { fetchAuthSession } from 'aws-amplify/auth';

export interface Page {
    id: string;
    title?: string;
    contentKey: string;
    content?: string; // Loaded on demand
    order: number;
}

export interface Notebook {
    id: string;
    title: string;
    snippet?: string;
    isFavorite?: boolean;
    isPinned?: boolean;
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
    saveContent: (id: string, html: string, pageId: string) => Promise<void>;
    loadContent: (id: string, pageId: string) => Promise<string>;
    toggleFavorite: (id: string) => Promise<void>;
    togglePin: (id: string) => Promise<void>;
    currentFilter: 'all' | 'favorites' | 'trash';
    setFilter: (filter: 'all' | 'favorites' | 'trash') => void;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    uploadAsset: (file: File) => Promise<string>;
    addPage: (notebookId: string) => Promise<string>;
    deletePage: (notebookId: string, pageId: string) => Promise<void>;
    // New features
    sortBy: 'date' | 'name' | 'favorites';
    sortOrder: 'asc' | 'desc';
    setSort: (sortBy: 'date' | 'name' | 'favorites', sortOrder: 'asc' | 'desc') => void;
    recentNotebooks: string[]; // IDs of recently opened notebooks
    addToRecent: (id: string) => void;
    duplicateNotebook: (id: string) => Promise<string>;
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

// Load preferences from localStorage
const loadPreferences = () => {
    if (typeof window === 'undefined') return { sortBy: 'date', sortOrder: 'desc', recentNotebooks: [] };
    try {
        const prefs = localStorage.getItem('notebook-preferences');
        if (prefs) {
            const parsed = JSON.parse(prefs);
            return {
                sortBy: parsed.sortBy || 'date',
                sortOrder: parsed.sortOrder || 'desc',
                recentNotebooks: parsed.recentNotebooks || []
            };
        }
    } catch (e) {
        console.error('Failed to load preferences', e);
    }
    return { sortBy: 'date', sortOrder: 'desc', recentNotebooks: [] };
};

const savedPrefs = loadPreferences();

export const useNotebookStore = create<NotebookStore>((set, getStore) => ({
    notebooks: [],
    loading: false,
    currentFilter: 'all',
    searchQuery: "",
    sortBy: savedPrefs.sortBy as 'date' | 'name' | 'favorites',
    sortOrder: savedPrefs.sortOrder as 'asc' | 'desc',
    recentNotebooks: savedPrefs.recentNotebooks as string[],

    setFilter: (filter) => set({ currentFilter: filter }),
    setSearchQuery: (query) => set({ searchQuery: query }),
    setSort: (sortBy, sortOrder) => {
        set({ sortBy, sortOrder });
        // Persist to localStorage
        if (typeof window !== 'undefined') {
            try {
                const current = JSON.parse(localStorage.getItem('notebook-preferences') || '{}');
                localStorage.setItem('notebook-preferences', JSON.stringify({ ...current, sortBy, sortOrder }));
            } catch (e) { }
        }
    },
    addToRecent: (id) => set((state) => {
        const recent = [id, ...state.recentNotebooks.filter(r => r !== id)].slice(0, 5);
        // Persist to localStorage
        if (typeof window !== 'undefined') {
            try {
                const current = JSON.parse(localStorage.getItem('notebook-preferences') || '{}');
                localStorage.setItem('notebook-preferences', JSON.stringify({ ...current, recentNotebooks: recent }));
            } catch (e) { }
        }
        return { recentNotebooks: recent };
    }),

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
            });
        } catch (error) {
            console.error("Error updating notebook:", error);
            // Revert on failure (could be improved)
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
            });
        } catch (error) {
            console.error("Error deleting notebook:", error);
        }
    },

    getNotebook: async (id) => {
        const existing = getStore().notebooks.find((nb) => nb.id === id);
        if (existing && existing.pages && existing.pages.length > 0) return existing;

        try {
            const operation = get({
                apiName: API_NAME,
                path: `/notebooks/${id}`,
                options: { headers: await getAuthHeaders() }
            });
            const { body } = await operation.response;
            const notebook = await body.json() as unknown as Notebook;

            set((state) => ({
                notebooks: [
                    notebook,
                    ...state.notebooks.filter((n) => n.id !== id)
                ]
            }));
            return notebook;
        } catch (e) {
            console.error("Error loading notebook details", e);
            return undefined;
        }
    },

    saveContent: async (id, html, pageId) => {
        try {
            console.log(`[Store] Saving content for notebook ${id}, page ${pageId}`);

            // 1. Get Upload URL
            const urlOp = get({
                apiName: API_NAME,
                path: '/notebooks/urls/upload',
                options: {
                    queryParams: { id, pageId },
                    headers: await getAuthHeaders()
                }
            });
            const { body } = await urlOp.response;
            const { url } = await body.json() as unknown as { url: string };

            // 2. Upload to S3
            await fetch(url, {
                method: 'PUT',
                body: html,
                headers: { 'Content-Type': 'text/html' }
            });

            // 3. Update snippet (first 100 chars)
            const snippet = html.replace(/<[^>]*>?/gm, '').substring(0, 100);
            await getStore().updateNotebook(id, { snippet });

            // 4. Update local cache
            set((state) => ({
                notebooks: state.notebooks.map((nb) =>
                    nb.id === id ? {
                        ...nb,
                        snippet,
                        lastEditedAt: Date.now(),
                        pages: nb.pages.map(p => p.id === pageId ? { ...p, content: html } : p)
                    } : nb
                ),
            }));

        } catch (error) {
            console.error("Error saving content:", error);
            throw error;
        }
    },

    loadContent: async (id, pageId) => {
        try {
            console.log(`[Store] Loading content for notebook ${id}, page ${pageId}`);
            // Check cache first
            const notebook = getStore().notebooks.find(nb => nb.id === id);
            const page = notebook?.pages?.find(p => p.id === pageId);
            if (page?.content) {
                console.log(`[Store] Returning content from cache`);
                return page.content;
            }

            // 1. Get Download URL
            const urlOp = get({
                apiName: API_NAME,
                path: '/notebooks/urls/download',
                options: {
                    queryParams: { id, pageId },
                    headers: await getAuthHeaders()
                }
            });
            const { body } = await urlOp.response;
            const { url } = await body.json() as unknown as { url: string };

            // 2. Fetch from S3
            const res = await fetch(url);
            if (!res.ok) throw new Error("Failed to fetch content from S3");
            const html = await res.text();

            // 3. Cache in store
            set((state) => ({
                notebooks: state.notebooks.map((nb) =>
                    nb.id === id ? {
                        ...nb,
                        pages: nb.pages.map(p => p.id === pageId ? { ...p, content: html } : p)
                    } : nb
                ),
            }));

            return html;
        } catch (error) {
            console.error("Error loading content:", error);
            return "";
        }
    },

    toggleFavorite: async (id) => {
        const notebook = getStore().notebooks.find((n) => n.id === id);
        if (notebook) {
            const newVal = !notebook.isFavorite;
            await getStore().updateNotebook(id, { isFavorite: newVal });
        }
    },

    togglePin: async (id) => {
        const notebook = getStore().notebooks.find((n) => n.id === id);
        if (notebook) {
            const newVal = !notebook.isPinned;
            await getStore().updateNotebook(id, { isPinned: newVal });
        }
    },

    uploadAsset: async (file: File) => {
        try {
            console.log(`[Store] Uploading asset: ${file.name}`);
            // For now, using a temporary mock URL or base64 could be an option if backend support is limited
            // But ideally we implementation asset upload similar to content upload
            return "https://via.placeholder.com/150";
        } catch (e) {
            console.error("Asset upload failed", e);
            return "";
        }
    },

    addPage: async (notebookId) => {
        const notebook = getStore().notebooks.find(n => n.id === notebookId);
        if (!notebook) throw new Error("Notebook not found");

        const pageId = crypto.randomUUID();
        const newPage: Page = {
            id: pageId,
            contentKey: `notes/${notebookId}/${pageId}.html`,
            order: notebook.pages ? notebook.pages.length : 0,
            title: `Page ${(notebook.pages?.length || 0) + 1}`
        };

        const currentPages = notebook.pages || [];
        const updatedPages = [...currentPages, newPage];

        set((state) => ({
            notebooks: state.notebooks.map(n => n.id === notebookId ? { ...n, pages: updatedPages } : n)
        }));

        await getStore().updateNotebook(notebookId, { pages: updatedPages });
        return pageId;
    },

    deletePage: async (notebookId, pageId) => {
        const notebook = getStore().notebooks.find(n => n.id === notebookId);
        if (!notebook || !notebook.pages) return;

        const updatedPages = notebook.pages.filter(p => p.id !== pageId);

        set((state) => ({
            notebooks: state.notebooks.map(n => n.id === notebookId ? { ...n, pages: updatedPages } : n)
        }));

        await getStore().updateNotebook(notebookId, { pages: updatedPages });
    },

    duplicateNotebook: async (id) => {
        const source = await getStore().getNotebook(id);
        if (!source) throw new Error("Source notebook not found");

        const newId = await getStore().addNotebook(`${source.title} (Copy)`);

        // Load target to get its default page if any
        const target = await getStore().getNotebook(newId);
        if (!target) throw new Error("Failed to load target notebook");

        for (let i = 0; i < source.pages.length; i++) {
            const sourcePage = source.pages[i];
            const content = await getStore().loadContent(id, sourcePage.id);

            let targetPageId: string;
            if (i === 0 && target.pages && target.pages.length > 0) {
                // Reuse the first page created by default
                targetPageId = target.pages[0].id;
            } else {
                targetPageId = await getStore().addPage(newId);
            }

            await getStore().saveContent(newId, content, targetPageId);

            // Optionally update page title if it exists
            if (sourcePage.title) {
                const currentPages = (getStore().notebooks.find(n => n.id === newId)?.pages || []);
                const updatedPages = currentPages.map(p => p.id === targetPageId ? { ...p, title: sourcePage.title } : p);
                await getStore().updateNotebook(newId, { pages: updatedPages });
            }
        }

        return newId;
    }
}));
