"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"

export function ThemeToggle() {
    const { theme, setTheme } = useTheme()
    const [mounted, setMounted] = React.useState(false)

    React.useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return (
            <Button variant="ghost" size="icon" className="w-full justify-start gap-3 rounded-xl py-5">
                <Sun className="h-4 w-4" />
                <span className="text-sm font-medium">Theme</span>
            </Button>
        )
    }

    return (
        <Button
            variant="ghost"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="w-full justify-start gap-3 rounded-xl py-5 font-medium transition-all text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
        >
            {theme === "dark" ? (
                <>
                    <Sun className="h-4 w-4 text-yellow-500" />
                    <span>Light Mode</span>
                </>
            ) : (
                <>
                    <Moon className="h-4 w-4 text-gray-400" />
                    <span>Dark Mode</span>
                </>
            )}
        </Button>
    )
}
