import React, { useState } from 'react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { ChevronDown } from 'lucide-react';
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
    { value: 'high', label: 'High' },
    { value: 'medium', label: 'Medium' },
    { value: 'low', label: 'Low' },
  ] as const;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Badge
          variant="outline"
          className="text-xs cursor-pointer hover:bg-gray-100 h-6 px-2 gap-1"
        >
          <span className="capitalize">{reasoningEffort}</span>
          <ChevronDown className="w-3 h-3" />
        </Badge>
      </PopoverTrigger>
      <PopoverContent className="w-36 p-2" align="start">
        <div className="space-y-1">
          <div className="text-xs font-medium text-gray-700 px-2 py-1">
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