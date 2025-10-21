
// This is a simple event emitter.
// It's used to decouple the error source from the error handler.

type Listener<T> = (data: T) => void;

class EventEmitter<T> {
  private listeners: Set<Listener<T>> = new Set();

  on(listener: Listener<T>) {
    this.listeners.add(listener);
  }

  off(listener: Listener<T>) {
    this.listeners.delete(listener);
  }

  emit(data: T) {
    this.listeners.forEach(listener => listener(data));
  }
}

export const errorEmitter = new EventEmitter<any>();
