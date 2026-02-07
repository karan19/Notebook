
import { useEffect, useState } from "react";
import { BlockNoteEditor } from "@blocknote/core";
import { motion } from "motion/react";
import { ChevronRight, List, Link as LinkIcon, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";


interface TableOfContentsProps {
    editor: BlockNoteEditor | null;
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    currentNotebookId: string;
    currentNotebookTitle: string;
}

interface TocItem {
    id: string;
    text: string;
    level: number;
}



export function TableOfContents({ editor, isOpen, setIsOpen, currentNotebookId, currentNotebookTitle }: TableOfContentsProps) {
    const [headings, setHeadings] = useState<TocItem[]>([]);
    const [activeId, setActiveId] = useState<string | null>(null);

    // Extract headings from editor
    useEffect(() => {
        if (!editor) return;

        const updateHeadings = () => {
            const document = editor.document;
            const newHeadings: TocItem[] = [];

            document.forEach((block) => {
                if (block.type === "heading") {
                    // Extract text content safely
                    const textContent = Array.isArray(block.content)
                        ? block.content.map(c => (c.type === "text" ? c.text : typeof c === 'string' ? c : '')).join("")
                        : ""; // Handle generic content structure

                    if (textContent && textContent.trim().length > 0) {
                        newHeadings.push({
                            id: block.id,
                            text: textContent,
                            level: block.props.level,
                        });
                    }
                }
            });
            setHeadings(newHeadings);
        };

        // Initial load
        updateHeadings();

        // Listen for changes
        editor.onEditorContentChange(() => {
            updateHeadings();
        });

        return () => {
            // No-op if API returns void
        };

    }, [editor]);

    // Handle scroll highlighting
    useEffect(() => {
        if (!editor || headings.length === 0) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setActiveId(entry.target.getAttribute("data-id"));
                    }
                });
            },
            { rootMargin: "-10% 0px -80% 0px" } // trigger when near top
        );

        headings.forEach((h) => {
            const el = document.querySelector(`[data-id="${h.id}"]`);
            if (el) observer.observe(el);
        });

        return () => observer.disconnect();
    }, [headings, editor]);


    const handleItemClick = (id: string) => {
        if (!editor) return;

        const el = document.querySelector(`[data-id="${id}"]`);
        if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
            setActiveId(id);
        }
    };

    // Auto-scroll TOC to active item
    useEffect(() => {
        if (activeId && isOpen) {
            const activeEl = document.getElementById(`toc-item-${activeId}`);
            if (activeEl) {
                activeEl.scrollIntoView({
                    behavior: "smooth",
                    block: "nearest",
                });
            }
        }
    }, [activeId, isOpen]);

    return (
        <motion.div
            initial={false}
            animate={{ width: isOpen ? 280 : 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="h-full relative shrink-0 z-40"
        >
            {/* Toggle Handle - Attached rigidly to the left edge of the sidebar */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="absolute left-0 top-1/2 -translate-x-full -translate-y-1/2 border border-r-0 border-gray-200 bg-white shadow-sm p-2 rounded-l-md text-gray-400 hover:text-gray-900 transition-colors z-50 flex items-center justify-center w-9 h-10"
                title={isOpen ? "Close Sidebar" : "Open Sidebar"}
            >
                {isOpen ? <ChevronRight className="w-5 h-5" /> : <List className="w-5 h-5" />}
            </button>

            {/* Content Container - Clips content when width shrinks */}
            <div className="w-[280px] h-full bg-white border-l border-gray-200 overflow-hidden flex flex-col shadow-[-10px_0_15px_rgba(0,0,0,0.02)]">
                {/* Header */}
                <div className="flex items-center border-b border-gray-100 bg-gray-50/50 py-3 px-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                        Table of Contents
                    </span>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-hidden relative">
                    <div className="h-full overflow-y-auto p-4 scroll-smooth">
                        {headings.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center px-4">
                                <List className="w-8 h-8 text-gray-200 mb-2" />
                                <p className="text-xs text-gray-300 italic">
                                    Add headings to generate a table of contents.
                                </p>
                            </div>
                        ) : (
                            <ul className="space-y-1">
                                {headings.map((heading) => (
                                    <li key={heading.id} id={`toc-item-${heading.id}`}>
                                        <button
                                            onClick={() => handleItemClick(heading.id)}
                                            className={cn(
                                                "text-left w-full py-1.5 pr-2 rounded-md text-sm transition-all duration-200 block truncate relative group",
                                                heading.level === 1 && "pl-2 font-medium",
                                                heading.level === 2 && "pl-6 text-xs",
                                                heading.level === 3 && "pl-10 text-xs italic",
                                                activeId === heading.id
                                                    ? "bg-blue-50 text-blue-600 font-semibold"
                                                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                                            )}
                                        >
                                            {activeId === heading.id && (
                                                <motion.div
                                                    layoutId="active-toc-indicator"
                                                    className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-r-full"
                                                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                                />
                                            )}
                                            {heading.text}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
