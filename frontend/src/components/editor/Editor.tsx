import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { useNotebookStore } from "@/lib/store";
import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, List } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface TOCEntry {
    id: string;
    text: string;
    level: number;
}

interface EditorProps {
    id: string;
}

export function Editor({ id }: EditorProps) {
    const { getNotebook, updateNotebook, loadContent, saveContent, uploadAsset } = useNotebookStore();
    const [title, setTitle] = useState("Untitled");
    const [tags, setTags] = useState<string[]>([]);
    const [newTag, setNewTag] = useState("");
    const [isLoaded, setIsLoaded] = useState(false);
    const [isTocOpen, setIsTocOpen] = useState(true);
    const [toc, setToc] = useState<TOCEntry[]>([]);
    const editorRef = useRef<any>(null);

    // Initialize editor
    const editor = useCreateBlockNote({
        uploadFile: uploadAsset,
    });
    editorRef.current = editor;

    // Extract TOC from editor document
    const updateToc = useCallback(() => {
        if (!editor) return;
        const entries: TOCEntry[] = [];
        for (const block of editor.document) {
            if (block.type === 'heading' && block.content && block.content.length > 0) {
                const text = block.content.map((c: any) => c.text || '').join('');
                if (text.trim()) {
                    entries.push({
                        id: block.id,
                        text: text,
                        level: block.props?.level || 1,
                    });
                }
            }
        }
        setToc(entries);
    }, [editor]);

    // Load notebook metadata
    useEffect(() => {
        async function init() {
            const nb = await getNotebook(id);
            if (nb) {
                setTitle(nb.title);
                setTags(nb.tags || []);
                setIsLoaded(true);
            }
        }
        init();
    }, [id, getNotebook]);

    // Prevent saving during initial load
    const isInitializing = useRef(true);
    const saveTimeout = useRef<NodeJS.Timeout | null>(null);

    // Load content when notebook is ready
    useEffect(() => {
        async function load() {
            if (editor && isLoaded) {
                try {
                    isInitializing.current = true;
                    console.log(`[Editor] Loading content for notebook: ${id}`);
                    const html = await loadContent(id);
                    if (html) {
                        const blocks = await editor.tryParseHTMLToBlocks(html);
                        editor.replaceBlocks(editor.document, blocks);
                        console.log(`[Editor] Content loaded successfully`);
                    } else {
                        // Keep empty editor for new notebooks
                        console.log(`[Editor] New notebook initialized (empty)`);
                    }
                    // Small delay to ensure onChange from replaceBlocks is ignored
                    setTimeout(() => {
                        isInitializing.current = false;
                        updateToc();
                    }, 500);
                } catch (e) {
                    console.error("Failed to load content", e);
                    isInitializing.current = false;
                }
            }
        }
        load();
    }, [editor, id, isLoaded, loadContent, updateToc]);

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

    const scrollToHeading = (blockId: string) => {
        const element = document.querySelector(`[data-block-id="${blockId}"]`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };

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
                                    if (!isInitializing.current) {
                                        if (saveTimeout.current) clearTimeout(saveTimeout.current);
                                        saveTimeout.current = setTimeout(() => {
                                            const html = editor.blocksToFullHTML(editor.document);
                                            console.log(`[Editor] Auto-saving...`);
                                            saveContent(id, html);
                                        }, 1000); // 1s debounce
                                        // Update TOC on content change
                                        updateToc();
                                    }
                                }}
                            />
                        </div>
                    </div>
                </div>
            </main>

            {/* TOC Sidebar Toggle */}
            <button
                onClick={() => setIsTocOpen(!isTocOpen)}
                className={cn(
                    "absolute right-0 top-1/2 -translate-y-1/2 z-30 p-1 bg-white border border-gray-200 rounded-l-lg shadow-sm hover:bg-gray-50 transition-all",
                    !isTocOpen ? "translate-x-0" : "-translate-x-[280px]"
                )}
            >
                {isTocOpen ? <ChevronRight className="w-4 h-4 text-gray-400" /> : <List className="w-4 h-4 text-gray-400" />}
            </button>

            {/* Table of Contents Sidebar */}
            <AnimatePresence mode="wait">
                {isTocOpen && (
                    <motion.aside
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: 280, opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        className="h-full bg-white border-l border-gray-200 flex flex-col z-20"
                    >
                        <div className="p-6 flex items-center justify-between border-b border-gray-100">
                            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Table of Contents</h2>
                        </div>

                        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
                            {toc.length === 0 ? (
                                <p className="text-xs text-gray-400 px-3 py-2">
                                    Add headings to your document to see them here.
                                </p>
                            ) : (
                                toc.map((entry) => (
                                    <button
                                        key={entry.id}
                                        onClick={() => scrollToHeading(entry.id)}
                                        className={cn(
                                            "w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-gray-100 transition-colors truncate",
                                            entry.level === 1 && "font-semibold text-gray-900",
                                            entry.level === 2 && "pl-6 text-gray-700",
                                            entry.level === 3 && "pl-9 text-gray-500 text-xs"
                                        )}
                                    >
                                        {entry.text}
                                    </button>
                                ))
                            )}
                        </div>
                    </motion.aside>
                )}
            </AnimatePresence>
        </div>
    );
}
