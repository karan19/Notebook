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
    const [tags, setTags] = useState<string[]>([]);
    const [newTag, setNewTag] = useState("");
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
        // Sync local title and tags with store when loaded
        const nb = getNotebook(id);
        if (nb instanceof Promise) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            nb.then((n: any) => {
                if (n) {
                    setTitle(n.title);
                    setTags(n.tags || []);
                }
            });
        } else if (nb) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            setTitle((nb as any).title);
            setTags((nb as any).tags || []);
        }
    }, [id, getNotebook, isLoaded]);

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
                    <div className="mb-8 border-b border-gray-100 pb-8">
                        <div className="flex items-center gap-4 mb-4">
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
                                style={{ fontSize: "50px", height: "auto" }}
                                className="flex-1 font-extrabold tracking-tight text-gray-900 border-none focus:ring-0 p-0 bg-transparent placeholder:text-gray-300 leading-tight"
                                placeholder="Title"
                            />
                        </div>

                        {/* Tags Input */}
                        <div className="flex flex-wrap items-center gap-2 pl-12">
                            {tags.map(tag => (
                                <span
                                    key={tag}
                                    onClick={() => handleTagRemove(tag)}
                                    className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-md hover:bg-red-50 hover:text-red-500 cursor-pointer transition-colors"
                                >
                                    #{tag}
                                </span>
                            ))}
                            <input
                                value={newTag}
                                onChange={(e) => setNewTag(e.target.value)}
                                onKeyDown={handleTagAdd}
                                className="text-sm text-gray-500 border-none focus:ring-0 p-0 bg-transparent placeholder:text-gray-300 w-32"
                                placeholder="+ Add tag"
                            />
                        </div>
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
