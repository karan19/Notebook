"use client";

import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { useNotebookStore } from "@/lib/store";
import { useEffect, useState } from "react";
import { ChevronRight, Hash } from "lucide-react";

import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface EditorProps {
    id: string;
}

export function Editor({ id }: EditorProps) {
    const { getNotebook, updateNotebook, loadContent, saveContent } = useNotebookStore();
    const [title, setTitle] = useState("Untitled");
    const [isLoaded, setIsLoaded] = useState(false);

    // Initialize editor
    const editor = useCreateBlockNote();

    // Load content from S3 via store
    useEffect(() => {
        async function load() {
            // Only load if not loaded or if it's a different ID
            if (editor && !isLoaded) {
                try {
                    const html = await loadContent(id);
                    if (html) {
                        const blocks = await editor.tryParseHTMLToBlocks(html);
                        editor.replaceBlocks(editor.document, blocks);
                    }
                    setIsLoaded(true);
                } catch (e) {
                    console.error("Failed to load notebook content", e);
                    setIsLoaded(true);
                }
            }
        }
        load();
    }, [editor, id, isLoaded, loadContent]);

    useEffect(() => {
        // Sync local title with store when loaded
        const nb = getNotebook(id);
        if (nb instanceof Promise) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            nb.then((n: any) => n && setTitle(n.title));
        } else if (nb) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            setTitle((nb as any).title);
        }
    }, [id, getNotebook, isLoaded]);

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newTitle = e.target.value;
        setTitle(newTitle);
        updateNotebook(id, { title: newTitle });
    };

    if (!editor) {
        return null;
    }

    if (!isLoaded) {
        return (
            <div className="flex h-full items-center justify-center">
                <LoadingSpinner size={40} className="text-gray-300" />
            </div>
        );
    }

    return (
        <div className="flex w-full h-full bg-white text-gray-900 font-sans">
            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto relative">
                <div className="max-w-3xl mx-auto px-8 py-12 min-h-screen">
                    {/* Breadcrumbs */}
                    <div className="flex items-center gap-2 text-sm text-gray-400 mb-8 select-none">
                        <span>Notebooks</span>
                        <ChevronRight className="w-4 h-4" />
                        <span className="text-gray-900 font-medium truncate max-w-[200px]">{title || "Untitled"}</span>
                    </div>

                    {/* Content Header */}
                    <div className="mb-8 border-b border-gray-100 pb-8">
                        <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs font-medium mb-4">
                            Notebook Layout
                        </div>
                        <input
                            value={title}
                            onChange={handleTitleChange}
                            className="w-full text-4xl font-extrabold tracking-tight text-gray-900 border-none focus:ring-0 p-0 bg-transparent placeholder:text-gray-300"
                            placeholder="Title"
                        />
                        <p className="mt-4 text-lg text-gray-500 leading-relaxed">
                            Start writing your documentation, notes, or ideas here.
                        </p>
                    </div>

                    {/* Editor */}
                    <div className="prose prose-slate max-w-none pb-32">
                        <BlockNoteView
                            editor={editor}
                            theme="light"
                            onChange={() => {
                                // Debounced save logic
                                const html = editor.blocksToFullHTML(editor.document);
                                saveContent(id, html);
                            }}
                        />
                    </div>
                </div>
            </main>

            {/* On-page Nav (TOC) - Static for now, can be made dynamic later */}
            <aside className="w-64 border-l border-gray-100 h-full hidden xl:block p-8 overflow-y-auto">
                <div className="fixed w-48">
                    <h4 className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Hash className="w-3 h-3" /> On This Page
                    </h4>
                    <ul className="space-y-2 text-sm text-gray-500 border-l border-gray-100 pl-4">
                        <li className="hover:text-gray-900 cursor-pointer transition-colors">Top of Page</li>
                    </ul>
                </div>
            </aside>
        </div>
    );
}
