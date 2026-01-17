"use client";

import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { useNotebookStore } from "@/lib/store";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface EditorProps {
    id: string;
}

export function Editor({ id }: EditorProps) {
    const { getNotebook, updateNotebook, loadContent, saveContent, uploadAsset } = useNotebookStore();
    const [title, setTitle] = useState("Untitled");
    const [isLoaded, setIsLoaded] = useState(false);

    // Initialize editor
    const editor = useCreateBlockNote({
        uploadFile: uploadAsset,
    });

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
                    {/* Content Header */}
                    <div className="mb-8 border-b border-gray-100 pb-8 flex items-center gap-4">
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
                            className="flex-1 text-4xl font-extrabold tracking-tight text-gray-900 border-none focus:ring-0 p-0 bg-transparent placeholder:text-gray-300"
                            placeholder="Title"
                        />
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


        </div>
    );
}
