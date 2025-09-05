import React from 'react';
import { PlanDisplay } from './PlanDisplay';
import { MarkdownRenderer } from '../MarkdownRenderer';
import type { ChatMessage } from '@/types/chat';

interface PlanUpdateMessageProps {
  message: ChatMessage;
}

export const PlanUpdateMessage: React.FC<PlanUpdateMessageProps> = ({ message }) => {
  const parsePlanFromContent = () => {
    // Parse plan from content
    const planMatch = message.content.match(/Plan Updated:?\s*(.*)\n\n([\s\S]*)/); 
    const explanation = planMatch?.[1] || '';
    const planText = planMatch?.[2] || message.content;
    
    // Parse steps from content
    const steps = planText.split('\n')
      .filter(line => line.trim().startsWith('-'))
      .map((line, index) => {
        const cleanLine = line.replace(/^-\s*/, '').trim();
        const status = cleanLine.startsWith('✅') ? 'completed' as const :
                     cleanLine.startsWith('🔄') ? 'in_progress' as const :
                     'pending' as const;
        const title = cleanLine.replace(/^(✅|🔄|⏳)\s*/, '');
        return {
          id: String(index + 1),
          title,
          status
        };
      });
    
    return { explanation, steps };
  };

  const { explanation, steps } = parsePlanFromContent();

  if (steps.length > 0) {
    const currentStepIndex = steps.findIndex(s => s.status === 'in_progress');
    return (
      <PlanDisplay 
        title={explanation || "Plan"}
        steps={steps}
        currentStep={currentStepIndex >= 0 ? currentStepIndex : undefined}
      />
    );
  }
  
  // Fallback to regular markdown if no steps found
  return <MarkdownRenderer content={message.content} />;
};