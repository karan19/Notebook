
import { useCreateBlockNote, SuggestionMenuController, DefaultReactSuggestionItem, getDefaultReactSlashMenuItems } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { useNotebookStore, Page } from "@/lib/store";
import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { ChevronLeft, ChevronRight, List, Plus, Trash2, X, PanelRightClose, Cloud, Check, Loader2, AlertCircle, BookOpen, Focus, Download, Eye, Pin, Copy, Grid3X3, MoreHorizontal, AlignJustify, File, Calendar, Link2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { toast } from "@/components/ui/sonner";

import { EditorSkeleton, ContentLoadingOverlay } from "@/components/ui/loading-spinner";
import { TableOfContents } from "./TableOfContents";

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
    const [isPinned, setIsPinned] = useState(false);
    const [paperStyle, setPaperStyle] = useState<'clean' | 'dots' | 'grid' | 'lines'>('clean');
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isTocOpen, setIsTocOpen] = useState(false);
    const [isReadingMode, setIsReadingMode] = useState(false);
    const [isFocusMode, setIsFocusMode] = useState(false);
    const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
    const { resolvedTheme } = useTheme();

    // Derived State: activePageId is now driven from URL
    const activePageId = searchParams.get('page') || (pages.length > 0 ? pages[0].id : null);

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
                const html = editor.blocksToFullHTML(editor.document);
                console.log(`[Editor] Auto-saving page ${activePageId}...`);


                try {
                    await saveContent(id, html, activePageId);
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
                const html = editor.blocksToFullHTML(editor.document);
                await saveContent(id, html, activePageId);
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

        const pageIdToDelete = activePageId;
        const pageTitle = pages.find(p => p.id === pageIdToDelete)?.title || "Page";

        try {
            setShowDeleteModal(false);
            setSaveStatus('saving');

            // 1. Move to another page first (UI immediate update)
            const remainingPages = pages.filter(p => p.id !== pageIdToDelete);
            if (remainingPages.length > 0) {
                // Find next page or previous page
                const currentIndex = pages.findIndex(p => p.id === pageIdToDelete);
                const nextActiveId = remainingPages[currentIndex] ? remainingPages[currentIndex].id : remainingPages[remainingPages.length - 1].id;
                setActivePageId(nextActiveId);
            }

            // 2. Perform HARD DELETE (S3 + DynamoDB)
            await deletePage(id, pageIdToDelete);
            
            setSaveStatus('idle');
            toast.success(`${pageTitle} deleted permanently`);

            // 3. Refresh notebook to ensure local state is perfect
            const nb = await getNotebook(id);
            if (nb) {
                const sorted = [...(nb.pages || [])].sort((a, b) => a.order - b.order);
                setPages(sorted);
            }
        } catch (e) {
            console.error("Delete failed", e);
            toast.error("Failed to delete page");
            setSaveStatus('error');
        }
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
                                    "absolute inset-0 z-40 content-overlay opacity-0",
                                )}>
                                    <ContentLoadingOverlay />
                                </div>
                                {/* Page Number & Save Status */}
                                <div className="absolute top-6 right-6 flex items-center gap-1 p-1 glass paper-shadow rounded-xl z-10 transition-all">
                                    {/* Style Button */}
                                    <button
                                        onClick={() => {
                                            const styles: ('clean' | 'dots' | 'grid' | 'lines')[] = ['clean', 'dots', 'grid', 'lines'];
                                            const nextIndex = (styles.indexOf(paperStyle) + 1) % styles.length;
                                            const nextStyle = styles[nextIndex];
                                            setPaperStyle(nextStyle);
                                            updateNotebook(id, { paperStyle: nextStyle });
                                            toast.success(`Style: ${nextStyle.charAt(0).toUpperCase() + nextStyle.slice(1)}`);
                                        }}
                                        className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all rounded-lg hover:bg-white dark:hover:bg-gray-700"
                                        title="Change Paper Style"
                                    >
                                        {paperStyle === 'clean' && <File className="w-4 h-4" />}
                                        {paperStyle === 'dots' && <MoreHorizontal className="w-4 h-4" />}
                                        {paperStyle === 'grid' && <Grid3X3 className="w-4 h-4" />}
                                        {paperStyle === 'lines' && <AlignJustify className="w-4 h-4" />}
                                    </button>

                                    {/* Pin Button */}
                                    <button
                                        onClick={async () => {
                                            const newVal = !isPinned;
                                            setIsPinned(newVal);
                                            await togglePin(id);
                                            toast.success(newVal ? "Pinned to top" : "Unpinned from top");
                                        }}
                                        className={cn(
                                            "p-2 transition-all rounded-lg",
                                            isPinned
                                                ? "text-blue-500 bg-blue-50/50 dark:bg-blue-900/40"
                                                : "text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-gray-700"
                                        )}
                                        title={isPinned ? "Unpin from top" : "Pin to top"}
                                    >
                                        <Pin className={cn("w-4 h-4", isPinned && "fill-current")} />
                                    </button>

                                    {/* Export Button */}
                                    <button
                                        onClick={handleExportMarkdown}
                                        className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all rounded-lg hover:bg-white dark:hover:bg-gray-700"
                                        title="Export to Markdown"
                                    >
                                        <Download className="w-4 h-4" />
                                    </button>

                                    {/* Copy Button */}
                                    <button
                                        onClick={async () => {
                                            if (editor) {
                                                const markdown = await editor.blocksToMarkdownLossy(editor.document);
                                                navigator.clipboard.writeText(markdown);
                                                toast.success("Copied to clipboard!");
                                            }
                                        }}
                                        className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all rounded-lg hover:bg-white dark:hover:bg-gray-700"
                                        title="Copy as Markdown"
                                    >
                                        <Copy className="w-4 h-4" />
                                    </button>

                                    <div className="w-[1px] h-4 bg-gray-100 dark:bg-gray-800 mx-1" />

                                    <div className="flex items-center gap-2 px-2 h-8">
                                        <motion.div
                                            key={saveStatus}
                                            initial={{ scale: 0.8, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                            className="flex items-center text-gray-400"
                                        >
                                            {saveStatus === 'saving' && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
                                            {saveStatus === 'saved' && <Check className="w-4 h-4 text-green-500" />}
                                            {saveStatus === 'idle' && <Cloud className="w-4 h-4" />}
                                            {saveStatus === 'error' && <AlertCircle className="w-4 h-4 text-red-500" />}
                                        </motion.div>
                                        <div className="text-[10px] font-mono text-muted-foreground select-none bg-muted/30 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                                            {visibleActivePageIndex + 1} / {pages.length}
                                        </div>
                                    </div>
                                </div>

                                {/* Custom Content Loading Overlay */}
                                <div className={cn(
                                    "absolute inset-0 z-40 content-overlay opacity-0",
                                    isContentLoading && "opacity-100 active"
                                )}>
                                    <ContentLoadingOverlay />
                                </div>


                                {/* Header within Paper - REDUCED PADDING */}
                                <div className="px-8 pt-6 pb-2 border-b border-gray-50/50 dark:border-gray-800">
                                    <input
                                        value={title}
                                        onChange={handleTitleChange}
                                        style={{ fontSize: "32px", height: "auto" }}
                                        className="w-full font-bold tracking-tight text-gray-900 dark:text-white border-none outline-none focus:outline-none focus:ring-0 p-0 bg-transparent placeholder:text-gray-200 dark:placeholder:text-gray-600 leading-tight mb-2 rounded-sm"
                                        placeholder="Notebook Title"
                                    />

                                    <div className="flex flex-wrap items-center gap-2">
                                        {tags.map(tag => (
                                            <span
                                                key={tag}
                                                onClick={() => handleTagRemove(tag)}
                                                className="px-2 py-0.5 bg-gray-50 dark:bg-gray-800 text-gray-400 text-[10px] font-bold uppercase tracking-wider rounded border border-gray-100 dark:border-gray-700 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-500 hover:border-red-100 dark:hover:border-red-800 cursor-pointer transition-all"
                                            >
                                                #{tag}
                                            </span>
                                        ))}
                                        <input
                                            value={newTag}
                                            onChange={(e) => setNewTag(e.target.value)}
                                            onKeyDown={handleTagAdd}
                                            className="text-[10px] font-bold text-muted-foreground border-none outline-none focus:outline-none focus:ring-0 p-0 bg-transparent placeholder:text-muted-foreground/30 w-24 uppercase tracking-wider"
                                            placeholder="+ Add tag"
                                        />
                                    </div>
                                </div>

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
                                        <SuggestionMenuController
                                            triggerCharacter={"/"}
                                            getItems={async (query) => {
                                                const lowerQuery = query.toLowerCase();

                                                // Default items
                                                const defaultItems = getDefaultReactSlashMenuItems(editor).filter(item =>
                                                    item.title.toLowerCase().includes(lowerQuery) ||
                                                    (item.aliases && item.aliases.some(a => a.toLowerCase().includes(lowerQuery)))
                                                );

                                                // Custom items
                                                const customItems = [
                                                    {
                                                        title: "Date",
                                                        onItemClick: () => {
                                                            const dateStr = new Date().toLocaleDateString();
                                                            editor.insertInlineContent([{ type: "text", text: dateStr, styles: { bold: true } }]);
                                                            editor.insertInlineContent([{ type: "text", text: " ", styles: {} }]);
                                                        },
                                                        aliases: ["date", "time", "today"],
                                                        group: "Insert",
                                                        icon: <Calendar className="w-4 h-4" />,
                                                        subtext: "Insert current date"
                                                    },
                                                    {
                                                        title: "Link",
                                                        onItemClick: () => {
                                                            const url = prompt("Enter URL:");
                                                            if (url) {
                                                                const text = prompt("Enter Text (optional):") || url;
                                                                editor.insertInlineContent([{ type: "link", href: url, content: text }]);
                                                                editor.insertInlineContent([{ type: "text", text: " ", styles: {} }]);
                                                            }
                                                        },
                                                        aliases: ["link", "url"],
                                                        group: "Insert",
                                                        icon: <Link2 className="w-4 h-4" />,
                                                        subtext: "Insert a web link"
                                                    }
                                                ].filter(item =>
                                                    item.title.toLowerCase().includes(lowerQuery) ||
                                                    (item.aliases && item.aliases.some(a => a.toLowerCase().includes(lowerQuery)))
                                                );

                                                return [...customItems, ...defaultItems];
                                            }}
                                        />
                                        <SuggestionMenuController
                                            triggerCharacter={"["}
                                            getItems={async (query) => {


                                                const store = useNotebookStore.getState();
                                                let allNotebooks = store.notebooks;



                                                // Retry fetch if empty (just in case)
                                                if (allNotebooks.length <= 1) {

                                                    // Return a loading placeholder so the user knows something is happening
                                                    store.fetchNotebooks(); // Start fetch

                                                    // If we await here, it might take too long for the menu to appear?
                                                    // But we want to wait.
                                                    await store.fetchNotebooks();
                                                    allNotebooks = useNotebookStore.getState().notebooks;

                                                }

                                                const searchTerm = query.toLowerCase().replace(/^\[/, '');
                                                const suggestions: any[] = [];

                                                // Iterate notebooks and pages
                                                allNotebooks.forEach(nb => {
                                                    if (nb.id === id) return; // Skip current notebook itself? Maybe allow linking to other pages.
                                                    // Let's include everything except exact self.

                                                    // 1. Notebook Match
                                                    if (nb.id !== id && nb.title.toLowerCase().includes(searchTerm)) {
                                                        suggestions.push({
                                                            title: `📒 ${nb.title}`,
                                                            type: 'notebook',
                                                            original: nb,
                                                            notebookId: nb.id
                                                        });
                                                    }

                                                    // 2. Page Matches
                                                    if (nb.pages) {
                                                        nb.pages.forEach((page, index) => {
                                                            const pageTitle = page.title || `Page ${index + 1}`;
                                                            const fullSearchString = `${nb.title} ${pageTitle}`.toLowerCase();

                                                            if (fullSearchString.includes(searchTerm)) {
                                                                suggestions.push({
                                                                    title: `📄 ${nb.title} / ${pageTitle}`,
                                                                    notebookTitle: nb.title,
                                                                    pageTitle: pageTitle,
                                                                    type: 'page',
                                                                    pageId: page.id,
                                                                    notebookId: nb.id
                                                                });
                                                            }
                                                        });
                                                    }
                                                });

                                                return suggestions
                                                    .slice(0, 50)
                                                    .map(item => ({
                                                        title: item.title,
                                                        onItemClick: () => {
                                                            const linkText = item.type === 'notebook'
                                                                ? `[[${item.original.title}]]`
                                                                : `[[${item.notebookTitle} / ${item.pageTitle}]]`;

                                                            const href = item.type === 'notebook'
                                                                ? `/notebooks/${item.notebookId}`
                                                                : `/notebooks/${item.notebookId}?page=${item.pageId}`;

                                                            editor.insertInlineContent([
                                                                {
                                                                    type: "link",
                                                                    href: href,
                                                                    content: linkText
                                                                },
                                                                {
                                                                    type: "text",
                                                                    text: " ",
                                                                    styles: {}
                                                                }
                                                            ]);
                                                        }
                                                    }));
                                            }}
                                        />
                                    </BlockNoteView>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </div>

                {/* Pagination Control Bar (Bottom Sticky) */}
                <div className="absolute bottom-0 w-full bg-background/80 backdrop-blur-md border-t border-border/40 z-50">
                    <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
                        {/* Left: Delete Page (only if > 1 page) */}
                        {pages.length > 1 ? (
                            <button
                                onClick={handleDeletePage}
                                className="text-gray-400 hover:text-red-500 transition-colors p-2 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-md"
                                title="Delete this page"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        ) : <div className="w-8" />}

                        {/* Center: Pagination */}
                        <div className="flex items-center gap-4">
                            <button
                                onClick={handlePrevPage}
                                disabled={visibleActivePageIndex <= 0}
                                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-gray-600 dark:text-gray-400"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>

                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400 select-none">
                                Page {visibleActivePageIndex + 1} of {pages.length}
                            </span>

                            <button
                                onClick={handleNextPage}
                                disabled={visibleActivePageIndex >= pages.length - 1}
                                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-gray-600 dark:text-gray-400"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Right: Mode Toggles + Add Page */}
                        <div className="flex items-center gap-2">

                            {/* Focus Mode Toggle */}
                            <button
                                onClick={() => setIsFocusMode(!isFocusMode)}
                                className={cn(
                                    "p-2 rounded-md transition-colors",
                                    isFocusMode
                                        ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
                                        : "text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                                )}
                                title="Focus Mode (⌘+Shift+F)"
                            >
                                <Eye className="w-4 h-4" />
                            </button>

                            {/* Add Page Button */}
                            <button
                                onClick={handleAddPage}
                                className="flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-md text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-100 transition-all shadow-sm active:scale-95 ml-2"
                            >
                                <Plus className="w-4 h-4" />
                                <span>Add Page</span>
                            </button>
                        </div>
                    </div>
                </div>
            </main >

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {
                    showDeleteModal && (
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
                                className="bg-white dark:bg-gray-900 rounded-lg shadow-xl p-6 max-w-sm w-full mx-4 border border-gray-100 dark:border-gray-800"
                            >
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Delete Page?</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                                    This will permanently delete this page and all its content. This action cannot be undone.
                                </p>
                                <div className="flex justify-end gap-3">
                                    <button
                                        onClick={() => setShowDeleteModal(false)}
                                        className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
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
                    )
                }
            </AnimatePresence >

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
