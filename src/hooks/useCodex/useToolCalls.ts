import { ExecCommandBeginEvent } from "@/bindings/ExecCommandBeginEvent";
import { ExecCommandEndEvent } from "@/bindings/ExecCommandEndEvent";
import { McpToolCallBeginEvent } from "@/bindings/McpToolCallBeginEvent";
import { McpToolCallEndEvent } from "@/bindings/McpToolCallEndEvent";
import { PatchApplyBeginEvent } from "@/bindings/PatchApplyBeginEvent";
import { PatchApplyEndEvent } from "@/bindings/PatchApplyEndEvent";
import { WebSearchBeginEvent } from "@/bindings/WebSearchBeginEvent";
import { WebSearchEndEvent } from "@/bindings/WebSearchEndEvent";
import { useEffect, useMemo, useState } from "react";
import { v4 } from "uuid";
import { useConversationEvents } from "./useConversationEvents";

interface ToolCall {
    id: string;
    type: 'mcp' | 'web_search' | 'exec' | 'patch_apply';
    status: 'running' | 'completed' | 'failed';
    callId: string;
    data: any;
    output?: string;
    timestamp: number;
  }
  
export  function useToolCalls(conversationId: string | null) {
    const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);
    
    // Only display running calls
    const activeToolCalls = useMemo(
      () => toolCalls.filter(call => call.status === 'running'),
      [toolCalls]
    );
    
    const handleExecBegin = (event: ExecCommandBeginEvent) => {
      setToolCalls(prev => [...prev, {
        id: v4(),
        type: 'exec',
        status: 'running',
        callId: event.call_id,
        data: event,
        timestamp: Date.now()
      }]);
    };
    
    const handleExecEnd = (event: ExecCommandEndEvent) => {
      setToolCalls(prev => prev.map(call =>
        call.callId === event.call_id
          ? { ...call, status: 'completed', output: event.stdout }
          : call
      ));
    };
    
    const handlePatchBegin = (event: PatchApplyBeginEvent) => {
      setToolCalls(prev => [...prev, {
        id: v4(),
        type: 'patch_apply',
        status: 'running',
        callId: event.call_id,
        data: event,
        timestamp: Date.now()
      }]);
    };
    
    const handlePatchEnd = (event: PatchApplyEndEvent) => {
      setToolCalls(prev => prev.map(call =>
        call.callId === event.call_id
          ? {
              ...call,
              status: event.success ? 'completed' : 'failed',
              output: event.success ? event.stdout : event.stderr || 'Patch failed'
            }
          : call
      ));
    };

    const handleWebSearchBegin = (event: WebSearchBeginEvent) => {
      setToolCalls(prev => [...prev, {
        id: v4(),
        type: 'web_search',
        status: 'running',
        callId: event.call_id,
        data: event,
        timestamp: Date.now()
      }]);
    };

    const handleWebSearchEnd = (event: WebSearchEndEvent) => {
      setToolCalls(prev => prev.map(call =>
        call.callId === event.call_id
          ? { ...call, status: 'completed' }
          : call
      ));
    };

    const handleMcpBegin = (event: McpToolCallBeginEvent) => {
      setToolCalls(prev => [...prev, {
        id: v4(),
        type: 'mcp',
        status: 'running',
        callId: event.call_id,
        data: event,
        timestamp: Date.now()
      }]);
    };

    const handleMcpEnd = (event: McpToolCallEndEvent) => {
      setToolCalls(prev => prev.map(call =>
        call.callId === event.call_id
          ? {
              ...call,
              status: 'completed',
              output: 'Ok' in event.result ? JSON.stringify(event.result.Ok) : event.result.Err
            }
          : call
      ));
    };
    
    // Periodically clean up completed calls (keep the latest 50)
    useEffect(() => {
      const cleanup = () => {
        setToolCalls(prev => {
          const completed = prev.filter(c => c.status !== 'running');
          const running = prev.filter(c => c.status === 'running');
          
          if (completed.length > 50) {
            const sorted = completed.sort((a, b) => b.timestamp - a.timestamp);
            return [...running, ...sorted.slice(0, 50)];
          }
          return prev;
        });
      };
      
      const interval = setInterval(cleanup, 60000);
      return () => clearInterval(interval);
    }, []);
    
    useConversationEvents(conversationId, {
      onExecCommandBegin: handleExecBegin,
      onExecCommandEnd: handleExecEnd,
      onPatchApplyBegin: handlePatchBegin,
      onPatchApplyEnd: handlePatchEnd,
      onWebSearchBegin: handleWebSearchBegin,
      onWebSearchEnd: handleWebSearchEnd,
      onMcpToolCallBegin: handleMcpBegin,
      onMcpToolCallEnd: handleMcpEnd
    });
    
    return { 
      toolCalls: activeToolCalls, // Only return running calls
      allToolCalls: toolCalls // Full history
    };
  }