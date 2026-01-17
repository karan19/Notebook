"use client";

import { Button } from "@/components/ui/button";
import { useAuthenticator } from '@aws-amplify/ui-react';
import { Plus, FileText, Star, Trash2, Search, Settings, Hash, UserCircle } from "lucide-react";
import { useNotebookStore } from "@/lib/store";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function Sidebar() {
    const { addNotebook, searchQuery, setSearchQuery, currentFilter, setFilter } = useNotebookStore();
    const { signOut } = useAuthenticator();
    const router = useRouter();
    const pathname = usePathname();

    const handleCreate = async () => {
        const id = await addNotebook();
        router.push(`/notebooks/${id}`);
    };

    const handleComingSoon = (feature: string) => {
        alert(`${feature} is coming soon! Our cloud engineers are hard at work. 🚀`);
    };

    const navItems = [
        { label: "All Notebooks", icon: FileText, filter: 'all' },
        { label: "Favorites", icon: Star, filter: 'favorites' },
        { label: "Trash", icon: Trash2, filter: 'trash' },
    ];

    const tags = ["Project Alpha", "Personal", "Ideas", "Recipes"];

    const handleNavClick = (item: any) => {
        if (item.filter) {
            setFilter(item.filter);
            if (pathname !== '/') router.push('/');
        }
    };

    return (
        <div className="w-64 h-full bg-white border-r flex flex-col px-4 py-8 gap-8 shadow-[1px_0_0_0_rgba(0,0,0,0.05)]">
            <div className="flex items-center gap-3 px-3 mb-2">
                <div
                    className="w-8 h-8 bg-black rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-black/20 cursor-pointer hover:scale-105 transition-transform"
                    onClick={() => { setFilter('all'); router.push('/'); }}
                >
                    N
                </div>
                <span className="font-bold text-gray-900 text-lg tracking-tight">Notebook</span>
            </div>

            <Button
                onClick={handleCreate}
                className="w-full bg-black hover:bg-black/90 text-white shadow-xl shadow-black/10 flex items-center gap-2 py-6 rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
                <Plus className="h-5 w-5" />
                <span className="font-semibold">New Entry</span>
            </Button>

            <div className="flex flex-col gap-4">
                {/* Search Bar */}
                <div className="px-1">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-black transition-colors" />
                        <input
                            type="text"
                            placeholder="Quick Search..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-gray-50 border-transparent focus:bg-white focus:border-gray-100 focus:ring-4 focus:ring-gray-50 rounded-xl py-2.5 pl-10 pr-4 text-sm font-medium transition-all"
                        />
                    </div>
                </div>

                <nav className="flex flex-col gap-1.5">
                    <p className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Navigation</p>
                    {navItems.map((item) => (
                        <Button
                            key={item.label}
                            variant="ghost"
                            onClick={() => handleNavClick(item)}
                            className={cn(
                                "w-full justify-start gap-3 rounded-xl py-5 font-medium transition-all text-sm",
                                currentFilter === item.filter ? "bg-black text-white shadow-lg shadow-black/10" : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
                            )}
                        >
                            <item.icon className={cn("h-4.5 w-4.5", currentFilter === item.filter ? "text-white" : "text-gray-400")} />
                            {item.label}
                        </Button>
                    ))}
                </nav>
            </div>

            <div className="flex flex-col gap-1.5">
                <p className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Collections</p>
                {tags.map((tag) => (
                    <Button
                        key={tag}
                        variant="ghost"
                        onClick={() => handleComingSoon(`Collection: ${tag}`)}
                        className="w-full justify-start gap-3 text-gray-400 hover:bg-gray-50 rounded-xl py-5 font-medium transition-all opacity-60"
                    >
                        <Hash className="h-4.5 w-4.5 text-gray-300" />
                        {tag}
                    </Button>
                ))}
            </div>

            <div className="mt-auto flex flex-col gap-1.5 border-t pt-8 border-gray-100">
                <Button
                    variant="ghost"
                    onClick={() => handleComingSoon("Settings")}
                    className="w-full justify-start gap-3 text-gray-500 hover:bg-gray-50 rounded-xl py-5 transition-all"
                >
                    <Settings className="h-4.5 w-4.5" />
                    Settings
                </Button>
                <Button
                    variant="ghost"
                    onClick={signOut}
                    className="w-full justify-start gap-3 text-red-500 hover:bg-red-50 rounded-xl py-5 transition-all group"
                >
                    <UserCircle className="h-4.5 w-4.5 group-hover:animate-pulse" />
                    Sign Out
                </Button>
            </div>
        </div>
    );
}
