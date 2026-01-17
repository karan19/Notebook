"use client";

import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { useNotebookStore } from "@/lib/store";
import { useEffect, useState, useMemo } from "react";

interface EditorProps {
    id: string;
}

export function Editor({ id }: EditorProps) {
    const { loadContent, saveContent } = useNotebookStore();
    const [isLoaded, setIsLoaded] = useState(false);

    // Initialize editor
    const editor = useCreateBlockNote();

    // Load content from S3 via store
    useEffect(() => {
        async function load() {
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

    if (!editor) {
        return null;
    }

    return (
        <div className="flex flex-col h-full bg-[#FAFAFA] overflow-hidden">
            <div className="flex-1 overflow-y-auto p-12 pt-8 flex justify-center scroll-smooth">
                <div className="w-full max-w-4xl bg-white shadow-[0_10px_40px_rgba(0,0,0,0.04)] rounded-md border border-gray-100 min-h-[1056px] px-8 py-12">
                    {isLoaded && (
                        <BlockNoteView
                            editor={editor}
                            theme="light"
                            onChange={() => {
                                // Debounced save logic
                                const html = editor.blocksToFullHTML(editor.document);
                                html.then(content => {
                                    saveContent(id, content);
                                });
                            }}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
