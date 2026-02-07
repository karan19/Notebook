"use client";

import { Sidebar } from "@/components/dashboard/Sidebar";
import { useNotebookStore } from "@/lib/store";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { FileText, MoreVertical, Trash2, ExternalLink, Search, Star, UserCircle, LogOut, Command, ArrowUpDown, ChevronDown, SortAsc, SortDesc } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuthenticator } from '@aws-amplify/ui-react';
import { motion, AnimatePresence } from "motion/react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/sonner";
import { QuickSwitcher } from "@/components/ui/quick-switcher";
import { useConfetti } from "@/components/ui/confetti";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

// Notebook Card Skeleton for loading state
function NotebookCardSkeleton() {
  return (
    <div className="flex flex-col bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-6 gap-4">
      <div className="flex items-start justify-between">
        <Skeleton className="h-12 w-12 rounded-xl" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <Skeleton className="h-5 w-20 rounded-md" />
    </div>
  );
}

export default function Dashboard() {
  const { notebooks, deleteNotebook, fetchNotebooks, addNotebook, loading, searchQuery, setSearchQuery, currentFilter, toggleFavorite, sortBy, sortOrder, setSort, addToRecent } = useNotebookStore();
  const { user, signOut } = useAuthenticator();
  const router = useRouter();
  const [searchFocused, setSearchFocused] = useState(false);
  const [isQuickSwitcherOpen, setIsQuickSwitcherOpen] = useState(false);

  useEffect(() => {
    fetchNotebooks();
  }, [fetchNotebooks]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ⌘+N or Ctrl+N: Create new notebook
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        handleCreateFirst();
      }
      // ⌘+K or Ctrl+K: Focus search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
        searchInput?.focus();
      }
      // ⌘+P or Ctrl+P: Quick switcher
      if ((e.metaKey || e.ctrlKey) && e.key === 'p') {
        e.preventDefault();
        setIsQuickSwitcherOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const { fire: fireConfetti } = useConfetti();

  const handleCreateFirst = async () => {
    try {
      const id = await addNotebook();
      fireConfetti({ particleCount: 60 });
      toast.success("Notebook created!", { description: "Start writing your thoughts..." });
      router.push(`/notebooks/${id}`);
    } catch (e) {
      toast.error("Failed to create notebook", { description: "Please try again." });
    }
  };

  const handleDelete = async (notebookId: string, notebookTitle: string) => {
    try {
      await deleteNotebook(notebookId);
      toast.success("Notebook deleted", { description: `"${notebookTitle}" has been removed.` });
    } catch (e) {
      toast.error("Failed to delete notebook");
    }
  };

  const handleToggleFavorite = async (notebookId: string, isFavorite: boolean) => {
    await toggleFavorite(notebookId);
    toast.success(isFavorite ? "Removed from favorites" : "Added to favorites");
  };

  const filteredNotebooks = useMemo(() => {
    let result = notebooks.filter(nb => {
      const matchesSearch = nb.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (nb.snippet && nb.snippet.toLowerCase().includes(searchQuery.toLowerCase()));

      if (currentFilter === 'favorites') return matchesSearch && nb.isFavorite;
      if (currentFilter === 'trash') return false;
      return matchesSearch;
    });

    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'date':
          comparison = (b.lastEditedAt || 0) - (a.lastEditedAt || 0);
          break;
        case 'name':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'favorites':
          comparison = (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0);
          break;
      }
      return sortOrder === 'asc' ? -comparison : comparison;
    });

    return result;
  }, [notebooks, searchQuery, currentFilter, sortBy, sortOrder]);

  return (
    <div className="flex h-screen bg-[#FDFDFD] dark:bg-gray-950">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Modern Navbar */}
        <header className="h-20 border-b border-gray-100 dark:border-gray-800 flex items-center px-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md sticky top-0 z-10 w-full relative">
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-xl px-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search notebooks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                className="pl-10 pr-16 bg-gray-50 dark:bg-gray-800 border-transparent focus:bg-white dark:focus:bg-gray-700 focus:border-gray-200 dark:focus:border-gray-600 transition-all rounded-xl h-10 shadow-none focus-visible:ring-0 dark:text-white dark:placeholder:text-gray-500"
              />
              {/* Keyboard shortcut hint */}
              <div className={cn(
                "absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs text-gray-400 transition-opacity",
                searchFocused ? "opacity-0" : "opacity-100"
              )}>
                <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-[10px] font-mono">⌘K</kbd>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 ml-auto">
            {/* Sort Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
                  <ArrowUpDown className="h-4 w-4" />
                  <span className="hidden sm:inline">Sort</span>
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 rounded-xl dark:bg-gray-900 dark:border-gray-800">
                <DropdownMenuItem
                  onClick={() => setSort('date', sortOrder === 'desc' && sortBy === 'date' ? 'asc' : 'desc')}
                  className={cn("gap-3 cursor-pointer dark:text-gray-200", sortBy === 'date' && "font-medium")}
                >
                  {sortBy === 'date' && (sortOrder === 'desc' ? <SortDesc className="h-4 w-4" /> : <SortAsc className="h-4 w-4" />)}
                  {sortBy !== 'date' && <span className="w-4" />}
                  Date Modified
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setSort('name', sortOrder === 'asc' && sortBy === 'name' ? 'desc' : 'asc')}
                  className={cn("gap-3 cursor-pointer dark:text-gray-200", sortBy === 'name' && "font-medium")}
                >
                  {sortBy === 'name' && (sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />)}
                  {sortBy !== 'name' && <span className="w-4" />}
                  Name
                </DropdownMenuItem>
                <DropdownMenuSeparator className="dark:bg-gray-800" />
                <DropdownMenuItem
                  onClick={() => setSort('favorites', 'desc')}
                  className={cn("gap-3 cursor-pointer dark:text-gray-200", sortBy === 'favorites' && "font-medium")}
                >
                  <Star className={cn("h-4 w-4", sortBy === 'favorites' && "text-amber-400 fill-current")} />
                  Favorites First
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* User Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 p-0 overflow-hidden hover:bg-gray-100 dark:hover:bg-gray-800 transition-all ring-offset-2 focus-visible:ring-2 focus-visible:ring-gray-200">
                  <UserCircle className="h-6 w-6 text-gray-500 dark:text-gray-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 rounded-2xl mt-2 p-2 shadow-2xl border-gray-100 dark:border-gray-800 dark:bg-gray-900 animate-in fade-in zoom-in-95 duration-200">
                <div className="px-3 py-4 mb-2 border-b border-gray-50 dark:border-gray-800 select-none">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 leading-none">Account</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate leading-none pt-1">{user?.signInDetails?.loginId || user?.username || 'User'}</p>
                </div>
                <DropdownMenuItem
                  onClick={signOut}
                  className="flex items-center gap-3 text-red-500 focus:text-red-700 focus:bg-red-50 dark:focus:bg-red-950 rounded-xl py-3 px-3 cursor-pointer transition-colors group"
                >
                  <LogOut className="h-4.5 w-4.5 group-hover:translate-x-0.5 transition-transform" />
                  <span className="font-semibold text-sm">Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-10">

          {loading ? (
            // Skeleton Loading State
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {[...Array(8)].map((_, i) => (
                <NotebookCardSkeleton key={i} />
              ))}
            </div>
          ) : filteredNotebooks.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center justify-center py-24 bg-white dark:bg-gray-900 rounded-3xl border-2 border-dashed border-gray-100 dark:border-gray-800"
            >
              {/* Custom Illustration */}
              <div className="relative w-32 h-32 mb-6">
                <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-3xl rotate-6" />
                <div className="absolute inset-0 bg-white dark:bg-gray-800 rounded-3xl shadow-lg flex items-center justify-center">
                  <FileText className="h-12 w-12 text-gray-300 dark:text-gray-600" />
                </div>
                {currentFilter === 'favorites' && (
                  <div className="absolute -top-2 -right-2 w-10 h-10 bg-yellow-50 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
                    <Star className="h-5 w-5 text-yellow-400" />
                  </div>
                )}
              </div>

              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {currentFilter === 'favorites' ? 'No favorites yet' : 'No notebooks found'}
              </h3>
              <p className="text-gray-400 dark:text-gray-500 text-sm max-w-xs text-center mt-2 font-medium leading-relaxed">
                {currentFilter === 'favorites'
                  ? 'Star a notebook to save it here for quick access.'
                  : searchQuery
                    ? `No results for "${searchQuery}". Try a different search.`
                    : 'Start documenting your thoughts, ideas, and memories.'}
              </p>
              {currentFilter === 'all' && !searchQuery && (
                <Button
                  onClick={handleCreateFirst}
                  className="mt-8 bg-black dark:bg-white hover:bg-black/90 dark:hover:bg-white/90 text-white dark:text-black rounded-xl px-8 h-12 shadow-lg shadow-black/10 group"
                >
                  <span className="mr-2">Create Your First Notebook</span>
                  <kbd className="ml-2 px-1.5 py-0.5 bg-white/20 dark:bg-black/20 rounded text-xs font-mono opacity-60 group-hover:opacity-100 transition-opacity">⌘N</kbd>
                </Button>
              )}
            </motion.div>
          ) : (
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
            >
              {filteredNotebooks.map((notebook, index) => (
                <motion.div
                  key={notebook.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.4,
                    delay: index * 0.05, // Faster stagger
                    type: "spring",
                    stiffness: 300,
                    damping: 24
                  }}
                  whileHover={{ scale: 1.02, y: -4 }}
                  className="group relative flex flex-col bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-6 transition-all hover:shadow-[0_20px_50px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_20px_50px_rgba(0,0,0,0.3)] hover:border-gray-200 dark:hover:border-gray-600"
                >
                  <div className="absolute top-4 right-4 z-10 flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleToggleFavorite(notebook.id, notebook.isFavorite || false); }}
                      className={cn(
                        "h-8 w-8 rounded-lg transition-all",
                        notebook.isFavorite ? "text-yellow-400 bg-yellow-50 dark:bg-yellow-900/30" : "text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700"
                      )}
                    >
                      <Star className={cn("h-4 w-4", notebook.isFavorite && "fill-current")} />
                    </Button>
                  </div>

                  <Link href={`/notebooks/${notebook.id}`} className="flex-1 flex flex-col gap-4">
                    <div className="flex items-start justify-between">
                      <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-xl group-hover:bg-black dark:group-hover:bg-white group-hover:text-white dark:group-hover:text-black transition-all duration-300">
                        <FileText className="h-6 w-6" />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <h3 className="font-bold text-gray-900 dark:text-white text-lg group-hover:text-black dark:group-hover:text-white transition-colors truncate pr-8">
                        {notebook.title}
                      </h3>
                      <div className="flex items-center gap-2 text-xs font-medium text-gray-400 dark:text-gray-500">
                        <span>Edited {formatDistanceToNow(notebook.lastEditedAt)} ago</span>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="px-2 py-1 bg-gray-50 dark:bg-gray-700 text-[10px] font-bold text-gray-500 dark:text-gray-400 rounded-md uppercase tracking-wider group-hover:bg-gray-100 dark:group-hover:bg-gray-600 transition-colors">Notebook</span>
                      {notebook.pages && notebook.pages.length > 1 && (
                        <span className="px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-[10px] font-bold text-blue-500 rounded-md uppercase tracking-wider">{notebook.pages.length} pages</span>
                      )}
                    </div>
                  </Link>

                  <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                          <MoreVertical className="h-4 w-4 text-gray-400" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-xl border-gray-100 dark:border-gray-700 dark:bg-gray-800 shadow-xl p-1 w-40">
                        <Link href={`/notebooks/${notebook.id}`}>
                          <DropdownMenuItem className="gap-3 py-2.5 rounded-lg cursor-pointer font-medium dark:text-gray-200 dark:hover:bg-gray-700">
                            <ExternalLink className="h-4 w-4" /> Open
                          </DropdownMenuItem>
                        </Link>
                        <DropdownMenuItem
                          className="gap-3 py-2.5 rounded-lg cursor-pointer text-destructive focus:text-destructive font-medium"
                          onClick={() => handleDelete(notebook.id, notebook.title)}
                        >
                          <Trash2 className="h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </main>

      {/* Quick Switcher Modal */}
      <QuickSwitcher
        isOpen={isQuickSwitcherOpen}
        onClose={() => setIsQuickSwitcherOpen(false)}
      />
    </div>
  );
}
