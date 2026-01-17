"use client";

import { use, useState, useEffect } from "react";
import { Editor } from "@/components/editor/Editor";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { History, UserCircle, ChevronLeft } from "lucide-react";
import { useNotebookStore } from "@/lib/store";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function NotebookPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const { getNotebook, updateNotebook } = useNotebookStore();
    const [notebook, setNotebook] = useState<any>(null);
    const [title, setTitle] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            const nb = await getNotebook(id);
            if (nb) {
                setNotebook(nb);
                setTitle(nb.title);
            }
            setLoading(false);
        };
        load();
    }, [id, getNotebook]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-[#F8F9FA]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
                    <p className="text-gray-400 text-sm font-medium">Loading your thoughts...</p>
                </div>
            </div>
        );
    }

    if (!notebook) {
        return (
            <div className="flex flex-col items-center justify-center h-screen gap-4 bg-[#F8F9FA]">
                <h1 className="text-2xl font-semibold text-gray-800">Notebook not found</h1>
                <Button onClick={() => router.push("/")} variant="outline">Back to Dashboard</Button>
            </div>
        );
    }

    const handleTitleChange = async (newTitle: string) => {
        setTitle(newTitle);
        await updateNotebook(id, { title: newTitle });
    };

    return (
        <div className="flex flex-col h-screen bg-[#FDFDFD]">
            {/* Premium Minimalist Header */}
            <header className="flex items-center justify-between px-8 py-4 bg-white/80 backdrop-blur-md border-b border-gray-100 z-50 sticky top-0">
                <div className="flex items-center gap-6 flex-1">
                    <Link href="/" className="group flex items-center justify-center w-10 h-10 hover:bg-gray-50 rounded-xl transition-all border border-transparent hover:border-gray-100">
                        <ChevronLeft className="h-5 w-5 text-gray-400 group-hover:text-black transition-colors" />
                    </Link>
                    <div className="flex flex-col flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <Input
                                value={title}
                                onChange={(e) => handleTitleChange(e.target.value)}
                                maxLength={50}
                                className="h-10 py-0 px-2 border-transparent hover:bg-gray-50 focus:bg-white focus:border-gray-100 font-bold text-2xl w-full max-w-xl transition-all bg-transparent shadow-none focus-visible:ring-0 rounded-lg"
                                placeholder="Untitled Selection"
                            />
                        </div>
                        <div className="flex items-center gap-3 text-[10px] font-bold text-gray-300 ml-2 uppercase tracking-[0.1em]">
                            <span>Cloud Synchronized</span>
                            <span className="w-1 h-1 bg-gray-200 rounded-full" />
                            <span>{new Date(notebook.lastEditedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-gray-50 text-gray-400 hover:text-black transition-all">
                        <History className="h-5 w-5" />
                    </Button>
                    <div className="w-px h-6 bg-gray-100" />
                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-gray-50 text-gray-400 hover:text-black transition-all">
                        <UserCircle className="h-6 w-6" />
                    </Button>
                </div>
            </header>

            {/* BlockNote Workspace */}
            <main className="flex-1 overflow-hidden relative">
                <Editor id={id} />
            </main>
        </div>
    );
}
