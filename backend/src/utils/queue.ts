type Task = () => Promise<void>;

export class RequestQueue {
  private queue = new Map<string, Task>();
  private isFlushing = false;

  constructor(
    private name: string,
    private flushDelayMs: number,
  ) {
    this.scheduleNextFlush();
  }

  add(key: string, task: Task) {
    this.queue.set(key, task);
  }

  private async flush() {
    if (this.isFlushing || this.queue.size === 0) return;

    this.isFlushing = true;
    const tasks = Array.from(this.queue.entries());
    this.queue.clear();

    for (const [key, task] of tasks) {
      try {
        await task();
      } catch (err) {
        console.error(`❌ Queue "${this.name}" task "${key}" failed:`, err);
      }
    }

    this.isFlushing = false;
  }

  private scheduleNextFlush() {
    setTimeout(async () => {
      await this.flush();
      this.scheduleNextFlush();
    }, this.flushDelayMs);
  }
}
