import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
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
    version?: number;
    paperStyle?: 'clean' | 'dots' | 'grid' | 'lines';
    lastEditedAt: number;
    createdAt: number;
}
 
export interface ApiKey {
    apiKey: string;
    userId: string;
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
    // Deletion Persistence
    pendingDeletions: string[];
    deletionTimeouts: Record<string, any>; // Store timeout IDs
    deleteNotebookWithUndo: (id: string, onProgress: (msg: string) => void) => void;
    undoDeletion: (id: string) => void;
    setPendingDeletion: (id: string, isPending: boolean) => void;
    // API Keys
    apiKeys: ApiKey[];
    fetchApiKeys: () => Promise<void>;
    createApiKey: () => Promise<string>;
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
const updateQueue: Record<string, Promise<any>> = {};

export const useNotebookStore = create<NotebookStore>()(
    persist(
        (set, getStore) => ({
            notebooks: [],
            loading: false,
            currentFilter: 'all',
            searchQuery: "",
            sortBy: 'date',
            sortOrder: 'desc',
            recentNotebooks: [],
            pendingDeletions: [],
            deletionTimeouts: {},
            apiKeys: [],

            setFilter: (filter) => set({ currentFilter: filter }),
            setSearchQuery: (query) => set({ searchQuery: query }),
            setSort: (sortBy, sortOrder) => {
                set({ sortBy, sortOrder });
            },
            setPendingDeletion: (id, isPending) => set((state) => {
                const next = isPending 
                    ? [...state.pendingDeletions, id]
                    : state.pendingDeletions.filter(pid => pid !== id);
                return { pendingDeletions: next };
            }),
            addToRecent: (id) => set((state) => {
                const recent = [id, ...state.recentNotebooks.filter(r => r !== id)].slice(0, 5);
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
                // 1. Optimistic Update (Immediate UI response)
                set((state) => ({
                    notebooks: state.notebooks.map((nb) =>
                        nb.id === id ? { ...nb, ...updates, lastEditedAt: Date.now() } : nb
                    ),
                }));

                // 2. Queue the Backend Request
                // We use a per-notebook queue to ensure updates are sequential and versions stay in sync
                const queue = updateQueue[id] || Promise.resolve();
                updateQueue[id] = queue.then(async () => {
                    let retryCount = 0;
                    const maxRetries = 1;

                    while (retryCount <= maxRetries) {
                        try {
                            const notebook = getStore().notebooks.find(n => n.id === id);
                            const currentVersion = notebook?.version;

                            const operation = patch({
                                apiName: API_NAME,
                                path: `/notebooks/${id}`,
                                options: {
                                    body: { ...updates, version: currentVersion } as any,
                                    headers: await getAuthHeaders()
                                }
                            });

                            const { body } = await operation.response;
                            const updatedNotebook = await body.json() as any;

                            // Update state with the definitive server version
                            set((state) => ({
                                notebooks: state.notebooks.map((nb) =>
                                    nb.id === id ? { ...nb, version: updatedNotebook.version } : nb
                                ),
                            }));
                            return; // Success

                        } catch (error: any) {
                            console.error(`[Store] Error updating notebook ${id}:`, error);
                            
                            // Check for 409 Conflict
                            const isConflict = error.response?.statusCode === 409 || 
                                             error.name === 'ConflictException' ||
                                             (error.toString && error.toString().includes('409'));

                            if (isConflict && retryCount < maxRetries) {
                                console.log(`[Store] Version mismatch for ${id}, reloading and retrying...`);
                                await getStore().getNotebook(id); // Force reload fresh version
                                retryCount++;
                                continue; // Retry the loop
                            }
                            throw error; // Give up after retries or on other errors
                        }
                    }
                }).catch((err: any) => {
                    console.error(`[Store] Sequential update failed for ${id}:`, err);
                });

                // Wait for the queue to resolve so the caller knows it's finished
                await updateQueue[id];
            },

            deleteNotebook: async (id) => {
                // Persistent removal from the visible list
                set((state) => ({
                    notebooks: state.notebooks.filter((nb) => nb.id !== id),
                    pendingDeletions: state.pendingDeletions.filter(pid => pid !== id)
                }));

                try {
                    const authHeaders = await getAuthHeaders();
                    console.log(`[Store] Executing DELETE for notebook ${id}`);
                    const operation = del({
                        apiName: API_NAME,
                        path: `/notebooks/${id}`,
                        options: { headers: authHeaders }
                    });
                    await operation.response;
                    console.log(`[Store] Successfully deleted notebook ${id}`);
                } catch (error) {
                    console.error("Error deleting notebook:", error);
                    // Add back if it failed? (Maybe too complex for now, but good for UX)
                    getStore().fetchNotebooks(); 
                }
            },

            deleteNotebookWithUndo: (id, onProgress) => {
                const { deleteNotebook, setPendingDeletion, deletionTimeouts } = getStore();
                
                // 1. Mark as pending
                setPendingDeletion(id, true);

                // 2. Schedule the actual delete
                const timeout = setTimeout(() => {
                    deleteNotebook(id);
                    // Cleanup timeout Ref
                    set((state) => {
                        const next = { ...state.deletionTimeouts };
                        delete next[id];
                        return { deletionTimeouts: next };
                    });
                }, 2500); // Slightly longer for safety

                // 3. Store the timeout ID
                set((state) => ({
                    deletionTimeouts: { ...state.deletionTimeouts, [id]: timeout }
                }));
            },

            undoDeletion: (id) => {
                const { deletionTimeouts, setPendingDeletion } = getStore();
                const timeout = deletionTimeouts[id];
                if (timeout) {
                    clearTimeout(timeout);
                    setPendingDeletion(id, false);
                    set((state) => {
                        const next = { ...state.deletionTimeouts };
                        delete next[id];
                        return { deletionTimeouts: next };
                    });
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

                    // 2. Replace any signed URLs back with asset:// for stable storage
                    // (This catches any links that were resolved during load or newly added)
                    const stableHtml = html.replace(/https:\/\/[^"'\s>]+\?(?:X-Amz-Algorithm|AWSAccessKeyId)=[^"'\s>]+/g, (match) => {
                        try {
                            const url = new URL(match);
                            const key = url.pathname.split('/').slice(2).join('/'); // assets/{userId}/{key}
                            return `asset://${key}`;
                        } catch (e) {
                            return match;
                        }
                    });

                    // 3. Upload to S3
                    await fetch(url, {
                        method: 'PUT',
                        body: stableHtml,
                        headers: { 'Content-Type': 'text/html' }
                    });

                    // 4. Update snippet (first 100 chars)
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
                    if (res.status === 404) {
                        console.log(`[Store] Page not found in S3 (New Page), returning empty content`);
                        return "";
                    }
                    if (!res.ok) throw new Error("Failed to fetch content from S3");
                    let html = await res.text();

                    // 3. Resolve asset:// stable links to fresh signed URLs
                    const assetRegex = /asset:\/\/([^\s"'<>]+)/g;
                    const matches = [...html.matchAll(assetRegex)];
                    
                    for (const match of matches) {
                        const key = match[1];
                        try {
                            const signOp = get({
                                apiName: API_NAME,
                                path: '/assets/urls/download',
                                options: {
                                    queryParams: { key },
                                    headers: await getAuthHeaders()
                                }
                            });
                            const { body: signBody } = await signOp.response;
                            const { url: signedUrl } = await signBody.json() as { url: string };
                            html = html.replace(match[0], signedUrl);
                        } catch (e) {
                            console.error(`Failed to sign asset ${key}`, e);
                        }
                    }

                    // 4. Cache in store
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
                    
                    // 1. Get Upload URL from backend
                    const urlOp = get({
                        apiName: API_NAME,
                        path: '/assets/upload',
                        options: {
                            queryParams: { 
                                filename: file.name,
                                contentType: file.type || 'application/octet-stream'
                            },
                            headers: await getAuthHeaders()
                        }
                    });
                    const { body } = await urlOp.response;
                    const { url, key } = await body.json() as { url: string, key: string };

                    // 2. Upload to S3
                    await fetch(url, {
                        method: 'PUT',
                        body: file,
                        headers: { 'Content-Type': file.type }
                    });

                    // 3. Get a Signed GET URL for immediate rendering in the UI
                    const signOp = get({
                        apiName: API_NAME,
                        path: '/assets/urls/download',
                        options: {
                            queryParams: { key },
                            headers: await getAuthHeaders()
                        }
                    });
                    const { body: signBody } = await signOp.response;
                    const { url: signedUrl } = await signBody.json() as { url: string };

                    return signedUrl;
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
                try {
                    // 1. Hard delete via the new API endpoint (cleans up S3)
                    const delOp = del({
                        apiName: API_NAME,
                        path: `/notebooks/${notebookId}/pages/${pageId}`,
                        options: {
                            headers: await getAuthHeaders()
                        }
                    });
                    await delOp.response;

                    // 2. Update local state
                    set((state) => ({
                        notebooks: state.notebooks.map(n => n.id === notebookId ? { 
                            ...n, 
                            pages: n.pages ? n.pages.filter(p => p.id !== pageId) : []
                        } : n)
                    }));
                } catch (error) {
                    console.error("Error deleting page:", error);
                    throw error;
                }
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
            },

            fetchApiKeys: async () => {
                try {
                    const operation = get({
                        apiName: API_NAME,
                        path: '/api-keys',
                        options: { headers: await getAuthHeaders() }
                    });
                    const { body } = await operation.response;
                    const items = await body.json() as any[];
                    set({ apiKeys: items || [] });
                } catch (error) {
                    console.error("Error fetching API keys:", error);
                }
            },

            createApiKey: async () => {
                try {
                    const operation = post({
                        apiName: API_NAME,
                        path: '/api-keys',
                        options: { headers: await getAuthHeaders() }
                    });
                    const { body } = await operation.response;
                    const newKey = await body.json() as any;
                    set((state) => ({ apiKeys: [newKey, ...state.apiKeys] }));
                    return newKey.apiKey;
                } catch (error) {
                    console.error("Error creating API key:", error);
                    throw error;
                }
            }
        }),
        {
            name: 'notebook-storage',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                notebooks: state.notebooks,
                recentNotebooks: state.recentNotebooks,
                sortBy: state.sortBy,
                sortOrder: state.sortOrder,
                apiKeys: state.apiKeys,
                pendingDeletions: state.pendingDeletions
            }),
        }
    )
);
