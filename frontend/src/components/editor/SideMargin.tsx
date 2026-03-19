"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, X, GripVertical } from "lucide-react";
import { SideNote } from "@/lib/store";
import { cn } from "@/lib/utils";

interface SideMarginProps {
    notes: SideNote[];
    onNotesChange: (notes: SideNote[]) => void;
    isVisible: boolean;
}

export function SideMargin({ notes, onNotesChange, isVisible }: SideMarginProps) {
    const [editingId, setEditingId] = useState<string | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const addNote = (e: React.MouseEvent) => {
        // Prevent adding if clicking an existing note
        if ((e.target as HTMLElement).closest('.side-note-item')) return;

        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;

        const y = e.clientY - rect.top;
        const newNote: SideNote = {
            id: crypto.randomUUID(),
            content: "",
            y: y,
            createdAt: Date.now(),
            color: "yellow"
        };

        onNotesChange([...notes, newNote]);
        setEditingId(newNote.id);
    };

    const updateNote = (id: string, content: string) => {
        onNotesChange(notes.map(n => n.id === id ? { ...n, content } : n));
    };

    const deleteNote = (id: string) => {
        onNotesChange(notes.filter(n => n.id !== id));
    };

    if (!isVisible) return null;

    return (
        <div 
            ref={containerRef}
            className="absolute right-0 top-0 bottom-0 w-[180px] border-l border-gray-100 dark:border-gray-800/50 bg-gray-50/30 dark:bg-gray-900/10 cursor-crosshair group/margin overflow-hidden pointer-events-auto"
            onClick={addNote}
            title="Click to add a margin note"
        >
            {/* Margin Label */}
            <div className="absolute top-4 left-4 text-[10px] font-bold text-gray-300 dark:text-gray-700 uppercase tracking-widest pointer-events-none select-none">
                Marginalia
            </div>

            <AnimatePresence>
                {notes.map((note) => (
                    <motion.div
                        key={note.id}
                        initial={{ opacity: 0, scale: 0.9, x: 10 }}
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.9, x: 10 }}
                        className="side-note-item absolute left-4 right-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-900/30 rounded-lg shadow-sm group/note cursor-default"
                        style={{ top: note.y }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {editingId === note.id ? (
                            <textarea
                                autoFocus
                                value={note.content}
                                onChange={(e) => updateNote(note.id, e.target.value)}
                                onBlur={() => {
                                    if (!note.content.trim()) deleteNote(note.id);
                                    setEditingId(null);
                                }}
                                className="w-full bg-transparent border-none outline-none text-xs font-medium text-gray-800 dark:text-gray-200 leading-relaxed resize-none h-auto min-h-[60px]"
                                placeholder="Write a note..."
                            />
                        ) : (
                            <div 
                                className="text-xs font-medium text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap break-words min-h-[20px]"
                                onClick={() => setEditingId(note.id)}
                            >
                                {note.content || <span className="text-gray-400 italic">Empty note...</span>}
                            </div>
                        )}

                        {/* Actions */}
                        <div className="absolute top-2 right-2 opacity-0 group-hover/note:opacity-100 transition-opacity flex items-center gap-1">
                            <button 
                                onClick={() => deleteNote(note.id)}
                                className="p-1 text-gray-400 hover:text-red-500 rounded-md transition-colors"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                        
                        {/* Status Icon */}
                        <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-1 h-4 bg-yellow-400 dark:bg-yellow-600 rounded-full opacity-50" />
                    </motion.div>
                ))}
            </AnimatePresence>

            {/* Empty State Hint */}
            {notes.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-margin/margin:opacity-100 transition-opacity pointer-events-none">
                    <div className="flex flex-col items-center gap-2 text-gray-300 dark:text-gray-800">
                        <Plus className="w-5 h-5" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Add Note</span>
                    </div>
                </div>
            )}
        </div>
    );
}
