"use client"

import { useEffect } from "react"

interface ConfettiConfig {
    x?: number
    y?: number
    particleCount?: number
}

// Simple canvas-based confetti without external dependency
export function useConfetti() {
    const fire = (config: ConfettiConfig = {}) => {
        const canvas = document.createElement("canvas")
        canvas.style.position = "fixed"
        canvas.style.top = "0"
        canvas.style.left = "0"
        canvas.style.width = "100vw"
        canvas.style.height = "100vh"
        canvas.style.pointerEvents = "none"
        canvas.style.zIndex = "9999"
        canvas.width = window.innerWidth
        canvas.height = window.innerHeight
        document.body.appendChild(canvas)

        const ctx = canvas.getContext("2d")
        if (!ctx) return

        const particles: Array<{
            x: number
            y: number
            vx: number
            vy: number
            color: string
            size: number
            rotation: number
            rotationSpeed: number
            life: number
        }> = []

        const colors = [
            "#f59e0b", "#ef4444", "#10b981", "#3b82f6",
            "#8b5cf6", "#ec4899", "#f97316", "#14b8a6",
            "#FF6B6B", "#4ECDC4", "#FFE66D", "#AA96DA", "#FCBAD3"
        ]

        const particleCount = config.particleCount || 80
        const startX = config.x !== undefined ? config.x * window.innerWidth : window.innerWidth / 2
        const startY = config.y !== undefined ? config.y * window.innerHeight : window.innerHeight * 0.2

        for (let i = 0; i < particleCount; i++) {
            // Spread particles across the full width
            const spreadX = config.x !== undefined ? startX : Math.random() * window.innerWidth
            particles.push({
                x: spreadX,
                y: startY,
                vx: (Math.random() - 0.5) * 16,
                vy: Math.random() * -14 - 6,
                color: colors[Math.floor(Math.random() * colors.length)],
                size: Math.random() * 10 + 6,
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.3,
                life: 1
            })
        }

        let frame = 0
        const maxFrames = 180 // Longer duration for more impact

        const animate = () => {
            if (!ctx) return
            ctx.clearRect(0, 0, canvas.width, canvas.height)

            particles.forEach((p) => {
                p.x += p.vx
                p.vy += 0.25 // Softer gravity
                p.y += p.vy
                p.rotation += p.rotationSpeed
                // Slower fade out for more visibility
                p.life -= 0.006
                
                // Air resistance
                p.vx *= 0.995

                if (p.life > 0) {
                    ctx.save()
                    ctx.translate(p.x, p.y)
                    ctx.rotate(p.rotation)
                    ctx.globalAlpha = p.life
                    ctx.fillStyle = p.color
                    // Vary the shape - rectangles and squares
                    const width = p.size
                    const height = p.size * (0.4 + Math.random() * 0.3)
                    ctx.fillRect(-width / 2, -height / 2, width, height)
                    ctx.restore()
                }
            })

            frame++
            if (frame < maxFrames) {
                requestAnimationFrame(animate)
            } else {
                document.body.removeChild(canvas)
            }
        }

        animate()
    }

    return { fire }
}

// Component version
export function Confetti({ trigger }: { trigger: boolean }) {
    const { fire } = useConfetti()

    useEffect(() => {
        if (trigger) {
            fire({ particleCount: 80, y: 0.15 })
        }
    }, [trigger])

    return null
}
