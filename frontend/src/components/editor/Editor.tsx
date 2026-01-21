
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
    }, [id, getNotebook]); // removed activePageId from deps to avoid reset on weird updates

    // Load content for active page
    const lastLoadedPageId = useRef<string | null>(null);
    const isInitializing = useRef(false);

    useEffect(() => {
        async function load() {
            if (editor && activePageId && lastLoadedPageId.current !== activePageId) {
                try {
                    isInitializing.current = true;
                    setIsContentLoading(true);
                    console.log(`[Editor] Loading content for page: ${activePageId}`);

                    // Clear editor before loading new content to avoid "flashing" old content
                    // editor.replaceBlocks(editor.document, []); 

                    const html = await loadContent(id, activePageId);
                    if (html) {
                        const blocks = await editor.tryParseHTMLToBlocks(html);
                        editor.replaceBlocks(editor.document, blocks);
                        console.log(`[Editor] Content loaded successfully`);
                    } else {
                        editor.replaceBlocks(editor.document, []); // Empty page
                    }

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
    }, [editor, id, activePageId, loadContent]);

    // Save Logic
    const saveTimeout = useRef<NodeJS.Timeout | null>(null);
    const handleContentChange = () => {
        if (!isInitializing.current && activePageId) {
            if (saveTimeout.current) clearTimeout(saveTimeout.current);
            saveTimeout.current = setTimeout(() => {
                const html = editor.blocksToFullHTML(editor.document);
                console.log(`[Editor] Auto-saving page ${activePageId}...`);
                saveContent(id, html, activePageId);
            }, 1000); // 1s debounce
        }
    };

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
        if (confirm("Are you sure you want to delete this page?")) {
            await deletePage(id, activePageId);
            const nb = await getNotebook(id);
            if (nb) {
                const sorted = [...(nb.pages || [])].sort((a, b) => a.order - b.order);
                setPages(sorted);
                setActivePageId(sorted[0].id); // Go to first page
            }
        }
    };


    if (!isLoaded) {
        return (
            <div className="flex h-full items-center justify-center">
                <LoadingSpinner size={40} className="text-gray-300" />
            </div>
        );
    }

    const activePageIndex = pages.findIndex(p => p.id === activePageId);

    return (
        <div className="flex w-full h-full bg-[#f8f9fa] text-gray-900 font-sans flex-col overflow-hidden">
            {/* Main Scrollable Area */}
            <main className="flex-1 overflow-y-auto relative bg-[#f8f9fa] scroll-smooth pb-32">
                <div className="max-w-4xl mx-auto px-4 py-8 min-h-screen">

                    {/* Back Button */}
                    <div className="mb-4">
                        <Link
                            href="/"
                            className="group inline-flex items-center gap-2 text-gray-400 hover:text-gray-900 transition-colors"
                            title="Back to Dashboard"
                        >
                            <ChevronLeft className="w-5 h-5" />
                            <span className="text-sm font-medium">Dashboard</span>
                        </Link>
                    </div>

                    {/* Paper Sheet View */}
                    <div className="bg-white shadow-[0_0_50px_rgba(0,0,0,0.04)] border border-gray-100 rounded-sm min-h-[1100px] flex flex-col relative">
                        {/* Page Number Indicator (Top Right) */}
                        <div className="absolute top-6 right-6 text-xs font-mono text-gray-300 select-none">
                            {activePageIndex + 1} / {pages.length}
                        </div>

                        {/* Header within Paper */}
                        <div className="px-12 pt-12 pb-6 border-b border-gray-50">
                            <input
                                value={title}
                                onChange={handleTitleChange}
                                style={{ fontSize: "36px", height: "auto" }}
                                className="w-full font-bold tracking-tight text-gray-900 border-none outline-none focus:outline-none focus:ring-0 p-0 bg-transparent placeholder:text-gray-200 leading-tight mb-4"
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

                        {/* Editor Content */}
                        <div className="px-12 pt-6 pb-12 flex-1 relative editor-paper">
                            {isContentLoading && (
                                <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
                                    <LoadingSpinner size={24} className="text-gray-400" />
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
            </main>

            {/* Pagination Control Bar (Bottom Sticky) */}
            <div className="fixed bottom-0 w-full bg-white/80 backdrop-blur-md border-t border-gray-200 z-50">
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
        </div>
    );
}
