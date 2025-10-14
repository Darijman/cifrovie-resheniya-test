type Task = () => Promise<void>;

export class RequestQueue {
  private queue = new Map<string, Task>();
  private interval: NodeJS.Timeout;

  constructor(private name: string, private flushDelayMs: number) {
    this.interval = setInterval(() => this.flush(), flushDelayMs);
  }

  add(key: string, task: Task) {
    this.queue.set(key, task);
  }

  private async flush() {
    if (!this.queue.size) return;
    
    const tasks = Array.from(this.queue.values());
    this.queue.clear();
    for (const task of tasks) {
      try {
        await task();
      } catch (err) {
        console.error(`❌ Queue ${this.name} task failed`, err);
      }
    }
  }
}
