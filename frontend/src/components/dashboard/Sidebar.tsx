"use client";

import { Button } from "@/components/ui/button";
import { Plus, FileText, Star, Trash2, Search, Settings, Hash } from "lucide-react";
import { useNotebookStore } from "@/lib/store";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function Sidebar() {
    const { addNotebook } = useNotebookStore();
    const router = useRouter();
    const pathname = usePathname();

    const handleCreate = async () => {
        const id = await addNotebook();
        router.push(`/notebooks/${id}`);
    };

    const navItems = [
        { label: "All Notebooks", icon: FileText, href: "/" },
        { label: "Favorites", icon: Star, href: "/favorites" },
        { label: "Trash", icon: Trash2, href: "/trash" },
    ];

    const tags = ["Project Alpha", "Personal", "Ideas", "Recipes"];

    return (
        <div className="w-64 h-full bg-white border-r flex flex-col px-4 py-8 gap-8 shadow-[1px_0_0_0_rgba(0,0,0,0.05)]">
            <div className="flex items-center gap-3 px-3 mb-2">
                <div className="w-8 h-8 bg-black rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-black/20">N</div>
                <span className="font-bold text-gray-900 text-lg tracking-tight">Notebook</span>
            </div>

            <Button
                onClick={handleCreate}
                className="w-full bg-black hover:bg-black/90 text-white shadow-xl shadow-black/10 flex items-center gap-2 py-6 rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
                <Plus className="h-5 w-5" />
                <span className="font-semibold">New Entry</span>
            </Button>

            <nav className="flex flex-col gap-1.5">
                <p className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Navigation</p>
                {navItems.map((item) => (
                    <Link key={item.label} href={item.href}>
                        <Button
                            variant="ghost"
                            className={cn(
                                "w-full justify-start gap-3 rounded-xl py-5 font-medium transition-all",
                                pathname === item.href ? "bg-gray-100 text-black shadow-inner" : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
                            )}
                        >
                            <item.icon className={cn("h-4.5 w-4.5", pathname === item.href ? "text-black" : "text-gray-400")} />
                            {item.label}
                        </Button>
                    </Link>
                ))}
            </nav>

            <div className="flex flex-col gap-1.5">
                <p className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Collections</p>
                {tags.map((tag) => (
                    <Button
                        key={tag}
                        variant="ghost"
                        className="w-full justify-start gap-3 text-gray-500 hover:bg-gray-50 hover:text-gray-800 rounded-xl py-5 font-medium transition-all"
                    >
                        <Hash className="h-4.5 w-4.5 text-gray-300" />
                        {tag}
                    </Button>
                ))}
            </div>

            <div className="mt-auto flex flex-col gap-1.5 border-t pt-8 border-gray-100">
                <Button variant="ghost" className="w-full justify-start gap-3 text-gray-500 hover:bg-gray-50 rounded-xl py-5">
                    <Search className="h-4.5 w-4.5" />
                    Quick Search
                </Button>
                <Button variant="ghost" className="w-full justify-start gap-3 text-gray-500 hover:bg-gray-50 rounded-xl py-5">
                    <Settings className="h-4.5 w-4.5" />
                    Settings
                </Button>
            </div>
        </div>
    );
}
