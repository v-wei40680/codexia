/**
 * Markdown streaming collector inspired by codex CLI implementation
 * Handles newline-gated streaming with proper markdown rendering
 */

import { 
  isInsideUnclosedfence, 
  processMarkdownForStreaming 
} from './markdownHelpers';

export interface StreamLine {
  id: string;
  content: string;
  isComplete: boolean;
}

export class MarkdownStreamCollector {
  private buffer: string = '';
  private committedLineCount: number = 0;
  private hasSeenDelta: boolean = false;

  constructor() {
    this.clear();
  }

  clear(): void {
    this.buffer = '';
    this.committedLineCount = 0;
    this.hasSeenDelta = false;
  }

  pushDelta(delta: string): void {
    if (delta) {
      this.hasSeenDelta = true;
    }
    this.buffer += delta;
  }

  /**
   * Commit completed lines (those ending with newline)
   * Returns only newly completed lines since last commit
   */
  commitCompleteLines(): string[] {
    if (!this.buffer.includes('\n')) {
      return [];
    }

    // Process markdown content
    const processedBuffer = processMarkdownForStreaming(this.buffer);
    
    // Don't commit if inside unclosed fence
    if (isInsideUnclosedfence(processedBuffer)) {
      return [];
    }

    const lines = processedBuffer.split('\n');
    let completeLineCount = processedBuffer.endsWith('\n') ? lines.length - 1 : lines.length - 1;
    
    // Remove trailing blank lines from consideration
    while (completeLineCount > 0 && lines[completeLineCount - 1].trim() === '') {
      completeLineCount--;
    }

    if (this.committedLineCount >= completeLineCount) {
      return [];
    }

    // Get only newly completed lines
    const newLines = lines.slice(this.committedLineCount, completeLineCount);
    this.committedLineCount = completeLineCount;
    
    return newLines;
  }

  /**
   * Finalize the stream and return all remaining content
   */
  finalizeAndDrain(): string[] {
    if (!this.hasSeenDelta || !this.buffer) {
      return [];
    }

    // Ensure buffer ends with newline for final processing
    let finalBuffer = this.buffer;
    if (!finalBuffer.endsWith('\n')) {
      finalBuffer += '\n';
    }

    const lines = finalBuffer.split('\n').slice(0, -1); // Remove empty last element
    const remainingLines = lines.slice(this.committedLineCount);
    
    this.clear();
    return remainingLines;
  }

  /**
   * Replace buffer content (used for full final messages)
   */
  replaceWithAndMarkCommitted(content: string, committedCount: number): void {
    this.buffer = content;
    this.committedLineCount = committedCount;
  }

  getCommittedCount(): number {
    return this.committedLineCount;
  }

  hasContent(): boolean {
    return this.buffer.length > 0;
  }
}

export interface AnimationStep {
  linesToAdd: string[];
  isComplete: boolean;
}

/**
 * Line-by-line animation streamer
 * Queues completed lines and animates them one at a time
 */
export class AnimatedLineStreamer {
  private queue: string[] = [];

  clear(): void {
    this.queue = [];
  }

  enqueue(lines: string[]): void {
    this.queue.push(...lines);
  }

  /**
   * Step animation - returns one line per step
   */
  step(): AnimationStep {
    const line = this.queue.shift();
    return {
      linesToAdd: line ? [line] : [],
      isComplete: this.queue.length === 0
    };
  }

  /**
   * Drain all remaining lines immediately
   */
  drainAll(): AnimationStep {
    const allLines = [...this.queue];
    this.queue = [];
    return {
      linesToAdd: allLines,
      isComplete: true
    };
  }

  isEmpty(): boolean {
    return this.queue.length === 0;
  }

  size(): number {
    return this.queue.length;
  }
}