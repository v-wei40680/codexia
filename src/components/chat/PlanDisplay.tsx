import { CheckCircle, Circle, Loader2, Target, ListTodo } from 'lucide-react';

interface PlanStep {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  description?: string;
}

interface PlanDisplayProps {
  title?: string;
  steps: PlanStep[];
  currentStep?: number;
  className?: string;
}

export function PlanDisplay({ 
  title = "Plan", 
  steps, 
  currentStep, 
  className = '' 
}: PlanDisplayProps) {
  
  const getStepIcon = (step: PlanStep, index: number) => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'in_progress':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'skipped':
        return <Circle className="w-4 h-4 text-gray-400" />;
      default:
        return (
          <Circle 
            className={`w-4 h-4 ${
              index === currentStep 
                ? 'text-blue-500' 
                : 'text-gray-400'
            }`} 
          />
        );
    }
  };

  const getStepColor = (step: PlanStep, index: number) => {
    switch (step.status) {
      case 'completed':
        return 'text-green-700 dark:text-green-300';
      case 'in_progress':
        return 'text-blue-700 dark:text-blue-300 font-medium';
      case 'skipped':
        return 'text-gray-500 line-through';
      default:
        return index === currentStep 
          ? 'text-blue-700 dark:text-blue-300' 
          : 'text-gray-700 dark:text-gray-300';
    }
  };

  const completedSteps = steps.filter(step => step.status === 'completed').length;
  const totalSteps = steps.length;
  const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  return (
    <div className={`plan-display bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          <h3 className="text-lg font-semibold text-orange-800 dark:text-orange-200">
            {title}
          </h3>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <ListTodo className="w-4 h-4 text-orange-600 dark:text-orange-400" />
          <span className="text-sm text-orange-600 dark:text-orange-400">
            {completedSteps}/{totalSteps} completed
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      {totalSteps > 0 && (
        <div className="mb-4">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-orange-600 dark:text-orange-400">Progress</span>
            <span className="text-xs text-orange-600 dark:text-orange-400">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-orange-100 dark:bg-orange-800/30 rounded-full h-2">
            <div 
              className="bg-orange-500 dark:bg-orange-400 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Steps */}
      <div className="space-y-2">
        {steps.map((step, index) => (
          <div 
            key={step.id} 
            className={`flex items-start gap-3 p-2 rounded-md transition-colors ${
              index === currentStep 
                ? 'bg-orange-100 dark:bg-orange-800/30' 
                : 'hover:bg-orange-50 dark:hover:bg-orange-900/10'
            }`}
          >
            <div className="flex-shrink-0 mt-0.5">
              {getStepIcon(step, index)}
            </div>
            <div className="flex-1 min-w-0">
              <div className={`text-sm ${getStepColor(step, index)}`}>
                <span className="font-medium">{index + 1}.</span> {step.title}
              </div>
              {step.description && (
                <div className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                  {step.description}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      {currentStep !== undefined && currentStep < steps.length && (
        <div className="mt-3 pt-3 border-t border-orange-200 dark:border-orange-700">
          <div className="flex items-center gap-2 text-sm text-orange-600 dark:text-orange-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Current: {steps[currentStep]?.title}</span>
          </div>
        </div>
      )}
    </div>
  );
}