import { cn } from "@/lib/utils"

function Skeleton({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn(
                "rounded-md bg-gray-100 dark:bg-gray-800 relative overflow-hidden skeleton-shimmer",
                className
            )}
            {...props}
        />
    )
}

export { Skeleton }
