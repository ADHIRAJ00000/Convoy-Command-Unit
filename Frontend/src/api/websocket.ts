// WebSocket Client for HawkRoute
// Handles real-time updates for convoy positions, events, and alerts

import { getWebSocketURL } from './endpoints';
import { getAccessToken } from './tokenManager';

type WebSocketEventHandler = (data: any) => void;

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private eventHandlers: Map<string, WebSocketEventHandler[]> = new Map();
  private reconnectTimeout: NodeJS.Timeout | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.connect();
    }
  }

  /**
   * Connect to WebSocket server
   */
  connect(): void {
    try {
      const token = getAccessToken();
      const wsUrl = `?token=`;
      
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log(' WebSocket connected');
        this.reconnectAttempts = 0;
        this.emit('connected', { status: 'connected' });
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error('WebSocket message parse error:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.emit('error', { error });
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.emit('disconnected', { status: 'disconnected' });
        this.attemptReconnect();
      };
    } catch (error) {
      console.error('WebSocket connection error:', error);
      this.attemptReconnect();
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(data: any): void {
    const { type, payload } = data;

    // Emit event to all registered handlers
    this.emit(type, payload);

    // Emit to 'all' handlers
    this.emit('all', data);
  }

  /**
   * Attempt to reconnect to WebSocket
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`Reconnecting... Attempt /`);

    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, this.reconnectDelay);
  }

  /**
   * Subscribe to specific event type
   */
  on(eventType: string, handler: WebSocketEventHandler): void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    this.eventHandlers.get(eventType)!.push(handler);
  }

  /**
   * Unsubscribe from event type
   */
  off(eventType: string, handler: WebSocketEventHandler): void {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Emit event to all registered handlers
   */
  private emit(eventType: string, data: any): void {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      handlers.forEach((handler) => handler(data));
    }
  }

  /**
   * Send message to server
   */
  send(type: string, payload: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload }));
    } else {
      console.warn('WebSocket is not connected');
    }
  }

  /**
   * Close WebSocket connection
   */
  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

// Export singleton instance
let wsClient: WebSocketClient | null = null;

export const getWebSocketClient = (): WebSocketClient => {
  if (!wsClient && typeof window !== 'undefined') {
    wsClient = new WebSocketClient();
  }
  return wsClient!;
};

export default getWebSocketClient;

// ============================================
// CONVENIENCE METHODS FOR COMMON EVENTS
// ============================================

/**
 * Subscribe to convoy position updates
 */
export const subscribeToConvoyUpdates = (
  convoyId: string,
  handler: (data: any) => void
): void => {
  const client = getWebSocketClient();
  client.on(`convoy::update`, handler);
};

/**
 * Subscribe to event notifications
 */
export const subscribeToEvents = (handler: (data: any) => void): void => {
  const client = getWebSocketClient();
  client.on('event:new', handler);
};

/**
 * Subscribe to alert notifications
 */
export const subscribeToAlerts = (handler: (data: any) => void): void => {
  const client = getWebSocketClient();
  client.on('alert:new', handler);
};

/**
 * Unsubscribe from convoy updates
 */
export const unsubscribeFromConvoyUpdates = (
  convoyId: string,
  handler: (data: any) => void
): void => {
  const client = getWebSocketClient();
  client.off(`convoy::update`, handler);
};
