type EventHandler<T = unknown> = (payload: T) => void;

export class EventBus {
  private handlers = new Map<string, EventHandler[]>();

  on<T>(event: string, handler: EventHandler<T>): void {
    const existing = this.handlers.get(event) ?? [];
    existing.push(handler as EventHandler);
    this.handlers.set(event, existing);
  }

  off<T>(event: string, handler: EventHandler<T>): void {
    const existing = this.handlers.get(event) ?? [];
    this.handlers.set(event, existing.filter(h => h !== handler));
  }

  emit<T>(event: string, payload: T): void {
    const handlers = this.handlers.get(event) ?? [];
    for (const h of handlers) {
      try { h(payload); } catch (err) {
        console.error(`[EventBus] handler error for event "${event}":`, err);
      }
    }
  }

  removeAll(event?: string): void {
    if (event) this.handlers.delete(event);
    else this.handlers.clear();
  }
}

export const globalBus = new EventBus();
