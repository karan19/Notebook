"use client";
import { useEffect, useState } from "react";
import { useNotebookStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Key, Plus, Copy, Check, Trash2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export function ApiSettings() {
    const { apiKeys, fetchApiKeys, createApiKey } = useNotebookStore();
    const [isCreating, setIsCreating] = useState(false);
    const [copiedKey, setCopiedKey] = useState<string | null>(null);

    useEffect(() => {
        fetchApiKeys();
    }, [fetchApiKeys]);

    const handleCreateKey = async () => {
        setIsCreating(true);
        try {
            await createApiKey();
            toast.success("API key generated successfully!");
        } catch (e) {
            toast.error("Failed to generate API key");
        } finally {
            setIsCreating(false);
        }
    };

    const copyToClipboard = (key: string) => {
        navigator.clipboard.writeText(key);
        setCopiedKey(key);
        setTimeout(() => setCopiedKey(null), 2000);
        toast.success("API key copied to clipboard");
    };

    return (
        <div className="space-y-6">
            <Card className="border-gray-100 dark:border-gray-800 shadow-sm rounded-2xl overflow-hidden">
                <CardHeader className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-black dark:bg-white text-white dark:text-black rounded-lg">
                                <Key className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle className="text-xl">API Access</CardTitle>
                                <CardDescription>Manage your personal API keys for programmatic access.</CardDescription>
                            </div>
                        </div>
                        <Button
                            onClick={handleCreateKey}
                            disabled={isCreating}
                            className="bg-black dark:bg-white text-white dark:text-black hover:bg-black/90 dark:hover:bg-white/90 rounded-xl"
                        >
                            <Plus className="mr-2 h-4 w-4" /> Generate New Key
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="pt-6">
                    {apiKeys.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-center">
                            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-full mb-4">
                                <ShieldAlert className="h-8 w-8 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No API keys yet</h3>
                            <p className="text-sm text-gray-500 max-w-sm mt-1">
                                Generate an API key to start using the Notebook API from your own scripts and tools.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {apiKeys.map((key) => (
                                <div
                                    key={key.apiKey}
                                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800 group transition-all hover:border-gray-200 dark:hover:border-gray-700"
                                >
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2">
                                            <code className="px-2 py-0.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded text-sm font-mono text-gray-700 dark:text-gray-300">
                                                {key.apiKey.substring(0, 8)}••••••••••••••••••••••••
                                            </code>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => copyToClipboard(key.apiKey)}
                                                className="h-8 w-8 text-gray-400 hover:text-gray-900 dark:hover:text-white"
                                            >
                                                {copiedKey === key.apiKey ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                            </Button>
                                        </div>
                                        <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">
                                            Created {format(key.createdAt, "MMM d, yyyy")}
                                        </span>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 opacity-0 group-hover:opacity-100 transition-all rounded-lg"
                                        onClick={() => toast.error("Revoke feature coming soon!")}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="mt-8 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-xl">
                        <h4 className="flex items-center gap-2 text-sm font-bold text-amber-800 dark:text-amber-400 mb-2">
                            <ShieldAlert className="h-4 w-4" /> Security Notice
                        </h4>
                        <p className="text-xs text-amber-700 dark:text-amber-500 leading-relaxed font-medium">
                            API keys provide full access to your notebook data. Never share them or commit them to public repositories.
                            Use the <code className="bg-amber-100/50 dark:bg-amber-900/30 px-1 rounded mx-1 italic">x-api-key</code> header to authenticate your requests.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
