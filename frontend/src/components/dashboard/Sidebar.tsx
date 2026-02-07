"use client";

import { Button } from "@/components/ui/button";
import { useAuthenticator } from '@aws-amplify/ui-react';
import { Plus, FileText, Star, Search, Clock, Command } from "lucide-react";
import { useNotebookStore } from "@/lib/store";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export function Sidebar() {
    const { addNotebook, searchQuery, setSearchQuery, currentFilter, setFilter, recentNotebooks, notebooks, addToRecent } = useNotebookStore();
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
    ];

    const handleNavClick = (item: { filter?: string; }) => {
        if (item.filter) {
            setFilter(item.filter as 'all' | 'favorites' | 'trash');
            if (pathname !== '/') router.push('/');
        }
    };

    // Get recent notebook details
    const recentItems = recentNotebooks
        .map(id => notebooks.find(n => n.id === id))
        .filter(Boolean)
        .slice(0, 5);

    return (
        <div className="w-64 h-full bg-white dark:bg-gray-900 border-r dark:border-gray-800 flex flex-col px-4 py-8 gap-8 shadow-[1px_0_0_0_rgba(0,0,0,0.05)] dark:shadow-none">
            <div className="flex items-center gap-3 px-3 mb-2">
                <div
                    className="w-8 h-8 bg-black dark:bg-white rounded-xl flex items-center justify-center text-white dark:text-black font-bold text-sm shadow-lg shadow-black/20 cursor-pointer hover:scale-105 transition-transform"
                    onClick={() => { setFilter('all'); router.push('/'); }}
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 256 256"
                        fill="none"
                        className="w-5 h-5"
                    >
                        {/* Cover */}
                        <rect x="40" y="24" width="176" height="208" rx="16" fill="currentColor" stroke="currentColor" strokeWidth="4" />
                        {/* Spine */}
                        <rect x="40" y="24" width="28" height="208" rx="12" fill="currentColor" stroke="currentColor" strokeWidth="4" />
                        {/* Rings */}
                        <circle cx="54" cy="64" r="6" className="fill-white dark:fill-black" />
                        <circle cx="54" cy="96" r="6" className="fill-white dark:fill-black" />
                        <circle cx="54" cy="128" r="6" className="fill-white dark:fill-black" />
                        <circle cx="54" cy="160" r="6" className="fill-white dark:fill-black" />
                        {/* Lines */}
                        <line x1="88" y1="72" x2="200" y2="72" className="stroke-white dark:stroke-black" strokeWidth="3" />
                        <line x1="88" y1="104" x2="200" y2="104" className="stroke-white dark:stroke-black" strokeWidth="3" />
                        <line x1="88" y1="136" x2="200" y2="136" className="stroke-white dark:stroke-black" strokeWidth="3" />
                        <line x1="88" y1="168" x2="200" y2="168" className="stroke-white dark:stroke-black" strokeWidth="3" />
                    </svg>
                </div>
                <span className="font-bold text-gray-900 dark:text-white text-lg tracking-tight">Notebook</span>
            </div>

            <Button
                onClick={handleCreate}
                className="w-full bg-black dark:bg-white hover:bg-black/90 dark:hover:bg-white/90 text-white dark:text-black shadow-xl shadow-black/10 flex items-center gap-2 py-6 rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
                <Plus className="h-5 w-5" />
                <span className="font-semibold">New Entry</span>
            </Button>

            <div className="flex flex-col gap-4 flex-1 overflow-hidden">
                <nav className="flex flex-col gap-1.5">
                    <p className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Navigation</p>
                    {navItems.map((item) => (
                        <Button
                            key={item.label}
                            variant="ghost"
                            onClick={() => handleNavClick(item)}
                            className={cn(
                                "w-full justify-start gap-3 rounded-xl py-5 font-medium transition-all text-sm",
                                currentFilter === item.filter
                                    ? "bg-black dark:bg-white text-white dark:text-black shadow-lg shadow-black/10"
                                    : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-800 dark:hover:text-gray-200"
                            )}
                        >
                            <item.icon className={cn("h-4.5 w-4.5", currentFilter === item.filter ? "text-white dark:text-black" : "text-gray-400")} />
                            {item.label}
                        </Button>
                    ))}
                </nav>

                {/* Recent Notebooks */}
                {recentItems.length > 0 && (
                    <div className="mt-2">
                        <p className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                            <Clock className="w-3 h-3" />
                            Recent
                        </p>
                        <div className="flex flex-col gap-0.5">
                            {recentItems.map((nb) => nb && (
                                <Link
                                    key={nb.id}
                                    href={`/notebooks/${nb.id}`}
                                    onClick={() => addToRecent(nb.id)}
                                    className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors truncate"
                                >
                                    {nb.title}
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {/* Quick Switcher Hint */}
                <div className="mt-auto px-3 py-2">
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                        <Command className="w-3 h-3" />
                        <span>Press <kbd className="px-1 bg-gray-100 dark:bg-gray-800 rounded text-[10px]">⌘P</kbd> to quick switch</span>
                    </div>
                </div>
            </div>

            {/* Theme Toggle at bottom */}
            <div className="border-t dark:border-gray-800 pt-4">
                <p className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Preferences</p>
                <ThemeToggle />
            </div>
        </div>
    );
}

