"use client";

import { Sidebar } from "@/components/dashboard/Sidebar";
import { useNotebookStore } from "@/lib/store";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { FileText, MoreVertical, Trash2, ExternalLink, Search, Star, UserCircle, LogOut, Command, ArrowUpDown, ChevronDown, SortAsc, SortDesc, Pin, Copy, RotateCw } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEffect, useState, useCallback, useMemo, memo, useRef } from "react";
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

interface NotebookCardProps {
  notebook: any;
  index: number;
  onDelete: (id: string, title: string) => void;
  onToggleFavorite: (id: string, isFavorite: boolean) => void;
  onTogglePin: (id: string, isPinned: boolean) => void;
  onDuplicate: (id: string, title: string) => void;
  onAddToRecent: (id: string) => void;
}

const NotebookCard = memo(({ notebook, index, onDelete, onToggleFavorite, onTogglePin, onDuplicate, onAddToRecent }: NotebookCardProps) => {
    const router = useRouter();

    const handleNavigate = () => {
        onAddToRecent(notebook.id);
        router.push(`/notebooks/${notebook.id}`);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
                duration: 0.3,
                delay: index * 0.03,
                ease: "easeOut"
            }}
            onClick={handleNavigate}
            className="relative flex flex-col h-full bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-4 transition-all group cursor-pointer card-hover"
        >
            <div className="absolute top-4 right-4 z-10 flex items-center gap-1">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onTogglePin(notebook.id, notebook.isPinned || false); }}
                    className={cn(
                        "h-8 w-8 rounded-lg transition-all",
                        notebook.isPinned ? "text-blue-500 bg-blue-50 dark:bg-blue-900/10" : "text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-gray-700"
                    )}
                >
                    <Pin className={cn("h-4 w-4", notebook.isPinned && "fill-current")} />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleFavorite(notebook.id, notebook.isFavorite || false); }}
                    className={cn(
                        "h-8 w-8 rounded-lg transition-all",
                        notebook.isFavorite ? "text-yellow-400 bg-yellow-50 dark:bg-yellow-900/10" : "text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-gray-700"
                    )}
                >
                    <Star className={cn("h-4 w-4", notebook.isFavorite && "fill-current")} />
                </Button>
            </div>

            <div className="flex-1 flex flex-col gap-2">
                <div className="flex items-start justify-between">
                    <div className="p-2 bg-muted/50 rounded-xl group-hover:bg-foreground group-hover:text-background dark:group-hover:bg-foreground dark:group-hover:text-background transition-all duration-500">
                        <FileText className="h-5 w-5" />
                    </div>
                </div>

                <div className="space-y-0.5">
                    <h3 className="font-bold text-gray-900 dark:text-white text-base group-hover:text-black dark:group-hover:text-white transition-colors truncate pr-8">
                        {notebook.title}
                    </h3>
                    <div className="flex items-center gap-2 text-[10px] font-medium text-gray-400 dark:text-gray-500">
                        <span>Edited {formatDistanceToNow(notebook.lastEditedAt)} ago</span>
                    </div>
                </div>

                <div className="mt-2 flex flex-wrap gap-2">
                    {notebook.pages && (
                        <span className="px-2 py-0.5 bg-muted/50 text-[10px] font-bold text-muted-foreground rounded-md uppercase tracking-wider">
                            {notebook.pages.length} {notebook.pages.length === 1 ? 'page' : 'pages'}
                        </span>
                    )}
                </div>
            </div>

            <div className="mt-auto pt-2 flex justify-end opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                            className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-accent transition-all border border-transparent hover:border-gray-100 dark:hover:border-border/30"
                        >
                            <MoreVertical className="h-4 w-4 text-gray-400" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-xl border-gray-100 dark:border-border dark:bg-card glass shadow-2xl p-1 w-40">
                        <DropdownMenuItem
                            className="gap-3 py-2.5 rounded-lg cursor-pointer font-medium dark:text-gray-200 dark:hover:bg-gray-800"
                        >
                            <ExternalLink className="h-4 w-4" /> Open
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            className="gap-3 py-2.5 rounded-lg cursor-pointer font-medium dark:text-gray-200 dark:hover:bg-gray-800"
                            onClick={(e) => { e.stopPropagation(); onTogglePin(notebook.id, notebook.isPinned || false); }}
                        >
                            <Pin className="h-4 w-4" /> {notebook.isPinned ? 'Unpin' : 'Pin to Top'}
                        </DropdownMenuItem>

                        <DropdownMenuItem
                            className="gap-3 py-2.5 rounded-lg cursor-pointer font-medium dark:text-gray-200 dark:hover:bg-gray-800"
                            onClick={(e) => { e.stopPropagation(); onDuplicate(notebook.id, notebook.title); }}
                        >
                            <Copy className="h-4 w-4" /> Duplicate
                        </DropdownMenuItem>

                        <DropdownMenuSeparator className="dark:bg-gray-800" />

                        <DropdownMenuItem
                            className="gap-3 py-2.5 rounded-lg cursor-pointer text-destructive focus:text-destructive font-medium"
                            onClick={(e) => { e.stopPropagation(); e.preventDefault(); onDelete(notebook.id, notebook.title); }}
                        >
                            <Trash2 className="h-4 w-4" /> Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </motion.div>
    );
});

