"use client";

import { 
    SuggestionMenuController, 
    getDefaultReactSlashMenuItems 
} from "@blocknote/react";
import { BlockNoteEditor } from "@blocknote/core";
import { Calendar, Link2 } from "lucide-react";
import { useNotebookStore } from "@/lib/store";

interface EditorExtensionsProps {
    editor: BlockNoteEditor;
    currentNotebookId: string;
}

export function EditorExtensions({ editor, currentNotebookId }: EditorExtensionsProps) {
    return (
        <>
            {/* Slash Menu (/) */}
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

            {/* Cross-linking Menu ([[) */}
            <SuggestionMenuController
                triggerCharacter={"["}
                getItems={async (query) => {
                    const store = useNotebookStore.getState();
                    let allNotebooks = store.notebooks;

                    // Ensure notebooks are loaded for cross-linking
                    if (allNotebooks.length <= 1) {
                        await store.fetchNotebooks();
                        allNotebooks = useNotebookStore.getState().notebooks;
                    }

                    const searchTerm = query.toLowerCase().replace(/^\[/, '');
                    const suggestions: any[] = [];

                    allNotebooks.forEach(nb => {
                        // 1. Notebook Match
                        if (nb.id !== currentNotebookId && nb.title.toLowerCase().includes(searchTerm)) {
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
                                    { type: "link", href: href, content: linkText },
                                    { type: "text", text: " ", styles: {} }
                                ]);
                            }
                        }));
                }}
            />
        </>
    );
}
