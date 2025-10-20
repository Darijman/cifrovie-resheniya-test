type Task = () => Promise<void>;
export class RequestQueue {
  private queue = new Map<string, Task>();
  private isFlushing = false;
  private timer: NodeJS.Timeout | null = null;

  constructor(private name: string, private flushDelayMs: number) {
    this.scheduleNextFlush();
  }

  add(key: string, task: Task) {
    this.queue.set(key, task);
  }

  /** Немедленный запуск — безопасно */
  async flushNow() {
    if (this.isFlushing) return; // не рекурсить
    await this.flush();
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
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(async () => {
      await this.flush();
      this.scheduleNextFlush();
    }, this.flushDelayMs);
  }
}
