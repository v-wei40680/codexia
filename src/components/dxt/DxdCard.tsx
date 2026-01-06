import { Card, CardContent, CardDescription } from '@/components/ui/card';
import { ChevronRight } from 'lucide-react';
import { Button } from '../ui/button';

// DxtCard component to display manifest info
export function DxtCard({ dxt, onClick }: { dxt: any; onClick?: () => void }) {
  // Always treat dxt.tools as an array
  const toolsArray = Array.isArray(dxt.tools) ? dxt.tools : [];
  const showTools = toolsArray.slice(0, 3);
  const hasMore = toolsArray.length > 3;

  return (
    <Card
      className="w-full h-full flex flex-col justify-between cursor-pointer hover:shadow-lg transition-shadow"
    >
      <CardContent className="flex flex-col flex-1">
        <div className="flex gap-2 items-start">
          <img src={dxt.icon} alt="icon" className="w-10 h-10 rounded" />
          <div className="flex flex-col flex-1">
            <span className="font-bold text-lg">{dxt.display_name}</span>
            <div className="text-sm text-muted-foreground">{dxt.author?.name}</div>
          </div>
          <Button size="icon" variant="secondary" className='hover:bg-gray-500'
            onClick={(e) => {
              e.stopPropagation();
              onClick?.();
            }}>
            <ChevronRight />
          </Button>
        </div>
        <CardDescription className="line-clamp-2">{dxt.description}</CardDescription>
        {/* Tools */}
        <div className="flex items-center gap-2 flex-wrap mt-2">
          {showTools.map((tool: any) => (
            <span key={tool.name} className="bg-muted px-2 py-0.5 rounded text-xs font-medium">
              {tool.name}
            </span>
          ))}
          {hasMore && <span className="text-xs text-muted-foreground">more</span>}
        </div>
      </CardContent>
    </Card>
  );
}
