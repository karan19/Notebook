"use client";

import { useCreateBlockNote, SuggestionMenuController, getDefaultReactSlashMenuItems } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { useNotebookStore, Page } from "@/lib/store";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, List, Plus, Trash2, X, Cloud, Check, Loader2, AlertCircle, Download, Pin, Copy, Grid3X3, MoreHorizontal, AlignJustify, File, Calendar, Link2, PenTool } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { toast } from "@/components/ui/sonner";
import { useConfetti } from "@/components/ui/confetti";
import { Skeleton } from "@/components/ui/skeleton";

import { EditorSkeleton, ContentLoadingOverlay } from "@/components/ui/loading-spinner";
import { TableOfContents } from "./TableOfContents";
import { SideMargin } from "./SideMargin";
import { SideNote } from "@/lib/store";

interface EditorProps {
    id: string;
}

export function Editor({ id }: EditorProps) {
    const router = useRouter();
    const { getNotebook, updateNotebook, fetchNotebooks, saveContent, loadContent, togglePin, addPage, deletePage, addToRecent } = useNotebookStore();

    const [title, setTitle] = useState("");
    const [pages, setPages] = useState<Page[]>([]);
    const [activePageId, setActivePageId] = useState<string | null>(null);
    const [tags, setTags] = useState<string[]>([]);
    const [newTag, setNewTag] = useState("");
    const [isLoaded, setIsLoaded] = useState(false);
    const [isContentLoading, setIsContentLoading] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const { resolvedTheme } = useTheme();

    // New feature states
    const [wordCount, setWordCount] = useState({ words: 0, chars: 0, readingTime: 0 });
    const [isReadingMode, setIsReadingMode] = useState(false);
    const [isFocusMode, setIsFocusMode] = useState(false);
    const [isPinned, setIsPinned] = useState(false);
    const [paperStyle, setPaperStyle] = useState<'clean' | 'dots' | 'grid' | 'lines'>('clean');
    const [isMarginaliaOpen, setIsMarginaliaOpen] = useState(true);
    const [sideNotes, setSideNotes] = useState<SideNote[]>([]);

    const editor = useCreateBlockNote();

    // Word Count Logic
    const updateWordCount = () => {
        if (!editor) return;
        const text = editor.document
            .map(block => {
                if ('content' in block && Array.isArray(block.content)) {
                    return (block.content as Array<{ text?: string }>).map(c => c.text || '').join('');
                }
                return '';
            })
            .join(' ');
        const words = text.trim() ? text.trim().split(/\s+/).length : 0;
        const chars = text.length;
        const readingTime = Math.ceil(words / 200);
        setWordCount({ words, chars, readingTime });
    };

    // Save Logic
    const saveTimeout = useRef<NodeJS.Timeout | null>(null);
    const handleContentChange = () => {
        if (!isInitializing.current && activePageId) {
            setSaveStatus('saving');
            if (saveTimeout.current) clearTimeout(saveTimeout.current);
            saveTimeout.current = setTimeout(async () => {
                const html = editor.blocksToFullHTML(editor.document);
                updateWordCount();

                try {
                    await saveContent(id, html, activePageId);
                    setSaveStatus('saved');
                    setTimeout(() => setSaveStatus('idle'), 2000);
                } catch (e) {
                    setSaveStatus('error');
                    toast.error("Failed to save");
                }
            }, 1000);
        }
    };

    const handleRetrySave = async () => {
        if (activePageId && editor) {
            setSaveStatus('saving');
            try {
                const html = editor.blocksToFullHTML(editor.document);
                updateWordCount();
                await saveContent(id, html, activePageId);
                setSaveStatus('saved');
                setTimeout(() => setSaveStatus('idle'), 2000);
            } catch (e) {
                setSaveStatus('error');
            }
        }
    };

    const handleExportMarkdown = async () => {
        if (!editor) return;
        try {
            const markdown = await editor.blocksToMarkdownLossy(editor.document);
            const blob = new Blob([`# ${title}\n\n${markdown}`], { type: 'text/markdown' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success("Exported!");
        } catch (e) { toast.error("Export failed"); }
    };

    // Initialization
    useEffect(() => {
        async function init() {
            const nb = await getNotebook(id);
            if (nb) {
                setTitle(nb.title);
                setTags(nb.tags || []);
                setIsPinned(nb.isPinned || false);
                setPaperStyle(nb.paperStyle || 'clean');
                addToRecent(id);
                const sortedPages = [...(nb.pages || [])].sort((a, b) => a.order - b.order);
                setPages(sortedPages);
                if (!activePageId && sortedPages.length > 0) setActivePageId(sortedPages[0].id);
                setIsLoaded(true);
            }
            fetchNotebooks();
        }
        init();
    }, [id, getNotebook, fetchNotebooks]);

    const lastLoadedPageId = useRef<string | null>(null);
    const isInitializing = useRef(false);

    useEffect(() => {
        async function load() {
            if (editor && activePageId && lastLoadedPageId.current !== activePageId) {
                try {
                    isInitializing.current = true;
                    setIsContentLoading(true);
                    const html = await loadContent(id, activePageId);
                    const nb = await getNotebook(id);
                    if (html) {
                        const blocks = await editor.tryParseHTMLToBlocks(html);
                        editor.replaceBlocks(editor.document, blocks);
                        updateWordCount();
                        const currentPage = nb?.pages.find(p => p.id === activePageId);
                        setSideNotes(currentPage?.sideNotes || []);
                    } else {
                        editor.replaceBlocks(editor.document, []);
                        setWordCount({ words: 0, chars: 0, readingTime: 0 });
                        setSideNotes([]);
                    }
                    lastLoadedPageId.current = activePageId;
                    setIsContentLoading(false);
                    setTimeout(() => { isInitializing.current = false; }, 500);
                } catch (e) {
                    setIsContentLoading(false);
                    isInitializing.current = false;
                }
            }
        }
        load();
    }, [editor, id, activePageId, loadContent, getNotebook]);

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newTitle = e.target.value;
        setTitle(newTitle);
        updateNotebook(id, { title: newTitle });
    };

    const handleTagAdd = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && newTag.trim()) {
            const updated = [...tags, newTag.trim()];
            setTags(updated);
            updateNotebook(id, { tags: updated });
            setNewTag("");
        }
    };

    const handleTagRemove = (tag: string) => {
        const updated = tags.filter(t => t !== tag);
        setTags(updated);
        updateNotebook(id, { tags: updated });
    };

    const handleSideNotesChange = async (newNotes: SideNote[]) => {
        setSideNotes(newNotes);
        const nb = await getNotebook(id);
        if (nb) {
            const updatedPages = nb.pages.map(p => p.id === activePageId ? { ...p, sideNotes: newNotes } : p);
            updateNotebook(id, { pages: updatedPages });
        }
    };

    if (!isLoaded) return <EditorSkeleton />;

    const activePageIndex = pages.findIndex(p => p.id === activePageId);

    return (
        <div className="flex w-full h-full bg-[#f8f9fa] dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans overflow-hidden relative">
            <main className="flex-1 flex flex-col h-full overflow-hidden relative">
                <div className="flex-1 overflow-y-auto scroll-smooth pb-32">
                    <div className="max-w-7xl mx-auto px-4 py-8 min-h-screen flex items-start justify-center gap-0">
                        {/* Left Spacer to keep content centered when margin opens */}
                        <motion.div
                            initial={false}
                            animate={{ width: isMarginaliaOpen ? 240 : 0 }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className="hidden lg:block shrink-0"
                        />

                        <div className="flex-none w-full max-w-4xl">
                            <div className="mb-4 flex items-center justify-between">
                                <Link href="/" className="group inline-flex items-center gap-2 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                                    <ChevronLeft className="w-5 h-5" />
                                    <span className="text-sm font-medium">Dashboard</span>
                                </Link>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setIsMarginaliaOpen(!isMarginaliaOpen)}
                                        className={cn("gap-2 text-gray-500 hover:text-gray-900 transition-colors", isMarginaliaOpen && "text-blue-600 bg-blue-50 dark:bg-blue-900/30 font-semibold")}
                                    >
                                        <PenTool className="w-4 h-4" />
                                        <span className="hidden sm:inline">Margins</span>
                                    </Button>
                                </div>
                            </div>

                            <div className={cn(
                                "mx-auto min-h-[1000px] shadow-2xl transition-all duration-300 relative flex overflow-hidden",
                                paperStyle === 'clean' && "bg-white dark:bg-gray-800",
                                "paper-shadow",
                                `paper-${paperStyle}`
                            )} style={{ width: isMarginaliaOpen ? '1090px' : '850px' }}>
                                <div className={cn("absolute inset-0 z-40 content-overlay opacity-0", isContentLoading && "opacity-100 active")}>
                                    <ContentLoadingOverlay />
                                </div>
                                
                                {/* Fixed width content area to prevent reflow */}
                                <div className="w-[850px] flex-none py-12 px-8 md:px-16 transition-all duration-300">
                                    <div className="absolute top-6 right-auto left-auto flex items-center gap-3" style={{ right: isMarginaliaOpen ? '264px' : '24px' }}>
                                        <button onClick={() => {
                                            const styles: ('clean' | 'dots' | 'grid' | 'lines')[] = ['clean', 'dots', 'grid', 'lines'];
                                            const nextStyle = styles[(styles.indexOf(paperStyle) + 1) % styles.length];
                                            setPaperStyle(nextStyle);
                                            updateNotebook(id, { paperStyle: nextStyle });
                                        }} className="p-1.5 text-gray-300 hover:text-gray-600 transition-colors">
                                            {paperStyle === 'clean' && <File className="w-3.5 h-3.5" />}
                                            {paperStyle === 'dots' && <MoreHorizontal className="w-3.5 h-3.5" />}
                                            {paperStyle === 'grid' && <Grid3X3 className="w-3.5 h-3.5" />}
                                            {paperStyle === 'lines' && <AlignJustify className="w-3.5 h-3.5" />}
                                        </button>
                                        <button onClick={async () => {
                                            const newVal = !isPinned;
                                            setIsPinned(newVal);
                                            await togglePin(id);
                                        }} className={cn("p-1.5 transition-colors", isPinned ? "text-blue-500" : "text-gray-300")}>
                                            <Pin className={cn("w-3.5 h-3.5", isPinned && "fill-current")} />
                                        </button>
                                        <div className="flex items-center text-gray-300">
                                            {saveStatus === 'saving' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                            {saveStatus === 'saved' && <Check className="w-3.5 h-3.5 text-green-500" />}
                                            {saveStatus === 'idle' && <Cloud className="w-3.5 h-3.5" />}
                                        </div>
                                        <div className="text-xs font-mono text-gray-300 select-none">{activePageIndex + 1} / {pages.length}</div>
                                    </div>

                                    <div className="px-8 pt-6 pb-2 border-b border-gray-50/50 dark:border-gray-800">
                                        <input value={title} onChange={handleTitleChange} style={{ fontSize: "32px" }} className="w-full font-bold text-gray-900 dark:text-white border-none outline-none bg-transparent" placeholder="Notebook Title" />
                                        <div className="flex flex-wrap items-center gap-2">
                                            {tags.map(tag => <span key={tag} onClick={() => handleTagRemove(tag)} className="px-2 py-0.5 bg-gray-50 dark:bg-gray-800 text-gray-400 text-[10px] font-bold uppercase rounded border border-gray-100 dark:border-gray-700 transition-all">#{tag}</span>)}
                                            <input value={newTag} onChange={(e) => setNewTag(e.target.value)} onKeyDown={handleTagAdd} className="text-[10px] font-bold text-gray-300 border-none outline-none bg-transparent w-24 uppercase" placeholder="+ Add tag" />
                                        </div>
                                    </div>

                                    <div className="px-8 pt-4 pb-12 flex-1 relative editor-paper">
                                        <BlockNoteView editor={editor} theme={resolvedTheme === 'dark' ? 'dark' : 'light'} onChange={handleContentChange} slashMenu={false}>
                                            <SuggestionMenuController triggerCharacter={"/"} getItems={async (query) => {
                                                const lowerQuery = query.toLowerCase();
                                                const defaultItems = getDefaultReactSlashMenuItems(editor).filter(item => item.title.toLowerCase().includes(lowerQuery));
                                                const customItems = [
                                                    { title: "Date", onItemClick: () => { editor.insertInlineContent([{ type: "text", text: new Date().toLocaleDateString(), styles: { bold: true } }]); }, icon: <Calendar className="w-4 h-4" /> }
                                                ];
                                                return [...customItems.filter(i => i.title.toLowerCase().includes(lowerQuery)), ...defaultItems];
                                            }} />
                                        </BlockNoteView>
                                        <div className="h-24" />
                                    </div>
                                </div>

                                <SideMargin notes={sideNotes} onNotesChange={handleSideNotesChange} isVisible={isMarginaliaOpen} />
                            </div>
                        </div>
                        
                        {/* Right invisible spacer to balance the growth if needed? No, the SideMargin naturally does this because it's part of the flex flow now. */}
                    </div>
                </div>
            </main>
        </div>
    );
}
