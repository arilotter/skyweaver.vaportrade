import useWS, { ReadyState } from "react-use-websocket";
import { VTMessage } from "../../shared";

export function useWebSocket(url: string): WebSocketHook {
  return useWS(url, {
    shouldReconnect: () => true,
  }) as unknown as WebSocketHook;
}
type SendJsonMessage = (jsonMessage: VTMessage, keep?: boolean) => void;
type WebSocketHook = {
  sendJsonMessage: SendJsonMessage;
  lastJsonMessage: object | Array<any> | null;
  readyState: ReadyState;
};
