"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"

import { Button } from "@/components/ui/button"

interface ThemeToggleProps {
    isCollapsed?: boolean;
}

export function ThemeToggle({ isCollapsed }: ThemeToggleProps) {
    const { theme, setTheme } = useTheme()
    const [mounted, setMounted] = React.useState(false)

    React.useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return (
            <Button
                variant="ghost"
                size="icon"
                className={cn(
                    "rounded-xl transition-all",
                    isCollapsed ? "w-10 h-10 p-0" : "w-full justify-start gap-3 py-5 px-3"
                )}
            >
                <Sun className="h-4.5 w-4.5" />
                {!isCollapsed && <span className="text-sm font-medium">Theme</span>}
            </Button>
        )
    }

    return (
        <Button
            variant="ghost"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className={cn(
                "rounded-xl font-medium transition-all text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200",
                isCollapsed ? "w-10 h-10 p-0" : "w-full justify-start gap-3 py-5 px-3"
            )}
            title={isCollapsed ? (theme === 'dark' ? 'Light Mode' : 'Dark Mode') : undefined}
        >
            {theme === "dark" ? (
                <>
                    <Sun className={cn("h-4.5 w-4.5 text-yellow-500", !isCollapsed && "min-w-[1.125rem]")} />
                    {!isCollapsed && <span>Light Mode</span>}
                </>
            ) : (
                <>
                    <Moon className={cn("h-4.5 w-4.5 text-gray-400", !isCollapsed && "min-w-[1.125rem]")} />
                    {!isCollapsed && <span>Dark Mode</span>}
                </>
            )}
        </Button>
    )
}
