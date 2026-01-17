"use client";

import { Sidebar } from "@/components/dashboard/Sidebar";
import { useNotebookStore } from "@/lib/store";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { FileText, MoreVertical, Trash2, ExternalLink, Search, Star, UserCircle, LogOut } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthenticator } from '@aws-amplify/ui-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Dashboard() {
  const { notebooks, deleteNotebook, fetchNotebooks, addNotebook, loading, searchQuery, setSearchQuery, currentFilter, toggleFavorite } = useNotebookStore();
  const { user, signOut } = useAuthenticator();
  const router = useRouter();

  useEffect(() => {
    fetchNotebooks();
  }, [fetchNotebooks]);

  const handleCreateFirst = async () => {
    const id = await addNotebook();
    router.push(`/notebooks/${id}`);
  };

  const filteredNotebooks = notebooks.filter(nb => {
    const matchesSearch = nb.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (nb.snippet && nb.snippet.toLowerCase().includes(searchQuery.toLowerCase()));

    if (currentFilter === 'favorites') return matchesSearch && nb.isFavorite;
    if (currentFilter === 'trash') return false; // Not implemented yet
    return matchesSearch;
  });

  return (
    <div className="flex h-screen bg-[#FDFDFD]">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Modern Navbar */}
        <header className="h-20 border-b border-gray-100 flex items-center px-10 bg-white/80 backdrop-blur-md sticky top-0 z-10 w-full relative">
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-xl px-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search notebooks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-gray-50 border-transparent focus:bg-white focus:border-gray-200 transition-all rounded-xl h-10 shadow-none focus-visible:ring-0"
              />
            </div>
          </div>

          <div className="flex items-center gap-4 ml-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 p-0 overflow-hidden hover:bg-gray-100 transition-all ring-offset-2 focus-visible:ring-2 focus-visible:ring-gray-200">
                  <UserCircle className="h-6 w-6 text-gray-500" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 rounded-2xl mt-2 p-2 shadow-2xl border-gray-100 animate-in fade-in zoom-in-95 duration-200">
                <div className="px-3 py-4 mb-2 border-b border-gray-50 select-none">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 leading-none">Account</p>
                  <p className="text-sm font-semibold text-gray-900 truncate leading-none pt-1">{user?.signInDetails?.loginId || user?.username || 'User'}</p>
                </div>
                <DropdownMenuItem
                  onClick={signOut}
                  className="flex items-center gap-3 text-red-500 focus:text-red-700 focus:bg-red-50 rounded-xl py-3 px-3 cursor-pointer transition-colors group"
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
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 tracking-tight capitalize">
              {currentFilter === 'all' ? 'Your Library' : `${currentFilter}`}
            </h2>
            <p className="text-gray-400 text-sm font-medium mt-1">
              {searchQuery ? `Found ${filteredNotebooks.length} matches for "${searchQuery}"` : `You have ${filteredNotebooks.length} notebooks in this view.`}
            </p>
          </div>

          {filteredNotebooks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl border-2 border-dashed border-gray-100">
              <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4">
                <Search className="h-8 w-8 text-gray-300" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                {currentFilter === 'favorites' ? 'No favorites yet' : 'No entries found'}
              </h3>
              <p className="text-gray-400 text-sm max-w-xs text-center mt-2 font-medium leading-relaxed">
                {currentFilter === 'favorites' ? 'Star a notebook to see it here for quick access.' : 'Start documenting your thoughts today.'}
              </p>
              {currentFilter === 'all' && !searchQuery && (
                <Button onClick={handleCreateFirst} className="mt-8 bg-black hover:bg-black/90 text-white rounded-xl px-8 h-12">
                  Create First Notebook
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {filteredNotebooks.map((notebook) => (
                <div
                  key={notebook.id}
                  className="group relative flex flex-col bg-white border border-gray-100 rounded-2xl p-6 transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:border-gray-200 active:scale-[0.99]"
                >
                  <div className="absolute top-4 right-4 z-10 flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFavorite(notebook.id); }}
                      className={cn(
                        "h-8 w-8 rounded-lg transition-all",
                        notebook.isFavorite ? "text-yellow-400 bg-yellow-50" : "text-gray-300 hover:text-gray-900 hover:bg-gray-50"
                      )}
                    >
                      <Star className={cn("h-4 w-4", notebook.isFavorite && "fill-current")} />
                    </Button>
                  </div>

                  <Link href={`/notebooks/${notebook.id}`} className="flex-1 flex flex-col gap-4">
                    <div className="flex items-start justify-between">
                      <div className="p-3 bg-gray-50 rounded-xl group-hover:bg-black group-hover:text-white transition-all duration-300">
                        <FileText className="h-6 w-6" />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <h3 className="font-bold text-gray-900 text-lg group-hover:text-black transition-colors truncate pr-8">
                        {notebook.title}
                      </h3>
                      <div className="flex items-center gap-2 text-xs font-medium text-gray-400">
                        <span>Edited {formatDistanceToNow(notebook.lastEditedAt)} ago</span>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="px-2 py-1 bg-gray-50 text-[10px] font-bold text-gray-500 rounded-md uppercase tracking-wider group-hover:bg-gray-100 transition-colors">Notebook</span>
                    </div>
                  </Link>

                  <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-gray-100 transition-colors">
                          <MoreVertical className="h-4 w-4 text-gray-400" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-xl border-gray-100 shadow-xl p-1 w-40">
                        <Link href={`/notebooks/${notebook.id}`}>
                          <DropdownMenuItem className="gap-3 py-2.5 rounded-lg cursor-pointer font-medium">
                            <ExternalLink className="h-4 w-4" /> Open
                          </DropdownMenuItem>
                        </Link>
                        <DropdownMenuItem
                          className="gap-3 py-2.5 rounded-lg cursor-pointer text-destructive focus:text-destructive font-medium"
                          onClick={() => deleteNotebook(notebook.id)}
                        >
                          <Trash2 className="h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
