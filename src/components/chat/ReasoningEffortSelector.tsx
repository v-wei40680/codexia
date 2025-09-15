import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Brain, ChevronDown } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../ui/popover';
import { useModelStore } from '@/stores/ModelStore';

export const ReasoningEffortSelector: React.FC = () => {
  const { reasoningEffort, setReasoningEffort } = useModelStore();
  const [isOpen, setIsOpen] = useState(false);

  const efforts = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
  ] as const;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
        >
          <Brain />
          <span className="capitalize">{reasoningEffort}</span>
          <ChevronDown className="w-3 h-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-36 p-2" align="start">
        <div className="space-y-1">
          <div>
            Reasoning Effort
          </div>
          {efforts.map((effort) => (
            <Button
              key={effort.value}
              variant={reasoningEffort === effort.value ? "default" : "ghost"}
              size="sm"
              className="w-full justify-start text-left p-2"
              onClick={() => {
                setReasoningEffort(effort.value);
                setIsOpen(false);
              }}
            >
              {effort.label}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};