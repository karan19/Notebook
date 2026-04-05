
import { useCreateBlockNote, SuggestionMenuController, DefaultReactSuggestionItem, getDefaultReactSlashMenuItems } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { useNotebookStore, Page } from "@/lib/store";
import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { ChevronLeft, ChevronRight, Plus, Trash2, Cloud, Check, Loader2, AlertCircle, Download, Eye, Pin, Copy } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { toast } from "sonner";

import { EditorSkeleton, ContentLoadingOverlay } from "@/components/ui/loading-spinner";
import { TableOfContents } from "./TableOfContents";
import { EditorExtensions } from "./EditorExtensions";
import { EditorHeader } from "./EditorHeader";
import { EditorPagination } from "./EditorPagination";

interface EditorProps {
    id: string;
}

export function Editor({ id }: EditorProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { getNotebook, fetchNotebooks, updateNotebook, loadContent, saveContent, addPage, deletePage, uploadAsset, togglePin, addToRecent } = useNotebookStore();
    
    // Core State
    const [title, setTitle] = useState("Untitled");
    const [tags, setTags] = useState<string[]>([]);
    const [newTag, setNewTag] = useState("");
    const [pages, setPages] = useState<Page[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);
    const [isContentLoading, setIsContentLoading] = useState(false);
    
    // UI State
    const [paperStyle, setPaperStyle] = useState<'clean' | 'dots' | 'grid' | 'lines'>('clean');
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [isTocOpen, setIsTocOpen] = useState(false);
    const [isReadingMode, setIsReadingMode] = useState(false);
    const [isFocusMode, setIsFocusMode] = useState(false);
    const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
    const { resolvedTheme } = useTheme();

    // Derived State: activePageId is now driven from URL
    const activePageId = searchParams.get('page') || (pages.length > 0 ? pages[0].id : null);
    const [isPinned, setIsPinned] = useState(false);

    const setActivePageId = useCallback((pageId: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('page', pageId);
        router.push(`?${params.toString()}`, { scroll: false });
    }, [router, searchParams]);

    // Editor instance
    const editor = useCreateBlockNote({
        uploadFile: uploadAsset,
    });

    // Save Logic
    const saveTimeout = useRef<NodeJS.Timeout | null>(null);
    const isInitializing = useRef(false);

    const handleContentChange = () => {
        if (!isInitializing.current && activePageId) {
            setSaveStatus('saving');
            if (saveTimeout.current) clearTimeout(saveTimeout.current);
            saveTimeout.current = setTimeout(async () => {
                const content = await editor.blocksToMarkdownLossy(editor.document);
                console.log(`[Editor] Auto-saving page ${activePageId} as Markdown...`);


                try {
                    await saveContent(id, content, activePageId);
                    setSaveStatus('saved');
                    setLastSavedAt(new Date());

                    // Auto-Title Logic: Sync the page title with the first H1 in the document
                    const firstBlock = editor.document[0];
                    if (firstBlock && firstBlock.type === "heading" && (firstBlock.props as any).level === 1) {
                        const content = (firstBlock.content as any);
                        const text = Array.isArray(content) ? content.map(c => c.text).join("") : "";
                        
                        const currentPage = pages.find(p => p.id === activePageId);
                        if (text && text !== currentPage?.title) {
                            const updatedPages = pages.map(p => p.id === activePageId ? { ...p, title: text } : p);
                            setPages(updatedPages);
                            updateNotebook(id, { pages: updatedPages });
                        }
                    }

                    setTimeout(() => setSaveStatus('idle'), 2000);
                } catch (e) {
                    console.error("Save failed", e);
                    setSaveStatus('error');
                    toast.error("Failed to save", { description: "Click the error icon to retry." });
                }
            }, 1000); // 1s debounce
        }
    };

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // ⌘S - Manual save
            if ((e.metaKey || e.ctrlKey) && e.key === 's') {
                e.preventDefault();
                if (activePageId && editor && saveStatus !== 'saving') {
                    handleRetrySave();
                    toast.success("Saved!");
                }
            }
            // ⌘+Shift+R - Reading mode
            if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'R') {
                e.preventDefault();
                setIsReadingMode(prev => !prev);
                toast(isReadingMode ? 'Reading mode off' : 'Reading mode on', { icon: '📖' });
            }
            // ⌘+Shift+F - Focus mode
            if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'F') {
                e.preventDefault();
                setIsFocusMode(prev => !prev);
                toast(isFocusMode ? 'Focus mode off' : 'Focus mode on', { icon: '🎯' });
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activePageId, editor, saveStatus, isReadingMode, isFocusMode]);

    const handleRetrySave = async () => {
        if (activePageId && editor) {
            setSaveStatus('saving');
            try {
                const content = await editor.blocksToMarkdownLossy(editor.document);
                await saveContent(id, content, activePageId);
                setSaveStatus('saved');
                setTimeout(() => setSaveStatus('idle'), 2000);
            } catch (e) {
                setSaveStatus('error');
            }
        }
    };

    // Export to Markdown
    const handleExportMarkdown = async () => {
        if (!editor) return;

        try {
            const markdown = await editor.blocksToMarkdownLossy(editor.document);
            const blob = new Blob([`# ${title}\n\n${markdown}`], { type: 'text/markdown' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            toast.success("Exported to Markdown!", { icon: '📄' });
        } catch (e) {
            toast.error("Export failed");
            console.error(e);
        }
    };

    // Load notebook metadata
    useEffect(() => {
        async function init() {
            // Load current notebook first for immediate display
            const nb = await getNotebook(id);
            if (nb) {
                setTitle(nb.title);
                setTags(nb.tags || []);
                setIsPinned(nb.isPinned || false);
                setPaperStyle(nb.paperStyle || 'clean');
                addToRecent(id);
                const sortedPages = [...(nb.pages || [])].sort((a, b) => a.order - b.order);
                setPages(sortedPages);
                setIsLoaded(true);
            }
            // Fetch all notebooks in background for cross-linking
            fetchNotebooks();
        }
        init();
    }, [id, getNotebook, fetchNotebooks]);

    // Load content for active page
    const lastLoadedPageId = useRef<string | null>(null);

    useEffect(() => {
        async function load() {
            if (editor && activePageId && lastLoadedPageId.current !== activePageId) {
                try {
                    isInitializing.current = true;
                    setIsContentLoading(true);
                    setSaveStatus('idle'); // Reset status on page change

                    console.log(`[Editor] Loading content for page: ${activePageId}`);

                    const content = await loadContent(id, activePageId);
                    if (content) {
                        let blocks;
                        if (content.trim().startsWith('[')) {
                            // 1. JSON Native
                            try {
                                blocks = JSON.parse(content);
                                console.log(`[Editor] JSON content loaded`);
                            } catch (e) {
                                console.warn("[Editor] Failed to parse JSON, falling back to Markdown");
                                blocks = await editor.tryParseMarkdownToBlocks(content);
                            }
                        } else if (content.trim().startsWith('<!DOCTYPE html>') || content.includes('<div class=')) {
                            // 2. Legacy HTML
                            blocks = await editor.tryParseHTMLToBlocks(content);
                            console.log(`[Editor] Legacy HTML content loaded`);
                        } else {
                            // 3. Markdown Native (Default)
                            blocks = await editor.tryParseMarkdownToBlocks(content);
                            console.log(`[Editor] Markdown content loaded`);
                        }
                        
                        editor.replaceBlocks(editor.document, blocks);
                        console.log(`[Editor] Content rendered successfully`);
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
        toast.promise(
            (async () => {
                const newPageId = await addPage(id);
                if (newPageId) {
                    const nb = await getNotebook(id);
                    if (nb) {
                        const sorted = [...(nb.pages || [])].sort((a, b) => a.order - b.order);
                        setPages(sorted);
                        setActivePageId(newPageId); 
                    }
                }
                return newPageId;
            })(),
            {
                loading: 'Creating new page...',
                success: 'New page added',
                error: 'Failed to create page'
            }
        );
    };


    const confirmDeletePage = async () => {
        if (!activePageId) return;

        const pageIdToDelete = activePageId;
        const pageTitle = pages.find(p => p.id === pageIdToDelete)?.title || "Page";

        toast.promise(
            (async () => {
                setSaveStatus('saving');

                // 1. Move to another page first (UI immediate update)
                const remainingPages = pages.filter(p => p.id !== pageIdToDelete);
                if (remainingPages.length > 0) {
                    const currentIndex = pages.findIndex(p => p.id === pageIdToDelete);
                    const nextActiveId = remainingPages[currentIndex] ? remainingPages[currentIndex].id : remainingPages[remainingPages.length - 1].id;
                    setActivePageId(nextActiveId);
                }

                // 2. Perform HARD DELETE
                await deletePage(id, pageIdToDelete);
                
                setSaveStatus('idle');

                // 3. Refresh notebook
                const nb = await getNotebook(id);
                if (nb) {
                    const sorted = [...(nb.pages || [])].sort((a, b) => a.order - b.order);
                    setPages(sorted);
                }
            })(),
            {
                loading: `Deleting ${pageTitle}...`,
                success: `${pageTitle} deleted`,
                error: 'Failed to delete page'
            }
        );
    };


    if (!isLoaded) {
        return <EditorSkeleton />;
    }

    const visibleActivePageIndex = pages.findIndex(p => p.id === activePageId);



    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="flex w-full h-full bg-transparent text-gray-900 dark:text-gray-100 font-sans overflow-hidden relative"
        >

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col h-full overflow-hidden relative">
                {/* Scrollable Editor Area */}
                <div className="flex-1 overflow-y-auto scroll-smooth pb-32">
                    <div className="max-w-6xl mx-auto px-4 py-8 min-h-screen flex items-start justify-center">

                        {/* Editor Column */}
                        <div className="flex-1 min-w-0 max-w-6xl">
                            {/* Back Button */}
                            <div className="mb-4">
                                <Link
                                    href="/"
                                    className="group inline-flex items-center gap-2 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                                    title="Back to Dashboard"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                    <span className="text-sm font-medium">Dashboard</span>
                                </Link>
                            </div>

                            {/* Paper Sheet View */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.2, ease: "easeOut" }}
                                className={cn(
                                    "bg-card/80 backdrop-blur-xl shadow-[0_0_50px_rgba(0,0,0,0.02)] dark:shadow-[0_0_50px_rgba(0,0,0,0.4)] border border-border/30 rounded-sm min-h-[1100px] flex flex-col relative transition-all",
                                    `paper-${paperStyle}`
                                )}
                            >
                                {/* Page content loading overlay */}
                                <div className={cn(
                                    "absolute inset-0 z-40 content-overlay opacity-0 transition-opacity duration-300 pointer-events-none",
                                    isContentLoading && "opacity-100 pointer-events-auto"
                                )}>
                                    <ContentLoadingOverlay />
                                </div>
                                <EditorHeader
                                    title={title}
                                    setTitle={setTitle}
                                    handleTitleChange={handleTitleChange}
                                    tags={tags}
                                    handleTagRemove={handleTagRemove}
                                    newTag={newTag}
                                    setNewTag={setNewTag}
                                    handleTagAdd={handleTagAdd}
                                    paperStyle={paperStyle}
                                    setPaperStyle={setPaperStyle}
                                    isPinned={isPinned}
                                    setIsPinned={setIsPinned}
                                    isReadingMode={isReadingMode}
                                    setIsReadingMode={setIsReadingMode}
                                    saveStatus={saveStatus}
                                    visibleActivePageIndex={visibleActivePageIndex}
                                    totalPages={pages.length}
                                    onExport={handleExportMarkdown}
                                    onCopy={async () => {
                                        if (editor) {
                                            const markdown = await editor.blocksToMarkdownLossy(editor.document);
                                            navigator.clipboard.writeText(markdown);
                                            toast.success("Copied to clipboard!");
                                        }
                                    }}
                                    onTogglePin={() => togglePin(id)}
                                    onUpdateNotebook={(updates) => updateNotebook(id, updates)}
                                />

                                {/* Editor Content - REDUCED PADDING */}
                                <div className={cn(
                                    "px-8 pt-4 pb-12 flex-1 relative editor-paper",
                                    isFocusMode && "focus-mode",
                                    isReadingMode && "reading-mode"
                                )}>
                                    <BlockNoteView
                                        editor={editor}
                                        theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
                                        onChange={handleContentChange}
                                        slashMenu={false}
                                    >
                                        <EditorExtensions
                                            editor={editor}
                                            currentNotebookId={id}
                                        />
                                    </BlockNoteView>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </div>

                {/* Pagination Control Bar (Bottom Sticky) */}
                <EditorPagination
                    pages={pages}
                    visibleActivePageIndex={visibleActivePageIndex}
                    onPrevPage={handlePrevPage}
                    onNextPage={handleNextPage}
                    onAddPage={handleAddPage}
                    onDeletePage={async () => {
                        if (activePageId) confirmDeletePage();
                    }}
                    currentPageId={activePageId || ""}
                    isFocusMode={isFocusMode}
                    setIsFocusMode={setIsFocusMode}
                />
            </main>

            {/* Right Side Drawer - Table of Contents */}
            <TableOfContents
                editor={editor}
                isOpen={isTocOpen}
                setIsOpen={setIsTocOpen}
                currentNotebookId={id}
                currentNotebookTitle={title}
            />

        </motion.div >
    );
}
