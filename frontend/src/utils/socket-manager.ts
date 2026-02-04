import io, { Socket } from "socket.io-client";
import { useState, useEffect } from "react";

/**
 * Socket Connection Manager
 * Handles WebSocket connections with automatic reconnection, 
 * exponential backoff, and connection state management.
 * 
 * Optimized for handling network instability and high-traffic scenarios.
 */

export type ConnectionState = 
  | 'connecting' 
  | 'connected' 
  | 'disconnected' 
  | 'reconnecting' 
  | 'error';

export interface ConnectionConfig {
  url: string;
  autoConnect?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
  reconnectionDelayMax?: number;
  timeout?: number;
  onStateChange?: (state: ConnectionState) => void;
  onError?: (error: Error) => void;
}

const DEFAULT_CONFIG: Partial<ConnectionConfig> = {
  autoConnect: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 30000,
  timeout: 20000,
};

export class SocketConnectionManager {
  private socket: Socket | null = null;
  private config: ConnectionConfig;
  private state: ConnectionState = 'disconnected';
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private eventHandlers: Map<string, Set<(...args: unknown[]) => void>> = new Map();
  private pendingEmits: Array<{ event: string; data: unknown }> = [];

  constructor(config: ConnectionConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Connect to the socket server
   */
  connect(): Socket {
    if (this.socket?.connected) {
      return this.socket;
    }

    this.updateState('connecting');

    this.socket = io(this.config.url, {
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: this.config.reconnectionAttempts,
      reconnectionDelay: this.config.reconnectionDelay,
      reconnectionDelayMax: this.config.reconnectionDelayMax,
      timeout: this.config.timeout,
      transports: ['websocket', 'polling'],
      autoConnect: false,
    });

    this.setupEventListeners();
    this.socket.connect();

    return this.socket;
  }

  /**
   * Disconnect from the server
   */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.updateState('disconnected');
    this.reconnectAttempts = 0;
  }

  /**
   * Get the current socket instance
   */
  getSocket(): Socket | null {
    return this.socket;
  }

  /**
   * Get connection state
   */
  getState(): ConnectionState {
    return this.state;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.state === 'connected' && this.socket?.connected === true;
  }

  /**
   * Emit an event (queues if disconnected)
   */
  emit(event: string, data: unknown): void {
    if (this.isConnected() && this.socket) {
      this.socket.emit(event, data);
    } else {
      // Queue the emit for when we reconnect
      this.pendingEmits.push({ event, data });
      
      // Limit pending queue size
      if (this.pendingEmits.length > 100) {
        this.pendingEmits.shift();
      }
    }
  }

  /**
   * Register an event handler
   */
  on(event: string, handler: (...args: unknown[]) => void): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);

    // If socket exists, add the listener
    if (this.socket) {
      this.socket.on(event, handler);
    }
  }

  /**
   * Remove an event handler
   */
  off(event: string, handler: (...args: unknown[]) => void): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
    
    if (this.socket) {
      this.socket.off(event, handler);
    }
  }

  /**
   * Set up internal event listeners
   */
  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this.updateState('connected');
      this.reconnectAttempts = 0;
      
      // Re-register all event handlers
      for (const [event, handlers] of this.eventHandlers) {
        for (const handler of handlers) {
          this.socket?.on(event, handler);
        }
      }
      
      // Send pending emits
      this.flushPendingEmits();
    });

    this.socket.on('disconnect', (reason) => {
      this.updateState('disconnected');
      
      if (reason === 'io server disconnect') {
        // Server disconnected us, try to reconnect manually
        this.attemptReconnect();
      }
      // For other reasons, socket.io will handle reconnection
    });

    this.socket.on('connect_error', (error) => {
      this.updateState('error');
      this.config.onError?.(error);
      
      // Manual reconnection with exponential backoff
      this.attemptReconnect();
    });

    this.socket.io.on('reconnect', () => {
      this.updateState('connected');
      this.reconnectAttempts = 0;
    });

    this.socket.io.on('reconnect_attempt', () => {
      this.updateState('reconnecting');
    });

    this.socket.io.on('reconnect_failed', () => {
      this.updateState('error');
    });
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  private attemptReconnect(): void {
    if (this.reconnectTimer) {
      return; // Already attempting
    }

    if (this.reconnectAttempts >= (this.config.reconnectionAttempts || 10)) {
      this.updateState('error');
      return;
    }

    this.updateState('reconnecting');
    this.reconnectAttempts++;

    // Calculate delay with exponential backoff
    const baseDelay = this.config.reconnectionDelay || 1000;
    const maxDelay = this.config.reconnectionDelayMax || 30000;
    const delay = Math.min(
      baseDelay * Math.pow(2, this.reconnectAttempts - 1),
      maxDelay
    );

    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.3 * delay;
    const finalDelay = delay + jitter;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      
      if (this.socket && !this.socket.connected) {
        this.socket.connect();
      }
    }, finalDelay);
  }

  /**
   * Flush pending emits after reconnection
   */
  private flushPendingEmits(): void {
    if (!this.socket || !this.socket.connected) return;

    while (this.pendingEmits.length > 0) {
      const { event, data } = this.pendingEmits.shift()!;
      this.socket.emit(event, data);
    }
  }

  /**
   * Update connection state
   */
  private updateState(newState: ConnectionState): void {
    if (this.state !== newState) {
      this.state = newState;
      this.config.onStateChange?.(newState);
    }
  }
}

// Singleton instance for the app
let connectionManager: SocketConnectionManager | null = null;

/**
 * Get or create the socket connection manager
 */
export function getConnectionManager(url?: string): SocketConnectionManager {
  if (!connectionManager && url) {
    connectionManager = new SocketConnectionManager({ url });
  }
  
  if (!connectionManager) {
    throw new Error('Connection manager not initialized. Call with URL first.');
  }
  
  return connectionManager;
}

/**
 * Initialize the connection manager with configuration
 */
export function initConnectionManager(config: ConnectionConfig): SocketConnectionManager {
  if (connectionManager) {
    connectionManager.disconnect();
  }
  
  connectionManager = new SocketConnectionManager(config);
  return connectionManager;
}

/**
 * React hook for managing socket connection state
 */
export function useConnectionState(socket: Socket | null): {
  isConnected: boolean;
  connectionState: ConnectionState;
} {
  const [isConnected, setIsConnected] = useState(socket?.connected ?? false);
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    socket?.connected ? 'connected' : 'disconnected'
  );

  useEffect(() => {
    if (!socket) return;

    const handleConnect = () => {
      setIsConnected(true);
      setConnectionState('connected');
    };

    const handleDisconnect = () => {
      setIsConnected(false);
      setConnectionState('disconnected');
    };

    const handleConnectError = () => {
      setIsConnected(false);
      setConnectionState('error');
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
    };
  }, [socket]);

  return { isConnected, connectionState };
}
