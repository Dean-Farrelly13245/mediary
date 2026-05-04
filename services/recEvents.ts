type Handler = () => void;

const handlers = new Set<Handler>();

export const recEvents = {
  emit() {
    handlers.forEach((h) => h());
  },
  on(handler: Handler) {
    handlers.add(handler);
  },
  off(handler: Handler) {
    handlers.delete(handler);
  },
};
