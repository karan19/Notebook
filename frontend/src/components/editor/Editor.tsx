import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { useNotebookStore, Page } from "@/lib/store";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { ChevronLeft, Plus, Trash2, FileText, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface EditorProps {
    id: string;
}

export function Editor({ id }: EditorProps) {
    const { getNotebook, updateNotebook, loadContent, saveContent, uploadAsset, addPage, deletePage, updatePage } = useNotebookStore();
    const [title, setTitle] = useState("Untitled");
    const [tags, setTags] = useState<string[]>([]);
    const [newTag, setNewTag] = useState("");
    const [isLoaded, setIsLoaded] = useState(false);
    const [activePageId, setActivePageId] = useState<string | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const editorRef = useRef<any>(null);

    // Initialize editor
    const editor = useCreateBlockNote({
        uploadFile: uploadAsset,
    });
    editorRef.current = editor;

    // Load notebook metadata and handle initial page
    useEffect(() => {
        async function init() {
            const nb = await getNotebook(id);
            if (nb) {
                setTitle(nb.title);
                setTags(nb.tags || []);

                // Select first page or create one if none exist
                if (nb.pages.length === 0) {
                    console.log("[Editor] Initializing first page for new notebook...");
                    const firstPageId = crypto.randomUUID();
                    const firstPage: Page = {
                        id: firstPageId,
                        title: "Page 1",
                        contentKey: `notes/${id}/pages/${firstPageId}.html`
                    };

                    await updateNotebook(id, { pages: [firstPage] });
                    setActivePageId(firstPageId);
                } else if (!activePageId) {
                    setActivePageId(nb.pages[0].id);
                }
                setIsLoaded(true);
            }
        }
        init();
    }, [id, getNotebook, updateNotebook, activePageId]);

    // Prevent saving during initial load
    const isInitializing = useRef(true);
    const saveTimeout = useRef<NodeJS.Timeout | null>(null);

    // Load content when activePageId changes
    useEffect(() => {
        async function load() {
            if (editor && activePageId && isLoaded) {
                try {
                    isInitializing.current = true;
                    console.log(`[Editor] Loading content for page: ${activePageId}`);
                    const html = await loadContent(id, activePageId);
                    if (html) {
                        const blocks = await editor.tryParseHTMLToBlocks(html);
                        editor.replaceBlocks(editor.document, blocks);
                        console.log(`[Editor] Content loaded successfully`);
                    } else {
                        // Clear editor for new pages
                        editor.replaceBlocks(editor.document, [editor.document[0]]);
                        console.log(`[Editor] New page initialized (empty)`);
                    }
                    // Small delay to ensure onChange from replaceBlocks is ignored
                    setTimeout(() => {
                        isInitializing.current = false;
                    }, 500);
                } catch (e) {
                    console.error("Failed to load page content", e);
                    isInitializing.current = false;
                }
            }
        }
        load();
    }, [editor, id, activePageId, isLoaded, loadContent]);

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

    const notebook = useNotebookStore(state => state.notebooks.find(n => n.id === id));
    const activePage = notebook?.pages.find(p => p.id === activePageId);

    if (!editor) return null;

    if (!isLoaded) {
        return (
            <div className="flex h-full items-center justify-center">
                <LoadingSpinner size={40} className="text-gray-300" />
            </div>
        );
    }

    return (
        <div className="flex w-full h-full bg-[#f8f9fa] text-gray-900 font-sans overflow-hidden">
            {/* Pages Sidebar */}
            <AnimatePresence mode="wait">
                {isSidebarOpen && (
                    <motion.aside
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: 280, opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        className="h-full bg-white border-r border-gray-200 flex flex-col z-20"
                    >
                        <div className="p-6 flex items-center justify-between">
                            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Pages</h2>
                            <button
                                onClick={() => addPage(id)}
                                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-gray-900"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto px-3 space-y-1">
                            {notebook?.pages.map((page) => (
                                <div
                                    key={page.id}
                                    onClick={() => setActivePageId(page.id)}
                                    className={cn(
                                        "group flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all",
                                        activePageId === page.id
                                            ? "bg-gray-100 text-gray-900 shadow-sm"
                                            : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                                    )}
                                >
                                    <FileText className={cn("w-4 h-4", activePageId === page.id ? "text-black" : "text-gray-400")} />
                                    <input
                                        value={page.title || ""}
                                        onChange={(e) => updatePage(id, page.id, e.target.value)}
                                        className="bg-transparent border-none outline-none focus:ring-0 p-0 text-sm font-medium flex-1 cursor-pointer"
                                        placeholder="Untitled Page"
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                    {notebook.pages.length > 1 && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                deletePage(id, page.id);
                                                if (activePageId === page.id) {
                                                    setActivePageId(notebook.pages.find(p => p.id !== page.id)?.id || null);
                                                }
                                            }}
                                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 hover:text-red-500 rounded-md transition-all"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </motion.aside>
                )}
            </AnimatePresence>

            {/* Sidebar toggle */}
            <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className={cn(
                    "absolute left-0 top-1/2 -translate-y-1/2 z-30 p-1 bg-white border border-gray-200 rounded-r-lg shadow-sm hover:bg-gray-50 transition-all",
                    !isSidebarOpen ? "translate-x-0" : "translate-x-[280px]"
                )}
            >
                {isSidebarOpen ? <ChevronLeft className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
            </button>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto relative bg-[#f8f9fa] scroll-smooth">
                <div className="max-w-4xl mx-auto px-4 py-16 min-h-screen">
                    {/* Paper Sheet View */}
                    <div className="bg-white shadow-[0_0_50px_rgba(0,0,0,0.04)] border border-gray-100 rounded-sm min-h-[1100px] flex flex-col">
                        {/* Header within Paper */}
                        <div className="px-16 pt-20 pb-10 border-b border-gray-50">
                            <div className="flex items-center gap-4 mb-8">
                                <Link
                                    href="/"
                                    className="group flex items-center justify-center w-10 h-10 -ml-2 rounded-full hover:bg-gray-100 transition-colors"
                                    title="Back to Dashboard"
                                >
                                    <ChevronLeft className="w-6 h-6 text-gray-400 group-hover:text-gray-900 transition-colors" />
                                </Link>
                                <input
                                    value={title}
                                    onChange={handleTitleChange}
                                    style={{ fontSize: "40px", height: "auto" }}
                                    className="flex-1 font-bold tracking-tight text-gray-900 border-none outline-none focus:outline-none focus:ring-0 p-0 bg-transparent placeholder:text-gray-200 leading-tight"
                                    placeholder="Notebook Title"
                                />
                            </div>

                            {/* Tags */}
                            <div className="flex flex-wrap items-center gap-2 mb-4">
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
                        <div className="px-12 py-12 flex-1 relative editor-paper">
                            <BlockNoteView
                                editor={editor}
                                theme="light"
                                onChange={() => {
                                    if (!isInitializing.current && activePageId) {
                                        if (saveTimeout.current) clearTimeout(saveTimeout.current);
                                        saveTimeout.current = setTimeout(() => {
                                            const html = editor.blocksToFullHTML(editor.document);
                                            console.log(`[Editor] Auto-saving page: ${activePageId}`);
                                            saveContent(id, html, activePageId);
                                        }, 1000); // 1s debounce
                                    }
                                }}
                            />
                        </div>
                    </div>

                    {/* Page Break Indication */}
                    <div className="h-16 flex items-center justify-center opacity-20 pointer-events-none">
                        <div className="w-full h-px bg-dashed bg-gray-300" />
                        <span className="mx-4 text-[10px] font-bold text-gray-400 tracking-widest uppercase whitespace-nowrap">End of {activePage?.title || "Page"}</span>
                        <div className="w-full h-px bg-dashed bg-gray-300" />
                    </div>
                </div>
            </main>
        </div>
    );
}
