import { Button } from "@/components/ui/button";
import { ArrowUp, ArrowDown } from "lucide-react";

interface CCScrollControlsProps {
    onScrollUp: () => void;
    onScrollDown: () => void;
}

export function CCScrollControls({ onScrollUp, onScrollDown }: CCScrollControlsProps) {
    return (
        <div className="fixed bottom-20 right-4 flex shadow-lg">
            <Button
                onClick={onScrollUp}
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-r-none border-r-0"
            >
                <ArrowUp className="h-4 w-4" />
            </Button>
            <Button
                onClick={onScrollDown}
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-l-none"
            >
                <ArrowDown className="h-4 w-4" />
            </Button>
        </div>
    );
}
