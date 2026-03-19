"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { motion, AnimatePresence } from "motion/react"
import { Search, FileText, Star, Clock, Plus, Moon, Sun, Keyboard, Command as CommandIcon, LogOut, Settings } from "lucide-react"
import { useRouter } from "next/navigation"
import { useNotebookStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { useTheme } from "next-themes"
import { useAuthenticator } from "@aws-amplify/ui-react"

interface QuickSwitcherProps {
    isOpen: boolean
    onClose: () => void
}

export function QuickSwitcher({ isOpen, onClose }: QuickSwitcherProps) {
    const [query, setQuery] = useState("")
    const [selectedIndex, setSelectedIndex] = useState(0)
    const inputRef = useRef<HTMLInputElement>(null)
    const router = useRouter()
    const { theme, setTheme } = useTheme()
    const { signOut } = useAuthenticator()

    const { notebooks, recentNotebooks, addToRecent, addNotebook } = useNotebookStore()

    // Global Actions
    const actions = useMemo(() => [
        { id: 'action-create', title: 'Create New Notebook', icon: <Plus className="w-4 h-4" />, shortcut: '⌘N', action: async () => { const id = await addNotebook(); router.push(`/notebooks/${id}`); onClose(); } },
        { id: 'action-theme', title: `Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`, icon: theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />, action: () => setTheme(theme === 'dark' ? 'light' : 'dark') },
        { id: 'action-settings', title: 'Settings', icon: <Settings className="w-4 h-4" />, action: () => { } },
        { id: 'action-signout', title: 'Sign Out', icon: <LogOut className="w-4 h-4 text-red-500" />, action: signOut },
    ], [theme, addNotebook, router, onClose, setTheme, signOut])

    const filteredItems = useMemo(() => {
        const lowerQuery = query.toLowerCase().trim()
        
        // 1. Filtered Actions
        const filteredActions = actions.filter(a => a.title.toLowerCase().includes(lowerQuery))
        
        // 2. Filtered Notebooks
        const filteredNotebooks = notebooks.filter(n => 
            n.title.toLowerCase().includes(lowerQuery) || 
            n.tags?.some(t => t.toLowerCase().includes(lowerQuery))
        )

        // If no query, prioritize recent
        if (!lowerQuery) {
            const recent = recentNotebooks
                .map(id => notebooks.find(n => n.id === id))
                .filter(Boolean) as any[]
            const others = notebooks.filter(n => !recentNotebooks.includes(n.id))
            return [
                ...actions.slice(0, 2).map(a => ({ ...a, type: 'action' })),
                ...recent.map(n => ({ ...n, type: 'notebook', isRecent: true })),
                ...others.map(n => ({ ...n, type: 'notebook' }))
            ].filter(item => item !== undefined).slice(0, 15)
        }

        return [
            ...filteredActions.map(a => ({ ...a, type: 'action' })),
            ...filteredNotebooks.map(n => ({ ...n, type: 'notebook' }))
        ].slice(0, 15)
    }, [query, notebooks, recentNotebooks, actions])

    // Focus input when opened
    useEffect(() => {
        if (isOpen) {
            setQuery("")
            setSelectedIndex(0)
            setTimeout(() => inputRef.current?.focus(), 50)
        }
    }, [isOpen])

    // Keyboard navigation
    useEffect(() => {
        if (!isOpen) return

        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.key) {
                case "ArrowDown":
                    e.preventDefault()
                    setSelectedIndex(i => Math.min(i + 1, filteredItems.length - 1))
                    break
                case "ArrowUp":
                    e.preventDefault()
                    setSelectedIndex(i => Math.max(i - 1, 0))
                    break
                case "Enter":
                    e.preventDefault()
                    const selected = filteredItems[selectedIndex]
                    if (selected) {
                        if (selected.type === 'action') {
                            selected.action()
                            if (selected.id !== 'action-theme') onClose()
                        } else {
                            addToRecent(selected.id)
                            router.push(`/notebooks/${selected.id}`)
                            onClose()
                        }
                    }
                    break
                case "Escape":
                    onClose()
                    break
            }
        }
 
        window.addEventListener("keydown", handleKeyDown)
        return () => window.removeEventListener("keydown", handleKeyDown)
    }, [isOpen, selectedIndex, filteredItems, router, onClose, addToRecent])

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200]"
                        onClick={onClose}
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.98, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98, y: -10 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="fixed top-[15%] left-1/2 -translate-x-1/2 w-full max-w-2xl z-[201] px-4"
                    >
                        <div className="bg-card/80 backdrop-blur-2xl rounded-2xl shadow-[0_0_80px_rgba(0,0,0,0.1)] dark:shadow-[0_0_80px_rgba(0,0,0,0.5)] border border-border/40 overflow-hidden">
                            {/* Search Input */}
                            <div className="flex items-center gap-4 px-6 py-5 border-b border-gray-100/50 dark:border-border/30">
                                <Search className="w-6 h-6 text-gray-400" />
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={query}
                                    onChange={(e) => {
                                        setQuery(e.target.value)
                                        setSelectedIndex(0)
                                    }}
                                    placeholder="Type a command or search..."
                                    className="flex-1 bg-transparent outline-none text-lg text-gray-900 dark:text-white placeholder:text-gray-400 font-medium"
                                />
                                <div className="flex items-center gap-1.5">
                                     <kbd className="px-2 py-1 text-[10px] font-bold text-muted-foreground/60 bg-muted/50 border border-border/30 rounded-md uppercase tracking-wider">
                                        esc
                                    </kbd>
                                </div>
                            </div>
 
                            {/* Results */}
                            <div className="max-h-[450px] overflow-y-auto py-3 px-2 custom-scrollbar">
                                {filteredItems.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-4">
                                        <div className="p-4 bg-gray-50 dark:bg-muted/50 rounded-full">
                                            <Search className="w-8 h-8 opacity-20" />
                                        </div>
                                        <p className="text-sm font-medium">No results found for "{query}"</p>
                                    </div>
                                ) : (
                                    filteredItems.map((item: any, index: number) => (
                                        <button
                                            key={item.id}
                                            onClick={() => {
                                                if (item.type === 'action') {
                                                    item.action()
                                                    if (item.id !== 'action-theme') onClose()
                                                } else {
                                                    addToRecent(item.id)
                                                    router.push(`/notebooks/${item.id}`)
                                                    onClose()
                                                }
                                            }}
                                            className={cn(
                                                "w-full flex items-center gap-4 px-4 py-3 text-left transition-all rounded-xl relative group",
                                                index === selectedIndex
                                                    ? "bg-foreground text-background shadow-lg scale-[1.02] z-10"
                                                    : "hover:bg-accent/40 text-muted-foreground hover:text-foreground"
                                            )}
                                        >
                                            <div className={cn(
                                                "p-2 rounded-lg transition-colors",
                                                index === selectedIndex ? "bg-background/20 dark:bg-background/10" : "bg-muted/50"
                                            )}>
                                                {item.type === 'action' ? item.icon : (
                                                    item.isRecent ? <Clock className="w-4 h-4" /> : <FileText className="w-4 h-4" />
                                                )}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-bold truncate">
                                                        {item.title}
                                                    </span>
                                                    {item.shortcut && (
                                                        <kbd className={cn(
                                                            "text-[10px] font-mono px-1.5 py-0.5 rounded",
                                                            index === selectedIndex ? "bg-background/20 text-background" : "bg-muted/50 text-muted-foreground"
                                                        )}>
                                                            {item.shortcut}
                                                        </kbd>
                                                    )}
                                                </div>
                                                {item.type === 'notebook' && (
                                                     <div className={cn(
                                                        "text-[10px] font-medium uppercase tracking-widest mt-0.5",
                                                        index === selectedIndex ? "text-white/60" : "text-gray-400"
                                                     )}>
                                                        {item.isRecent ? 'Recently Viewed' : (item.tags?.join(", ") || 'Notebook')}
                                                     </div>
                                                )}
                                            </div>

                                            {item.type === 'notebook' && item.isFavorite && (
                                                <Star className={cn("w-4 h-4 fill-current", index === selectedIndex ? "text-white" : "text-yellow-400")} />
                                            )}
                                        </button>
                                    ))
                                )}
                            </div>
 
                            {/* Footer Hint */}
                            <div className="px-6 py-3 bg-gray-50/50 dark:bg-muted/20 border-t border-gray-100/50 dark:border-border/30 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-gray-400">
                                <div className="flex items-center gap-6">
                                    <span className="flex items-center gap-1.5"><Keyboard className="w-3 h-3" /> navigate</span>
                                    <span className="flex items-center gap-1.5"><CommandIcon className="w-3 h-3" /> enter to open</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="opacity-50 font-medium lowercase italic">Powered by Atmosphere</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
