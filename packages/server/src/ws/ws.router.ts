import {sendMessage, type MessageContext} from "./socket";
import type {
  ClientMessage,
  ClientMessageOf,
  ClientMessageType,
} from "./ws.messages";

export type WsHandler<T extends ClientMessageType> = (
  context: MessageContext,
  message: ClientMessageOf<T>,
) => Promise<void>;

export const createSocketRouter = () => {
  const handlerMap = new Map<string, WsHandler<any>>();

  const on = <T extends ClientMessage["type"]>(
    type: T,
    handler: WsHandler<T>,
  ) => {
    handlerMap.set(type, handler);
  };

  const dispatch = async (context: MessageContext, message: ClientMessage) => {
    const handler = handlerMap.get(message.type);

    if (!handler) {
      throw new Error(`No handler exists for ${message.type}`);
    }

    await handler(context, message);
  };
  return {
    on,
    dispatch,
  };
};
