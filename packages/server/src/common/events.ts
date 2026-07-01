import {EventEmitter} from "node:events";

export interface AppEvents {
  "app:started": {port: number};
  "app:stopping": {reason: string};
}

type EventName = keyof AppEvents;
type EventHandler<Name extends EventName> = (payload: AppEvents[Name]) => void;

const emitter = new EventEmitter();

export const appEvents = {
  emit<Name extends EventName>(name: Name, payload: AppEvents[Name]) {
    emitter.emit(name, payload);
  },
  on<Name extends EventName>(name: Name, handler: EventHandler<Name>) {
    emitter.on(name, handler);
    return () => emitter.off(name, handler);
  },
  once<Name extends EventName>(name: Name, handler: EventHandler<Name>) {
    emitter.once(name, handler);
    return () => emitter.off(name, handler);
  },
};
