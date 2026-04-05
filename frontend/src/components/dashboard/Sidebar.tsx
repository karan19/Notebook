"use client";
import { useEffect, useState, memo, useMemo } from "react";

import { Button } from "@/components/ui/button";
import { useAuthenticator } from '@aws-amplify/ui-react';
import { Plus, FileText, Star, Search, Clock, Command, ChevronLeft, ChevronRight, PanelLeftClose, PanelLeftOpen, Settings } from "lucide-react";
import { useNotebookStore } from "@/lib/store";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { toast } from "sonner";

export const Sidebar = memo(() => {
    const addNotebook = useNotebookStore(state => state.addNotebook);
    const currentFilter = useNotebookStore(state => state.currentFilter);
    const setFilter = useNotebookStore(state => state.setFilter);
    const recentNotebooks = useNotebookStore(state => state.recentNotebooks);
    const notebooks = useNotebookStore(state => state.notebooks);
    const addToRecent = useNotebookStore(state => state.addToRecent);

    const { signOut } = useAuthenticator();
    const router = useRouter();
    const pathname = usePathname();
    const [isCollapsed, setIsCollapsed] = useState(false);

    // Load collapse state from localStorage
    useEffect(() => {
        const saved = localStorage.getItem("sidebar-collapsed");
        if (saved) setIsCollapsed(JSON.parse(saved));
    }, []);

    const toggleCollapse = () => {
        const newState = !isCollapsed;
        setIsCollapsed(newState);
        localStorage.setItem("sidebar-collapsed", JSON.stringify(newState));
    };

    const handleCreate = async () => {
        toast.promise(
            (async () => {
                const id = await addNotebook();
                router.push(`/notebooks/${id}`);
                return id;
            })(),
            {
                loading: 'Creating new notebook...',
                success: 'Notebook created',
                error: 'Failed to create notebook'
            }
        );
    };

    const handleComingSoon = (feature: string) => {
        alert(`${feature} is coming soon! Our cloud engineers are hard at work. 🚀`);
    };

    const navItems = [
        { label: "All Notebooks", icon: FileText, filter: 'all' },
        { label: "Favorites", icon: Star, filter: 'favorites' },
        { label: "API Settings", icon: Settings, href: '/settings' },
    ];

    const handleNavClick = (item: { filter?: string; href?: string; }) => {
        if (item.filter) {
            setFilter(item.filter as 'all' | 'favorites' | 'trash');
            if (pathname !== '/') router.push('/');
        } else if (item.href) {
            router.push(item.href);
        }
    };

    // Get recent notebook details
    const recentItems = useMemo(() => {
        return recentNotebooks
            .map(id => notebooks.find(n => n.id === id))
            .filter(Boolean)
            .slice(0, 5);
    }, [recentNotebooks, notebooks]);

    return (
        <motion.div
            animate={{ width: isCollapsed ? 80 : 256 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="h-full bg-sidebar border-r dark:border-sidebar-border flex flex-col relative shadow-[1px_0_0_0_rgba(0,0,0,0.05)] dark:shadow-none"
        >
            {/* Collapse Toggle Button */}
            <button
                onClick={toggleCollapse}
                className="absolute -right-3 top-10 w-6 h-6 bg-accent border dark:border-border/40 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-900 dark:hover:text-white shadow-[0_2px_4px_rgba(0,0,0,0.1)] z-50 transition-colors"
                title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
                {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
            </button>

            {/* Inner Content Wrapper with overflow-hidden */}
            <div className="w-full h-full overflow-hidden flex flex-col">
                <div className={cn("flex flex-col h-full px-4 py-8 gap-8 transition-all", isCollapsed && "px-3")}>
                    <div className={cn("flex items-center gap-3 px-3 mb-2", isCollapsed && "px-1 justify-center")}>
                        <div
                            className="min-w-8 w-8 h-8 bg-black dark:bg-white rounded-xl flex items-center justify-center text-white dark:text-black font-bold text-sm shadow-lg shadow-black/20 cursor-pointer hover:scale-105 transition-transform shrink-0"
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
                        {!isCollapsed && (
                            <span className="font-bold text-gray-900 dark:text-white text-lg tracking-tight truncate">Notebook</span>
                        )}
                    </div>

                    <Button
                        onClick={handleCreate}
                        className={cn(
                            "w-full bg-black dark:bg-white hover:bg-black/90 dark:hover:bg-white/90 text-white dark:text-black shadow-xl shadow-black/10 flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] rounded-2xl",
                            isCollapsed ? "py-6 px-0 justify-center" : "py-6 px-4"
                        )}
                    >
                        <Plus className="h-5 w-5 shrink-0" />
                        {!isCollapsed && <span className="font-semibold truncate">New Entry</span>}
                    </Button>

                    <div className="flex flex-col gap-4 flex-1 overflow-hidden">
                        <nav className="flex flex-col gap-1.5">
                            {!isCollapsed && (
                                <p className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Navigation</p>
                            )}
                            {navItems.map((item) => (
                                <Button
                                    key={item.label}
                                    variant="ghost"
                                    onClick={() => handleNavClick(item)}
                                    className={cn(
                                        "w-full flex items-center rounded-xl py-5 font-medium transition-all text-sm",
                                        isCollapsed ? "justify-center px-0" : "justify-start gap-3 px-3",
                                        currentFilter === item.filter
                                            ? "bg-foreground text-background shadow-lg shadow-black/10"
                                            : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                                    )}
                                    title={isCollapsed ? item.label : undefined}
                                >
                                    <item.icon className={cn("h-4.5 w-4.5 min-w-[1.125rem]", currentFilter === item.filter ? "text-white dark:text-black" : "text-gray-400")} />
                                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                                </Button>
                            ))}
                        </nav>

                        {/* Recent Notebooks */}
                        {recentItems.length > 0 && (
                            <div className="mt-2">
                                {!isCollapsed ? (
                                    <p className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                                        <Clock className="w-3 h-3" />
                                        Recent
                                    </p>
                                ) : (
                                    <div className="h-px bg-gray-100 dark:bg-sidebar-border/50 my-4 mx-2" />
                                )}
                                <div className="flex flex-col gap-0.5">
                                    {recentItems.map((nb) => nb && (
                                        <Link
                                            key={nb.id}
                                            href={`/notebooks/${nb.id}`}
                                            onClick={() => addToRecent(nb.id)}
                                            className={cn(
                                                "py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-sidebar-accent rounded-lg transition-colors truncate flex items-center",
                                                isCollapsed ? "justify-center px-0" : "px-3"
                                            )}
                                            title={isCollapsed ? nb.title : undefined}
                                        >
                                            {isCollapsed ? (
                                                <FileText className="w-4.5 h-4.5" />
                                            ) : (
                                                nb.title
                                            )}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Quick Switcher Hint */}
                        {!isCollapsed && (
                            <div className="mt-auto px-3 py-2">
                                <div className="flex items-center gap-2 text-xs text-gray-400">
                                    <Command className="w-3 h-3" />
                                    <span>Press <kbd className="px-1 bg-gray-100 dark:bg-muted/30 rounded text-[10px]">⌘P</kbd> to quick switch</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Theme Toggle at bottom */}
                    <div className={cn("border-t dark:border-sidebar-border pt-4 px-4 flex flex-col gap-2 transition-all", isCollapsed && "px-3 items-center pb-4")}>
                        {!isCollapsed && (
                            <p className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Preferences</p>
                        )}
                        <ThemeToggle isCollapsed={isCollapsed} />
                    </div>
                </div>
            </div>
        </motion.div>
    );
});

Sidebar.displayName = "Sidebar";
