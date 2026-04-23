import type { AgentRunEvent } from "@/lib/agent/types";

type Listener = (event: AgentRunEvent) => void;

export class AgentEventBus {
  private readonly events: AgentRunEvent[] = [];
  private readonly listeners = new Set<Listener>();

  emit(event: AgentRunEvent) {
    this.events.push(event);
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  getEvents(): AgentRunEvent[] {
    return [...this.events];
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}
