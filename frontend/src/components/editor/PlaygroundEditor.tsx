"use client";

import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { useState } from "react";

export function PlaygroundEditor() {
    const editor = useCreateBlockNote();
    const [title, setTitle] = useState("Playground Document");

    if (!editor) {
        return null;
    }

    return (
        <div className="flex flex-col h-full bg-[#f0f0f0] overflow-hidden">
            {/* Scrollable Container */}
            <div className="flex-1 overflow-y-auto px-8 py-8 flex justify-center scroll-smooth pb-32">
                {/* Paper */}
                <div className="w-full max-w-[850px] bg-white shadow-lg min-h-[1056px] flex flex-col relative transition-all duration-200 ease-in-out">
                    {/* Content Area */}
                    <div className="px-16 py-12 flex-1">
                        <input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Untitled"
                            className="w-full text-4xl font-bold text-gray-900 placeholder:text-gray-300 border-none focus:ring-0 focus:outline-none bg-transparent mb-8"
                        />
                        <BlockNoteView
                            editor={editor}
                            theme="light"
                            className="min-h-[500px]"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