NotebookCard.displayName = 'NotebookCard';

export default function Dashboard() {
  const { notebooks, deleteNotebook, fetchNotebooks, addNotebook, loading, searchQuery, setSearchQuery, currentFilter, toggleFavorite, togglePin, duplicateNotebook, sortBy, sortOrder, setSort, addToRecent, pendingDeletions, setPendingDeletion, deleteNotebookWithUndo, undoDeletion } = useNotebookStore();
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

  const handleCreateFirst = useCallback(async () => {
    toast.promise(
        (async () => {
            const id = await addNotebook();
            fireConfetti({ particleCount: 60 });
            router.push(`/notebooks/${id}`);
            return id;
        })(),
        {
            loading: 'Creating new notebook...',
            success: 'Notebook created',
            error: 'Failed to create notebook'
        }
    );
  }, [addNotebook, fireConfetti, router]);

  const handleDelete = useCallback((notebookId: string, notebookTitle: string) => {
    deleteNotebookWithUndo(notebookId, (msg) => console.log(msg));

    toast.success("Notebook deleted", {
      description: `"${notebookTitle}" has been removed.`,
      action: {
        label: "Undo",
        onClick: () => {
          undoDeletion(notebookId);
        }
      }
    });
  }, [deleteNotebookWithUndo, undoDeletion]);

  const handleToggleFavorite = useCallback(async (notebookId: string, isFavorite: boolean) => {
    await toggleFavorite(notebookId);
    toast.success(isFavorite ? "Removed from favorites" : "Added to favorites");
  }, [toggleFavorite]);

  const handleTogglePin = useCallback(async (notebookId: string, isPinned: boolean) => {
    await togglePin(notebookId);
    toast.success(isPinned ? "Unpinned from top" : "Pinned to top");
  }, [togglePin]);

  const handleDuplicate = useCallback(async (notebookId: string, title: string) => {
    const promise = duplicateNotebook(notebookId);
    toast.promise(promise, {
      loading: `Duplicating "${title}"...`,
      success: "Notebook duplicated successfully",
      error: "Failed to duplicate notebook"
    });
  }, [duplicateNotebook]);

  const handleAddToRecent = useCallback((id: string) => {
    addToRecent(id);
  }, [addToRecent]);

  const filteredNotebooks = useMemo(() => {
    let result = notebooks.filter(nb => {
      // Filter out pending deletions
      if (pendingDeletions.includes(nb.id)) return false;

      const matchesSearch = nb.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (nb.snippet && nb.snippet.toLowerCase().includes(searchQuery.toLowerCase()));

      if (currentFilter === 'favorites') return matchesSearch && nb.isFavorite;
      if (currentFilter === 'trash') return false;
      return matchesSearch;
    });

    // Apply sorting
    result.sort((a, b) => {
      // Always put pinned notebooks first
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;

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
  }, [notebooks, searchQuery, currentFilter, sortBy, sortOrder, pendingDeletions]);

  return (
    <div className="flex h-screen bg-transparent">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Modern Navbar */}
        <header className="h-20 border-b border-gray-100 dark:border-border/30 flex items-center px-10 glass sticky top-0 z-20 w-full relative">
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-xl px-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search notebooks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                className="pl-10 pr-16 bg-gray-50 dark:bg-muted/30 border-transparent focus:bg-white dark:focus:bg-accent/40 focus:border-gray-200 dark:focus:border-border focus-ring-premium transition-all rounded-xl h-10 shadow-none focus-visible:ring-0 dark:text-white dark:placeholder:text-muted-foreground"
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
            {loading && notebooks.length > 0 && (
              <div className="flex items-center gap-2 text-[10px] font-medium text-muted-foreground animate-pulse mr-2">
                <RotateCw className="h-3 w-3 animate-spin" />
                <span className="hidden sm:inline uppercase tracking-wider">Syncing</span>
              </div>
            )}
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
        <div className="flex-1 overflow-y-auto p-8">

          {loading && notebooks.length === 0 ? (
            // Skeleton Loading State
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <NotebookCardSkeleton key={i} />
              ))}
            </div>
          ) : filteredNotebooks.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center justify-center py-24 bg-card/40 backdrop-blur-md rounded-3xl border-2 border-dashed border-border/50"
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredNotebooks.map((notebook, index) => (
                <NotebookCard
                  key={notebook.id}
                  notebook={notebook}
                  index={index}
                  onDelete={handleDelete}
                  onToggleFavorite={handleToggleFavorite}
                  onTogglePin={handleTogglePin}
                  onDuplicate={handleDuplicate}
                  onAddToRecent={handleAddToRecent}
                />
              ))}
            </div>
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
