"use client";

import { useState } from "react";
import { 
    Trash2, 
    ChevronLeft, 
    ChevronRight, 
    Eye, 
    Plus 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";

interface EditorPaginationProps {
    pages: any[];
    visibleActivePageIndex: number;
    onPrevPage: () => void;
    onNextPage: () => void;
    onAddPage: () => void;
    onDeletePage: (pageId: string) => Promise<void>;
    currentPageId: string;
    isFocusMode: boolean;
    setIsFocusMode: (f: boolean) => void;
}

export function EditorPagination({
    pages,
    visibleActivePageIndex,
    onPrevPage,
    onNextPage,
    onAddPage,
    onDeletePage,
    currentPageId,
    isFocusMode,
    setIsFocusMode
}: EditorPaginationProps) {
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    const handleConfirmDelete = async () => {
        await onDeletePage(currentPageId);
        setShowDeleteModal(false);
    };

    return (
        <>
            <div className="absolute bottom-0 w-full bg-background/80 backdrop-blur-md border-t border-border/40 z-50">
                <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
                    {/* Left: Delete Page (only if > 1 page) */}
                    {pages.length > 1 ? (
                        <button
                            onClick={() => setShowDeleteModal(true)}
                            className="text-gray-400 hover:text-red-500 transition-colors p-2 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-md"
                            title="Delete this page"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    ) : <div className="w-8" />}

                    {/* Center: Pagination */}
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onPrevPage}
                            disabled={visibleActivePageIndex <= 0}
                            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-gray-600 dark:text-gray-400"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>

                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400 select-none">
                            Page {visibleActivePageIndex + 1} of {pages.length}
                        </span>

                        <button
                            onClick={onNextPage}
                            disabled={visibleActivePageIndex >= pages.length - 1}
                            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-gray-600 dark:text-gray-400"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Right: Mode Toggles + Add Page */}
                    <div className="flex items-center gap-2">
                        {/* Focus Mode Toggle */}
                        <button
                            onClick={() => setIsFocusMode(!isFocusMode)}
                            className={cn(
                                "p-2 rounded-md transition-colors",
                                isFocusMode
                                    ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
                                    : "text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                            )}
                            title="Focus Mode (⌘+Shift+F)"
                        >
                            <Eye className="w-4 h-4" />
                        </button>

                        {/* Add Page Button */}
                        <button
                            onClick={onAddPage}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-md text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-100 transition-all shadow-sm active:scale-95 ml-2"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Add Page</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {showDeleteModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center backdrop-blur-sm"
                        onClick={() => setShowDeleteModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white dark:bg-gray-900 rounded-lg shadow-xl p-6 max-w-sm w-full mx-4 border border-gray-100 dark:border-gray-800"
                        >
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Delete Page?</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                                This will permanently delete this page and all its content. This action cannot be undone.
                            </p>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setShowDeleteModal(false)}
                                    className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleConfirmDelete}
                                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors shadow-sm"
                                >
                                    Delete Page
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
