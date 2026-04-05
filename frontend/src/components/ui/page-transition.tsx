"use client"

import { motion, AnimatePresence } from "motion/react"
import { usePathname } from "next/navigation"
import { useEffect, useState, ReactNode } from "react"

interface PageTransitionProps {
    children: ReactNode
}

export function PageTransition({ children }: PageTransitionProps) {
    const pathname = usePathname()
    const [isFirstRender, setIsFirstRender] = useState(true)

    useEffect(() => {
        setIsFirstRender(false)
    }, [])

    // Skip animation on first render for instant page load
    if (isFirstRender) {
        return <>{children}</>
    }

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={pathname}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{
                    duration: 0.25,
                    ease: [0.25, 0.1, 0.25, 1.0]
                }}
                className="w-full h-full"
            >
                {children}
            </motion.div>
        </AnimatePresence>
    )
}
