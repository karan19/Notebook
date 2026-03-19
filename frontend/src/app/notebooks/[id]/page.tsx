"use client";

import { use } from "react";
import { Editor } from "@/components/editor/Editor";

export default function NotebookPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);

    return (
        <div className="flex flex-col h-screen bg-white">
            <main className="flex-1 overflow-hidden relative">
                <Editor id={id} />
            </main>
        </div>
    );
}
