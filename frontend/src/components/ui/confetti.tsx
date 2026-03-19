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
            "#8b5cf6", "#ec4899", "#f97316", "#14b8a6"
        ]

        const particleCount = config.particleCount || 50
        const startX = config.x !== undefined ? config.x * window.innerWidth : window.innerWidth / 2
        const startY = config.y !== undefined ? config.y * window.innerHeight : window.innerHeight / 3

        for (let i = 0; i < particleCount; i++) {
            particles.push({
                x: startX,
                y: startY,
                vx: (Math.random() - 0.5) * 12,
                vy: Math.random() * -12 - 4,
                color: colors[Math.floor(Math.random() * colors.length)],
                size: Math.random() * 8 + 4,
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.2,
                life: 1
            })
        }

        let frame = 0
        const maxFrames = 120

        const animate = () => {
            if (!ctx) return
            ctx.clearRect(0, 0, canvas.width, canvas.height)

            particles.forEach((p) => {
                p.x += p.vx
                p.vy += 0.3 // gravity
                p.y += p.vy
                p.rotation += p.rotationSpeed
                p.life -= 0.01

                if (p.life > 0) {
                    ctx.save()
                    ctx.translate(p.x, p.y)
                    ctx.rotate(p.rotation)
                    ctx.globalAlpha = p.life
                    ctx.fillStyle = p.color
                    ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6)
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
            fire({ particleCount: 60, y: 0.3 })
        }
    }, [trigger])

    return null
}
