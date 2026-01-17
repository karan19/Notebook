"use client";

import { Sidebar } from "@/components/dashboard/Sidebar";
import { useNotebookStore } from "@/lib/store";
import { formatDistanceToNow } from "date-fns";
import { FileText, MoreVertical, Trash2, ExternalLink, Search, Clock, Grid, List as ListIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Dashboard() {
  const { notebooks, deleteNotebook, fetchNotebooks, addNotebook, loading } = useNotebookStore();
  const [search, setSearch] = useState("");
  const router = useRouter();

  useEffect(() => {
    fetchNotebooks();
  }, [fetchNotebooks]);

  const handleCreateFirst = async () => {
    const id = await addNotebook();
    router.push(`/notebooks/${id}`);
  };

  const filteredNotebooks = notebooks.filter(nb =>
    nb.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-[#FDFDFD]">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Modern Navbar */}
        <header className="h-20 border-b border-gray-100 flex items-center px-10 justify-between bg-white/80 backdrop-blur-md sticky top-0 z-10 w-full">
          <div className="flex items-center gap-6 flex-1 max-w-2xl">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight shrink-0">Your Notes</h1>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search notebooks..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-gray-50 border-transparent focus:bg-white focus:border-gray-200 transition-all rounded-xl h-10 shadow-none focus-visible:ring-0"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="rounded-xl text-gray-500 hover:bg-gray-100">
              <Clock className="h-5 w-5" />
            </Button>
            <div className="flex bg-gray-100 p-1 rounded-xl">
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg bg-white shadow-sm text-black">
                <Grid className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-gray-400">
                <ListIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-10">
          {filteredNotebooks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-6 text-center">
              <div className="w-24 h-24 bg-gray-50 rounded-[2.5rem] flex items-center justify-center border border-gray-100 shadow-inner">
                <FileText className="h-10 w-10 text-gray-300" />
              </div>
              <div className="space-y-1">
                <p className="text-xl font-semibold text-gray-900">No entries found</p>
                <p className="text-gray-500">Start documenting your thoughts today.</p>
              </div>
              <Button onClick={handleCreateFirst} className="bg-black hover:bg-black/90 text-white px-8 rounded-2xl py-6 h-auto">
                Create First Note
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {filteredNotebooks.map((notebook) => (
                <div
                  key={notebook.id}
                  className="group relative flex flex-col bg-white border border-gray-100 rounded-2xl p-6 transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:border-gray-200 active:scale-[0.99]"
                >
                  <Link href={`/notebooks/${notebook.id}`} className="flex-1 flex flex-col gap-4">
                    <div className="flex items-start justify-between">
                      <div className="p-3 bg-gray-50 rounded-xl group-hover:bg-black group-hover:text-white transition-all duration-300">
                        <FileText className="h-6 w-6" />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <h3 className="font-bold text-gray-900 text-lg group-hover:text-black transition-colors truncate">
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
