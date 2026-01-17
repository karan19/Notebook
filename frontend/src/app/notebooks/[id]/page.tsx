"use client";

import { use, useState, useEffect } from "react";
import { Editor } from "@/components/editor/Editor";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UserCircle, ChevronLeft } from "lucide-react";
import { useNotebookStore } from "@/lib/store";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { FullPageSpinner } from "@/components/ui/loading-spinner";

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
