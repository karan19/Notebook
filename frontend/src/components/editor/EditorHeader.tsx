"use client";

import { motion } from "motion/react";
import { 
    File, 
    MoreHorizontal, 
    Grid3X3, 
    AlignJustify, 
    Pin, 
    Download, 
    Copy, 
    Loader2, 
    Check, 
    Cloud, 
    AlertCircle,
    BookOpen
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface EditorHeaderProps {
    title: string;
    setTitle: (t: string) => void;
    handleTitleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    tags: string[];
    handleTagRemove: (tag: string) => void;
    newTag: string;
    setNewTag: (t: string) => void;
    handleTagAdd: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    paperStyle: 'clean' | 'dots' | 'grid' | 'lines';
    setPaperStyle: (s: 'clean' | 'dots' | 'grid' | 'lines') => void;
    isPinned: boolean;
    setIsPinned: (p: boolean) => void;
    isReadingMode: boolean;
    setIsReadingMode: (r: boolean) => void;
    saveStatus: 'idle' | 'saving' | 'saved' | 'error';
    visibleActivePageIndex: number;
    totalPages: number;
    onExport: () => void;
    onCopy: () => void;
    onTogglePin: () => Promise<void>;
    onUpdateNotebook: (updates: any) => Promise<void>;
}

export function EditorHeader({
    title,
    handleTitleChange,
    tags,
    handleTagRemove,
    newTag,
    setNewTag,
    handleTagAdd,
    paperStyle,
    setPaperStyle,
    isPinned,
    setIsPinned,
    isReadingMode,
    setIsReadingMode,
    saveStatus,
    visibleActivePageIndex,
    totalPages,
    onExport,
    onCopy,
    onTogglePin,
    onUpdateNotebook
}: EditorHeaderProps) {
    return (
        <>
            {/* Action Bar (Floating Right) */}
            <div className="absolute top-6 right-6 flex items-center gap-1 p-1 glass paper-shadow rounded-xl z-10 transition-all">
                {/* Style Button */}
                <button
                    onClick={() => {
                        const styles: ('clean' | 'dots' | 'grid' | 'lines')[] = ['clean', 'dots', 'grid', 'lines'];
                        const nextIndex = (styles.indexOf(paperStyle) + 1) % styles.length;
                        const nextStyle = styles[nextIndex];
                        setPaperStyle(nextStyle);
                        onUpdateNotebook({ paperStyle: nextStyle });
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

                <button
                    onClick={() => setIsReadingMode(!isReadingMode)}
                    className={cn(
                        "p-2 transition-all rounded-lg",
                        isReadingMode
                            ? "text-purple-500 bg-purple-50/50 dark:bg-purple-900/40"
                            : "text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-gray-700"
                    )}
                    title={isReadingMode ? "Exit Reading Mode" : "Enter Reading Mode (⌘+Shift+R)"}
                >
                    <BookOpen className="w-4 h-4" />
                </button>

                {/* Pin Button */}
                <button
                    onClick={async () => {
                        const newVal = !isPinned;
                        setIsPinned(newVal);
                        await onTogglePin();
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
                <button onClick={onExport} className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all rounded-lg hover:bg-white dark:hover:bg-gray-700" title="Export to Markdown">
                    <Download className="w-4 h-4" />
                </button>

                {/* Copy Button */}
                <button onClick={onCopy} className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all rounded-lg hover:bg-white dark:hover:bg-gray-700" title="Copy as Markdown">
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
                        {visibleActivePageIndex + 1} / {totalPages}
                    </div>
                </div>
            </div>

            {/* Title & Tags Header */}
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
        </>
    );
}
