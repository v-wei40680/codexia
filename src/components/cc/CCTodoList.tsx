import { CheckCircle2, Circle, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Button } from "../ui/button";

export interface TodoItem {
    activeForm: string;
    content: string;
    status: "completed" | "in_progress" | "pending";
}

interface Props {
    todos: TodoItem[];
}

export function CCTodoList({ todos }: Props) {
    const [isExpanded, setIsExpanded] = useState(false);

    const hasInProgress = todos.some(t => t.status === "in_progress");
    const hasCompleted = todos.some(t => t.status === "completed");
    const firstIsInProgress = todos[0]?.status === "in_progress";
    const othersPending = todos.slice(1).every(t => t.status === "pending");

    // Show all if:
    // 1. Nothing is in progress (all pending or all completed)
    // 2. OR: We just started the first task and haven't completed anything yet
    const shouldShowAll = !hasInProgress || (firstIsInProgress && !hasCompleted && othersPending);

    // Split todos while keeping original indices
    const indexedTodos = todos.map((todo, index) => ({ ...todo, originalIndex: index + 1 }));
    const inProgressTodos = indexedTodos.filter(t => t.status === "in_progress");
    const otherTodos = indexedTodos.filter(t => t.status !== "in_progress");

    if (shouldShowAll) {
        return (
            <div className="flex flex-col gap-2 py-2">
                <AnimatePresence mode="popLayout">
                    {indexedTodos.map((todo, idx) => (
                        <TodoItemView
                            key={todo.content + todo.originalIndex}
                            todo={todo}
                            displayIndex={todo.originalIndex}
                            delayIdx={idx}
                        />
                    ))}
                </AnimatePresence>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-2 py-2">
            {/* Active Items */}
            <AnimatePresence mode="popLayout">
                {inProgressTodos.map((todo, idx) => (
                    <TodoItemView
                        key={todo.content + todo.originalIndex}
                        todo={todo}
                        displayIndex={todo.originalIndex}
                        delayIdx={idx}
                    />
                ))}
            </AnimatePresence>

            {/* Collapsed/Others Section */}
            {otherTodos.length > 0 && (
                <div className="flex flex-col gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="w-fit h-7 px-2 text-[10px] font-bold text-muted-foreground hover:text-foreground uppercase tracking-widest flex items-center gap-1.5"
                    >
                        {isExpanded ? (
                            <ChevronDown className="h-3 w-3" />
                        ) : (
                            <ChevronRight className="h-3 w-3" />
                        )}
                        {isExpanded ? "Hide" : `Show ${otherTodos.length}`} Completed & Pending
                        {!isExpanded && (
                            <span className="flex items-center gap-0.5 ml-1">
                                {otherTodos.slice(0, 3).map((_, i) => (
                                    <div key={i} className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                                ))}
                            </span>
                        )}
                    </Button>

                    <AnimatePresence>
                        {isExpanded && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2, ease: "easeInOut" }}
                                className="overflow-hidden flex flex-col gap-2"
                            >
                                {otherTodos.map((todo, idx) => (
                                    <TodoItemView
                                        key={todo.content + todo.originalIndex}
                                        todo={todo}
                                        displayIndex={todo.originalIndex}
                                        delayIdx={idx}
                                        isOther
                                    />
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
}

function TodoItemView({
    todo,
    displayIndex,
    delayIdx,
    isOther
}: {
    todo: TodoItem;
    displayIndex: number;
    delayIdx: number;
    isOther?: boolean
}) {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, delay: isOther ? 0 : delayIdx * 0.05 }}
            className={cn(
                "group relative flex items-center gap-3 rounded-xl border p-3 transition-all duration-200",
                todo.status === "completed"
                    ? "bg-emerald-50/20 border-emerald-500/10 dark:bg-emerald-500/5"
                    : todo.status === "in_progress"
                        ? "bg-blue-50/50 border-blue-500/20 dark:bg-blue-500/10 shadow-sm shadow-blue-500/5 ring-1 ring-blue-500/10"
                        : "bg-muted/10 border-border/50 dark:bg-muted/5 opacity-60"
            )}
        >
            <div className="shrink-0 relative flex items-center justify-center w-5 h-5">
                {todo.status === "completed" ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500/80 fill-emerald-500/10" />
                ) : (
                    <>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-[9px] font-bold text-muted-foreground/60 tabular-nums">
                                {displayIndex}
                            </span>
                        </div>
                        {todo.status === "in_progress" ? (
                            <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                        ) : (
                            <Circle className="h-5 w-5 text-muted-foreground/30" />
                        )}
                    </>
                )}
            </div>

            <div className="min-w-0 flex-1">
                <span className={cn(
                    "text-sm font-medium transition-colors",
                    todo.status === "completed"
                        ? "text-emerald-700/80 dark:text-emerald-400/80 line-through decoration-emerald-500/20"
                        : todo.status === "in_progress"
                            ? "text-blue-700 dark:text-blue-300"
                            : "text-muted-foreground/80"
                )}>
                    {todo.status === "in_progress" ? (todo.activeForm || todo.content) : todo.content}
                </span>
            </div>

            {todo.status === "in_progress" && (
                <motion.div
                    layoutId="active-indicator"
                    className="absolute inset-y-0 -left-px w-1 bg-blue-500 rounded-full"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
            )}
        </motion.div>
    );
}
