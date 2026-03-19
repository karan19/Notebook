"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { motion, AnimatePresence } from "motion/react"
import { Search, FileText, Star, Clock } from "lucide-react"
import { useRouter } from "next/navigation"
import { useNotebookStore } from "@/lib/store"
import { cn } from "@/lib/utils"

interface QuickSwitcherProps {
    isOpen: boolean
    onClose: () => void
}

export function QuickSwitcher({ isOpen, onClose }: QuickSwitcherProps) {
    const [query, setQuery] = useState("")
    const [selectedIndex, setSelectedIndex] = useState(0)
    const inputRef = useRef<HTMLInputElement>(null)
    const router = useRouter()

    const { notebooks, recentNotebooks, addToRecent } = useNotebookStore()

    // Filter notebooks by query
    const filteredNotebooks = useMemo(() => {
        if (!query.trim()) {
            // Show recent notebooks first, then all
            const recentItems = recentNotebooks
                .map(id => notebooks.find(n => n.id === id))
                .filter(Boolean)
            const otherItems = notebooks.filter(n => !recentNotebooks.includes(n.id))
            return [...recentItems, ...otherItems].slice(0, 10)
        }

        const lowerQuery = query.toLowerCase()
        return notebooks
            .filter(n =>
                n.title.toLowerCase().includes(lowerQuery) ||
                n.tags?.some(t => t.toLowerCase().includes(lowerQuery))
            )
            .slice(0, 10)
    }, [query, notebooks, recentNotebooks])

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
                    setSelectedIndex(i => Math.min(i + 1, filteredNotebooks.length - 1))
                    break
                case "ArrowUp":
                    e.preventDefault()
                    setSelectedIndex(i => Math.max(i - 1, 0))
                    break
                case "Enter":
                    e.preventDefault()
                    if (filteredNotebooks[selectedIndex]) {
                        const selected = filteredNotebooks[selectedIndex]
                        if (selected) {
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
    }, [isOpen, selectedIndex, filteredNotebooks, router, onClose, addToRecent])

    const isRecent = (id: string) => recentNotebooks.includes(id)

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200]"
                        onClick={onClose}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -20 }}
                        transition={{ duration: 0.15 }}
                        className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-lg z-[201]"
                    >
                        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                            {/* Search Input */}
                            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                                <Search className="w-5 h-5 text-gray-400" />
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={query}
                                    onChange={(e) => {
                                        setQuery(e.target.value)
                                        setSelectedIndex(0)
                                    }}
                                    placeholder="Search notebooks..."
                                    className="flex-1 bg-transparent outline-none text-gray-900 dark:text-white placeholder:text-gray-400"
                                />
                                <kbd className="hidden sm:block px-2 py-0.5 text-xs font-medium text-gray-400 bg-gray-100 dark:bg-gray-800 rounded">
                                    esc
                                </kbd>
                            </div>

                            {/* Results */}
                            <div className="max-h-[300px] overflow-y-auto py-2">
                                {filteredNotebooks.length === 0 ? (
                                    <div className="px-4 py-8 text-center text-gray-400">
                                        No notebooks found
                                    </div>
                                ) : (
                                    filteredNotebooks.map((notebook, index) => notebook && (
                                        <button
                                            key={notebook.id}
                                            onClick={() => {
                                                addToRecent(notebook.id)
                                                router.push(`/notebooks/${notebook.id}`)
                                                onClose()
                                            }}
                                            className={cn(
                                                "w-full flex items-center gap-3 px-4 py-2 text-left transition-colors",
                                                index === selectedIndex
                                                    ? "bg-gray-100 dark:bg-gray-800"
                                                    : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                                            )}
                                        >
                                            {isRecent(notebook.id) ? (
                                                <Clock className="w-4 h-4 text-gray-400" />
                                            ) : (
                                                <FileText className="w-4 h-4 text-gray-400" />
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                                        {notebook.title}
                                                    </span>
                                                    {notebook.isFavorite && (
                                                        <Star className="w-3 h-3 text-amber-400 fill-current" />
                                                    )}
                                                </div>
                                                {notebook.tags && notebook.tags.length > 0 && (
                                                    <div className="text-xs text-gray-400 truncate">
                                                        {notebook.tags.join(", ")}
                                                    </div>
                                                )}
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>

                            {/* Footer Hint */}
                            <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-400 flex items-center gap-4">
                                <span><kbd className="font-medium">↑↓</kbd> navigate</span>
                                <span><kbd className="font-medium">↵</kbd> open</span>
                                <span><kbd className="font-medium">esc</kbd> close</span>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
