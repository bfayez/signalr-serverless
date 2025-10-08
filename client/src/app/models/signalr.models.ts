export interface ChatMessage {
  sender: string;
  message: string;
  timestamp: string;
}

export interface UserJoinedEvent {
  userId: string;
  timestamp: string;
}

export interface UserLeftEvent {
  userId: string;
  timestamp: string;
}

export interface ConnectionState {
  isConnected: boolean;
  connectionId?: string | null;
  error?: string;
}

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  details?: any;
}
