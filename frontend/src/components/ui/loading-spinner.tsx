import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
    className?: string;
    size?: number;
}

export const LoadingSpinner = ({ className, size = 24 }: LoadingSpinnerProps) => {
    return (
        <Loader2
            className={cn("animate-spin text-primary", className)}
            size={size}
        />
    );
};

export const FullPageSpinner = () => {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-white/80 backdrop-blur-sm z-50">
            <LoadingSpinner size={48} />
        </div>
    );
};
