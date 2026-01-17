"use client";

import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { useNotebookStore } from "@/lib/store";
import { useEffect, useState, useMemo } from "react";

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
        <div className="flex flex-col h-full bg-[#f0f0f0] overflow-hidden">
            <div className="flex-1 overflow-y-auto p-8 flex justify-center scroll-smooth pb-32">
                <div
                    className="w-full max-w-[850px] bg-white shadow-xl min-h-[1100px] overflow-hidden relative"
                    style={{
                        // Visual Page Breaks: White page (1056px) + Grey gap (20px)
                        backgroundImage: 'repeating-linear-gradient(to bottom, white 0px, white 1056px, #f0f0f0 1056px, #f0f0f0 1080px)'
                    }}
                >
                    <div className="px-16 py-12 min-h-[1056px]">
                        {/* Document Title Input */}
                        <input
                            value={title}
                            onChange={handleTitleChange}
                            placeholder="Untitled"
                            className="w-full text-4xl font-bold text-gray-900 placeholder:text-gray-300 border-none focus:ring-0 focus:outline-none bg-transparent mb-6 p-0"
                        />

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
            </div>
        </div>
    );
}
