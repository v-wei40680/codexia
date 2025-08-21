/**
 * Stream Controller - coordinates markdown streaming and animation
 * Based on codex CLI's StreamController implementation
 */

import { MarkdownStreamCollector, AnimatedLineStreamer, AnimationStep } from './streamingCollector';

export interface StreamControllerSink {
  insertLines(lines: string[]): void;
  startAnimation(): void;
  stopAnimation(): void;
}

export class StreamController {
  private collector: MarkdownStreamCollector;
  private streamer: AnimatedLineStreamer;
  private isActive: boolean = false;
  private isFinishingAfterDrain: boolean = false;
  private animationTimer: NodeJS.Timeout | null = null;
  private sink: StreamControllerSink | null = null;

  constructor() {
    this.collector = new MarkdownStreamCollector();
    this.streamer = new AnimatedLineStreamer();
  }

  /**
   * Begin a new stream
   */
  begin(sink: StreamControllerSink): void {
    this.sink = sink;
    this.isActive = true;
    this.isFinishingAfterDrain = false;
  }

  /**
   * Push a delta and maybe commit completed lines
   */
  pushAndMaybeCommit(delta: string): void {
    if (!this.isActive || !this.sink) return;

    this.collector.pushDelta(delta);
    
    // If delta contains newline, commit completed lines and start animation
    if (delta.includes('\n')) {
      const newlyCompleted = this.collector.commitCompleteLines();
      if (newlyCompleted.length > 0) {
        this.streamer.enqueue(newlyCompleted);
        this.startCommitAnimation();
      }
    }
  }

  /**
   * Finalize the stream
   */
  finalize(flushImmediately: boolean = false): boolean {
    if (!this.isActive || !this.sink) return false;

    const remaining = this.collector.finalizeAndDrain();
    
    if (flushImmediately) {
      // Drain everything immediately
      const allLines = [...remaining];
      if (this.streamer.size() > 0) {
        const drainResult = this.streamer.drainAll();
        allLines.unshift(...drainResult.linesToAdd);
      }
      
      if (allLines.length > 0) {
        this.sink.insertLines(allLines);
      }
      
      this.cleanup();
      return true;
    } else {
      // Queue remaining lines for animation
      if (remaining.length > 0) {
        this.streamer.enqueue(remaining);
      }
      this.isFinishingAfterDrain = true;
      this.startCommitAnimation();
      return false;
    }
  }

  /**
   * Apply a complete final message
   */
  applyFinalAnswer(message: string): boolean {
    if (!this.sink) return false;
    
    this.begin(this.sink);
    
    // Only inject if we haven't seen any deltas
    if (!this.collector.hasContent() && message) {
      let normalizedMessage = message;
      if (!normalizedMessage.endsWith('\n')) {
        normalizedMessage += '\n';
      }
      
      const committedCount = this.collector.getCommittedCount();
      this.collector.replaceWithAndMarkCommitted(normalizedMessage, committedCount);
    }
    
    return this.finalize(true);
  }

  /**
   * Clear all state
   */
  clearAll(): void {
    this.stopCommitAnimation();
    this.collector.clear();
    this.streamer.clear();
    this.isActive = false;
    this.isFinishingAfterDrain = false;
  }

  private startCommitAnimation(): void {
    if (!this.animationTimer && !this.streamer.isEmpty()) {
      this.sink?.startAnimation();
      
      // Animation timing - one line per tick (similar to codex CLI)
      this.animationTimer = setInterval(() => {
        this.onCommitTick();
      }, 50); // 50ms per line for smooth animation
    }
  }

  private stopCommitAnimation(): void {
    if (this.animationTimer) {
      clearInterval(this.animationTimer);
      this.animationTimer = null;
      this.sink?.stopAnimation();
    }
  }

  private onCommitTick(): void {
    if (!this.isActive || !this.sink) return;

    const step = this.streamer.step();
    
    if (step.linesToAdd.length > 0) {
      this.sink.insertLines(step.linesToAdd);
    }
    
    if (step.isComplete) {
      this.stopCommitAnimation();
      
      if (this.isFinishingAfterDrain) {
        this.cleanup();
      }
    }
  }

  private cleanup(): void {
    this.stopCommitAnimation();
    this.collector.clear();
    this.streamer.clear();
    this.isActive = false;
    this.isFinishingAfterDrain = false;
  }

  isWriteCycleActive(): boolean {
    return this.isActive;
  }
}