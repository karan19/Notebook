
import { useEffect, useState } from "react";
import { BlockNoteEditor } from "@blocknote/core";
import { motion, AnimatePresence } from "motion/react";
import { ChevronRight, List } from "lucide-react";
import { cn } from "@/lib/utils";

interface TableOfContentsProps {
    editor: BlockNoteEditor | null;
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
}

interface TocItem {
    id: string;
    text: string;
    level: number;
}

export function TableOfContents({ editor, isOpen, setIsOpen }: TableOfContentsProps) {
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

        // Cleanup: BlockNote core might not expose a direct unsubscribe from this method in this version,
        // or it's managed internally. If it returns void, we can't call it.
        return () => {
            // No-op if API returns void
        };

    }, [editor]);

    // Handle scroll highlighting
    // This is tricky with BlockNote as blocks are virtualized or nested. 
    // We'll use a simple IntersectionObserver on the block elements in the DOM.
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
            // Optionally set active manually
            setActiveId(id);
        }
    };

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
                title={isOpen ? "Close Table of Contents" : "Open Table of Contents"}
            >
                {isOpen ? <ChevronRight className="w-5 h-5" /> : <List className="w-5 h-5" />}
            </button>

            {/* Content Container - Clips content when width shrinks */}
            <div className="w-[280px] h-full bg-white border-l border-gray-200 overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                        Table of Contents
                    </span>
                </div>

                {/* Content List */}
                <div className="flex-1 overflow-y-auto p-4 scroll-smooth">
                    {headings.length === 0 ? (
                        <p className="text-xs text-gray-300 italic text-center mt-10">
                            Add headings to generate a table of contents.
                        </p>
                    ) : (
                        <ul className="space-y-1">
                            {headings.map((heading) => (
                                <li key={heading.id}>
                                    <button
                                        onClick={() => handleItemClick(heading.id)}
                                        className={cn(
                                            "text-left w-full py-1.5 pr-2 rounded-md text-sm transition-colors duration-200 block truncate",
                                            heading.level === 1 && "pl-2 font-medium",
                                            heading.level === 2 && "pl-6 text-xs",
                                            heading.level === 3 && "pl-10 text-xs italic",
                                            activeId === heading.id
                                                ? "bg-blue-50 text-blue-600 font-medium"
                                                : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                                        )}
                                    >
                                        {heading.text}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
