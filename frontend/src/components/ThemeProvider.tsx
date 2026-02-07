"use client"

import { ThemeProvider as NextThemesProvider } from "next-themes"

// Workaround for next-themes v0.4 + React 19 type incompatibility
const Provider = NextThemesProvider as React.FC<{
    children: React.ReactNode
    attribute?: string
    defaultTheme?: string
    enableSystem?: boolean
    disableTransitionOnChange?: boolean
}>

export function ThemeProvider({
    children
}: {
    children: React.ReactNode
}) {
    return (
        <Provider
            attribute="class"
            defaultTheme="light"
            enableSystem
            disableTransitionOnChange
        >
            {children}
        </Provider>
    )
}
