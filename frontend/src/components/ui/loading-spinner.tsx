"use client";

import { cn } from "@/lib/utils";
import { motion } from "motion/react";

interface LoadingSpinnerProps {
    className?: string;
    size?: number;
}

export const LoadingSpinner = ({ className, size = 24 }: LoadingSpinnerProps) => {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={cn("relative", className)}
            style={{ width: size, height: size }}
        >
            <svg
                viewBox="0 0 24 24"
                fill="none"
                className="animate-spin"
                style={{ width: size, height: size }}
            >
                <circle
                    cx="12" cy="12" r="10"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    className="opacity-20"
                />
                <path
                    d="M12 2a10 10 0 0 1 10 10"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                />
            </svg>
        </motion.div>
    );
};

interface FullPageSpinnerProps {
    message?: string;
}

export const FullPageSpinner = ({ message = "Loading..." }: FullPageSpinnerProps) => {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm z-50">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center gap-4"
            >
                <LoadingSpinner size={40} className="text-gray-400 dark:text-gray-500" />
                <p className="text-sm font-medium text-gray-400 dark:text-gray-500 animate-pulse">
                    {message}
                </p>
            </motion.div>
        </div>
    );
};

// Editor skeleton for initial notebook load
export function EditorSkeleton() {
    return (
        <div className="flex w-full h-full bg-[#f8f9fa] dark:bg-gray-950">
            <main className="flex-1 flex flex-col h-full overflow-hidden">
                <div className="flex-1 overflow-y-auto pb-32">
                    <div className="max-w-6xl mx-auto px-4 py-8 min-h-screen flex items-start justify-center">
                        <div className="flex-1 min-w-0 max-w-6xl">
                            {/* Back button skeleton */}
                            <div className="mb-4">
                                <div className="h-5 w-24 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
                            </div>

                            {/* Paper sheet skeleton */}
                            <div className="bg-white dark:bg-gray-900 shadow-[0_0_50px_rgba(0,0,0,0.04)] dark:shadow-[0_0_50px_rgba(0,0,0,0.3)] border border-gray-100 dark:border-gray-800 rounded-sm min-h-[1100px] flex flex-col">
                                {/* Header skeleton */}
                                <div className="px-8 pt-6 pb-2 border-b border-gray-50/50 dark:border-gray-800">
                                    <div className="h-9 w-64 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse mb-3" />
                                    <div className="flex gap-2">
                                        <div className="h-5 w-16 bg-gray-50 dark:bg-gray-800 rounded animate-pulse" />
                                        <div className="h-5 w-20 bg-gray-50 dark:bg-gray-800 rounded animate-pulse" />
                                    </div>
                                </div>

                                {/* Content skeleton */}
                                <div className="px-8 pt-6 pb-12 flex-1 space-y-4">
                                    {[...Array(8)].map((_, i) => (
                                        <div key={i} className="space-y-2" style={{ opacity: 1 - i * 0.1 }}>
                                            <div
                                                className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse"
                                                style={{ width: `${85 - i * 5}%`, animationDelay: `${i * 0.1}s` }}
                                            />
                                        </div>
                                    ))}
                                    <div className="pt-4 space-y-2">
                                        <div className="h-6 w-48 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                                        {[...Array(4)].map((_, i) => (
                                            <div
                                                key={`p2-${i}`}
                                                className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse"
                                                style={{ width: `${90 - i * 8}%`, animationDelay: `${(i + 8) * 0.1}s` }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom bar skeleton */}
                <div className="bg-white/80 dark:bg-gray-900/80 border-t border-gray-200 dark:border-gray-800">
                    <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
                        <div className="w-8" />
                        <div className="flex items-center gap-4">
                            <div className="h-5 w-5 bg-gray-100 dark:bg-gray-800 rounded-full animate-pulse" />
                            <div className="h-4 w-24 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                            <div className="h-5 w-5 bg-gray-100 dark:bg-gray-800 rounded-full animate-pulse" />
                        </div>
                        <div className="h-9 w-28 bg-gray-100 dark:bg-gray-800 rounded-md animate-pulse" />
                    </div>
                </div>
            </main>
        </div>
    );
}

// Content loading overlay for page switches
export function ContentLoadingOverlay() {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="absolute inset-0 z-40 flex items-center justify-center bg-white/40 dark:bg-black/20 backdrop-blur-md rounded-sm overflow-hidden"
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 25, delay: 0.05 }}
                className="flex flex-col items-center gap-4"
            >
                <div className="relative">
                    <LoadingSpinner size={32} className="text-blue-500/80 dark:text-blue-400/80" />
                    <div className="absolute inset-0 blur-lg bg-blue-500/20 dark:bg-blue-400/10 rounded-full animate-pulse" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 select-none">
                    Loading Context
                </span>
            </motion.div>
        </motion.div>
    );
}
