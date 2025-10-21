// This is a simple event emitter.
// It's used to decouple the error source from the error handler.

type Listener<T> = (data: T) => void;

class EventEmitter<TEventData> {
  private listener: Listener<TEventData> | null = null;

  on(listener: Listener<TEventData>) {
    this.listener = listener;
  }

  off(listener: Listener<TEventData>) {
    if (this.listener === listener) {
      this.listener = null;
    }
  }

  emit(channel: string, data: TEventData) {
    if (this.listener) {
      this.listener(data);
    }
  }
}

export const errorEmitter = new EventEmitter<any>();
