
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { useNotebookStore, Page } from "@/lib/store";
import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, List, Plus, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface EditorProps {
    id: string;
}

export function Editor({ id }: EditorProps) {
    const { getNotebook, updateNotebook, loadContent, saveContent, addPage, deletePage, uploadAsset } = useNotebookStore();
    const [title, setTitle] = useState("Untitled");
    const [tags, setTags] = useState<string[]>([]);
    const [newTag, setNewTag] = useState("");
    const [pages, setPages] = useState<Page[]>([]);
    const [activePageId, setActivePageId] = useState<string | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [isContentLoading, setIsContentLoading] = useState(false);

    // Editor instance
    const editor = useCreateBlockNote({
        uploadFile: uploadAsset,
    });

    const [toc, setToc] = useState<{ id: string; text: string; level: number }[]>([]);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    // Update TOC on content change
    const updateToc = useCallback(() => {
        if (!editor) return;
        const blocks = editor.document;
        const headings = blocks.filter(b => b.type === "heading");
        const newToc = headings.map(h => ({
            id: h.id,
            text: (h.content as any[])?.[0]?.text || "Untitled",
            level: (h.props as any).level
        }));
        setToc(newToc);
    }, [editor]);

    // Save Logic
    const saveTimeout = useRef<NodeJS.Timeout | null>(null);
    const handleContentChange = () => {
        updateToc();
        if (!isInitializing.current && activePageId) {
            setSaveStatus('saving');
            if (saveTimeout.current) clearTimeout(saveTimeout.current);
            saveTimeout.current = setTimeout(async () => {
                const html = editor.blocksToFullHTML(editor.document);
                console.log(`[Editor] Auto-saving page ${activePageId}...`);
                try {
                    await saveContent(id, html, activePageId);
                    setSaveStatus('saved');
                    setTimeout(() => setSaveStatus('idle'), 2000);
                } catch (e) {
                    console.error("Save failed", e);
                    setSaveStatus('error');
                }
            }, 1000); // 1s debounce
        }
    };

    const handleRetrySave = async () => {
        if (activePageId && editor) {
            setSaveStatus('saving');
            try {
                const html = editor.blocksToFullHTML(editor.document);
                await saveContent(id, html, activePageId);
                setSaveStatus('saved');
                setTimeout(() => setSaveStatus('idle'), 2000);
            } catch (e) {
                setSaveStatus('error');
            }
        }
    };

    // Load notebook metadata
    useEffect(() => {
        async function init() {
            const nb = await getNotebook(id);
            if (nb) {
                setTitle(nb.title);
                setTags(nb.tags || []);
                const sortedPages = [...(nb.pages || [])].sort((a, b) => a.order - b.order);
                setPages(sortedPages);
                if (sortedPages.length > 0 && !activePageId) {
                    setActivePageId(sortedPages[0].id);
                }
                setIsLoaded(true);
            }
        }
        init();
    }, [id, getNotebook]);

    // Load content for active page
    const lastLoadedPageId = useRef<string | null>(null);
    const isInitializing = useRef(false);

    useEffect(() => {
        async function load() {
            if (editor && activePageId && lastLoadedPageId.current !== activePageId) {
                try {
                    isInitializing.current = true;
                    setIsContentLoading(true);
                    setSaveStatus('idle'); // Reset status on page change

                    console.log(`[Editor] Loading content for page: ${activePageId}`);

                    const html = await loadContent(id, activePageId);
                    if (html) {
                        const blocks = await editor.tryParseHTMLToBlocks(html);
                        editor.replaceBlocks(editor.document, blocks);
                        console.log(`[Editor] Content loaded successfully`);
                    } else {
                        editor.replaceBlocks(editor.document, []); // Empty page
                    }

                    updateToc(); // Initial TOC update

                    lastLoadedPageId.current = activePageId;
                    setIsContentLoading(false);

                    setTimeout(() => {
                        isInitializing.current = false;
                    }, 500);
                } catch (e) {
                    console.error("Failed to load content", e);
                    setIsContentLoading(false);
                    isInitializing.current = false;
                }
            }
        }
        load();
    }, [editor, id, activePageId, loadContent, updateToc]);

    // Handlers
    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newTitle = e.target.value;
        setTitle(newTitle);
        updateNotebook(id, { title: newTitle });
    };

    const handleTagAdd = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && newTag.trim()) {
            e.preventDefault();
            const tag = newTag.trim();
            if (!tags.includes(tag)) {
                const updatedTags = [...tags, tag];
                setTags(updatedTags);
                updateNotebook(id, { tags: updatedTags });
            }
            setNewTag("");
        }
    };

    const handleTagRemove = (tagToRemove: string) => {
        const updatedTags = tags.filter(t => t !== tagToRemove);
        setTags(updatedTags);
        updateNotebook(id, { tags: updatedTags });
    };

    const handleNextPage = () => {
        const idx = pages.findIndex(p => p.id === activePageId);
        if (idx !== -1 && idx < pages.length - 1) {
            setActivePageId(pages[idx + 1].id);
        }
    };

    const handlePrevPage = () => {
        const idx = pages.findIndex(p => p.id === activePageId);
        if (idx > 0) {
            setActivePageId(pages[idx - 1].id);
        }
    };

    const handleAddPage = async () => {
        try {
            const newPageId = await addPage(id);
            if (newPageId) {
                const nb = await getNotebook(id);
                if (nb) {
                    const sorted = [...(nb.pages || [])].sort((a, b) => a.order - b.order);
                    setPages(sorted);
                    setActivePageId(newPageId); // Jump to new page
                }
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleDeletePage = async () => {
        if (!activePageId || pages.length <= 1) return;
        setShowDeleteModal(true);
    };

    const confirmDeletePage = async () => {
        if (!activePageId) return;
        await deletePage(id, activePageId);
        const nb = await getNotebook(id);
        if (nb) {
            const sorted = [...(nb.pages || [])].sort((a, b) => a.order - b.order);
            setPages(sorted);
            setActivePageId(sorted[0].id); // Go to first page
        }
        setShowDeleteModal(false);
    };


    if (!isLoaded) {
        return (
            <div className="flex h-full items-center justify-center">
                <LoadingSpinner size={40} className="text-gray-300" />
            </div>
        );
    }

    const activePageIndex = pages.findIndex(p => p.id === activePageId);

    // TOC Component
    const TableOfContents = () => (
        <div className="w-64 flex-shrink-0 hidden xl:block pl-8 pt-8 sticky top-0 h-screen overflow-y-auto">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">On this page</h3>
            <div className="flex flex-col gap-2 border-l border-gray-200 pl-4">
                {toc.length === 0 && <span className="text-sm text-gray-300 italic">No headings</span>}
                {toc.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => {
                            const block = editor.getBlock(item.id);
                            if (block) {
                                // Scroll to block (BlockNote functionality might vary, simple scroll for now)
                                const el = document.querySelector(`[data-id="${item.id}"]`);
                                el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }
                        }}
                        className={cn(
                            "text-left text-sm hover:text-gray-900 transition-colors py-1",
                            item.level === 1 ? "font-semibold text-gray-700" : "text-gray-500",
                            item.level === 2 && "pl-2",
                            item.level === 3 && "pl-4"
                        )}
                    >
                        {item.text}
                    </button>
                ))}
            </div>
        </div>
    );

    return (
        <div className="flex w-full h-full bg-[#f8f9fa] text-gray-900 font-sans overflow-hidden relative">

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col h-full overflow-hidden relative">
                {/* Scrollable Editor Area */}
                <div className="flex-1 overflow-y-auto scroll-smooth pb-32">
                    <div className="max-w-4xl mx-auto px-4 py-8 min-h-screen flex gap-8">

                        {/* Editor Column */}
                        <div className="flex-1 min-w-0">
                            {/* Back Button */}
                            <div className="mb-4 flex items-center justify-between">
                                <Link
                                    href="/"
                                    className="group inline-flex items-center gap-2 text-gray-400 hover:text-gray-900 transition-colors"
                                    title="Back to Dashboard"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                    <span className="text-sm font-medium">Dashboard</span>
                                </Link>

                                {/* Save Status Indicator */}
                                <div className="flex items-center gap-2 text-xs font-medium">
                                    {saveStatus === 'saving' && (
                                        <div className="flex items-center gap-2 text-gray-400">
                                            <LoadingSpinner size={12} />
                                            <span>Saving...</span>
                                        </div>
                                    )}
                                    {saveStatus === 'saved' && (
                                        <span className="text-green-500">All changes saved</span>
                                    )}
                                    {saveStatus === 'error' && (
                                        <div className="flex items-center gap-2 text-red-500">
                                            <span>Save failed</span>
                                            <button onClick={handleRetrySave} className="underline hover:no-underline">Retry</button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Paper Sheet View */}
                            <div className="bg-white shadow-[0_0_50px_rgba(0,0,0,0.04)] border border-gray-100 rounded-sm min-h-[1100px] flex flex-col relative transition-all">
                                {/* Page Number Indicator */}
                                <div className="absolute top-6 right-6 text-xs font-mono text-gray-300 select-none">
                                    {activePageIndex + 1} / {pages.length}
                                </div>

                                {/* Header within Paper - REDUCED PADDING */}
                                <div className="px-12 pt-6 pb-2 border-b border-gray-50/50">
                                    <input
                                        value={title}
                                        onChange={handleTitleChange}
                                        style={{ fontSize: "32px", height: "auto" }}
                                        className="w-full font-bold tracking-tight text-gray-900 border-none outline-none focus:outline-none focus:ring-0 p-0 bg-transparent placeholder:text-gray-200 leading-tight mb-2"
                                        placeholder="Notebook Title"
                                    />

                                    <div className="flex flex-wrap items-center gap-2">
                                        {tags.map(tag => (
                                            <span
                                                key={tag}
                                                onClick={() => handleTagRemove(tag)}
                                                className="px-2 py-0.5 bg-gray-50 text-gray-400 text-[10px] font-bold uppercase tracking-wider rounded border border-gray-100 hover:bg-red-50 hover:text-red-500 hover:border-red-100 cursor-pointer transition-all"
                                            >
                                                #{tag}
                                            </span>
                                        ))}
                                        <input
                                            value={newTag}
                                            onChange={(e) => setNewTag(e.target.value)}
                                            onKeyDown={handleTagAdd}
                                            className="text-[10px] font-bold text-gray-300 border-none outline-none focus:outline-none focus:ring-0 p-0 bg-transparent placeholder:text-gray-200 w-24 uppercase tracking-wider"
                                            placeholder="+ Add tag"
                                        />
                                    </div>
                                </div>

                                {/* Editor Content - REDUCED PADDING */}
                                <div className="px-12 pt-4 pb-12 flex-1 relative editor-paper">
                                    {isContentLoading && (
                                        <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10 backdrop-blur-sm">
                                            <div className="flex flex-col items-center gap-2">
                                                <LoadingSpinner size={32} className="text-gray-400" />
                                                <span className="text-xs text-gray-400 font-medium tracking-wide">LOADING PAGE</span>
                                            </div>
                                        </div>
                                    )}
                                    <BlockNoteView
                                        editor={editor}
                                        theme="light"
                                        onChange={handleContentChange}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* TOC Sidebar */}
                        <TableOfContents />

                    </div>
                </div>

                {/* Pagination Control Bar (Bottom Sticky) */}
                <div className="absolute bottom-0 w-full bg-white/80 backdrop-blur-md border-t border-gray-200 z-50">
                    <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
                        {/* Left: Delete Page (only if > 1 page) */}
                        {pages.length > 1 ? (
                            <button
                                onClick={handleDeletePage}
                                className="text-gray-400 hover:text-red-500 transition-colors p-2 hover:bg-red-50 rounded-md"
                                title="Delete this page"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        ) : <div className="w-8" />}

                        {/* Center: Pagination */}
                        <div className="flex items-center gap-4">
                            <button
                                onClick={handlePrevPage}
                                disabled={activePageIndex <= 0}
                                className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-gray-600"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>

                            <span className="text-sm font-medium text-gray-500 select-none">
                                Page {activePageIndex + 1} of {pages.length}
                            </span>

                            <button
                                onClick={handleNextPage}
                                disabled={activePageIndex >= pages.length - 1}
                                className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-gray-600"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Right: Add Page */}
                        <button
                            onClick={handleAddPage}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-md text-sm font-medium hover:bg-gray-800 transition-all shadow-sm active:scale-95"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Add Page</span>
                        </button>
                    </div>
                </div>
            </main>

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {showDeleteModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center backdrop-blur-sm"
                        onClick={() => setShowDeleteModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4 border border-gray-100"
                        >
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Page?</h3>
                            <p className="text-sm text-gray-500 mb-6">
                                This will permanently delete this page and all its content. This action cannot be undone.
                            </p>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setShowDeleteModal(false)}
                                    className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmDeletePage}
                                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors shadow-sm"
                                >
                                    Delete Page
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
