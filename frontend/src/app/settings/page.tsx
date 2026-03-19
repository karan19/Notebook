"use client";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { ApiSettings } from "@/components/settings/ApiSettings";
import { motion } from "motion/react";
import { Key } from "lucide-react";

export default function SettingsPage() {
    return (
        <div className="flex h-screen bg-[#FDFDFD] dark:bg-gray-950">
            <Sidebar />
            <main className="flex-1 overflow-y-auto p-10 lg:p-16">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="max-w-4xl mx-auto space-y-12"
                >
                    <header className="space-y-2">
                        <div className="flex items-center gap-3 text-sm font-bold text-gray-400 uppercase tracking-widest">
                            <Key className="h-4 w-4" />
                            Settings
                        </div>
                        <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">
                            Account & API
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 font-medium">
                            Configure your workspace and manage integrations.
                        </p>
                    </header>

                    <section className="space-y-6">
                        <ApiSettings />
                    </section>
                </motion.div>
            </main>
        </div>
    );
}
