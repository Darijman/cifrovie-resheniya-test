type Task = () => Promise<void>;

export class RequestQueue {
  private queue = new Map<string, Task>();
  private interval: NodeJS.Timeout;

  constructor(private name: string, private flushDelayMs: number) {
    this.interval = setInterval(() => this.flush(), flushDelayMs);
  }

  add(key: string, task: Task) {
    // Дедупликация — одинаковые ключи заменяются
    this.queue.set(key, task);
  }

  private async flush() {
    if (this.queue.size === 0) return;
    console.log(`🌀 Flushing ${this.queue.size} tasks from ${this.name}`);

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
