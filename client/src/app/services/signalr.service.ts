import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { ChatMessage, ConnectionState, LogEntry, UserJoinedEvent, UserLeftEvent } from '../models/signalr.models';

@Injectable({
  providedIn: 'root'
})
export class SignalrService {
  private hubConnection?: signalR.HubConnection;
  private connectionStateSubject = new BehaviorSubject<ConnectionState>({ isConnected: false });
  private messagesSubject = new Subject<ChatMessage>();
  private userJoinedSubject = new Subject<UserJoinedEvent>();
  private userLeftSubject = new Subject<UserLeftEvent>();
  private logsSubject = new BehaviorSubject<LogEntry[]>([]);
  private logs: LogEntry[] = [];

  public connectionState$ = this.connectionStateSubject.asObservable();
  public messages$ = this.messagesSubject.asObservable();
  public userJoined$ = this.userJoinedSubject.asObservable();
  public userLeft$ = this.userLeftSubject.asObservable();
  public logs$ = this.logsSubject.asObservable();

  private apiBaseUrl = 'http://localhost:7071/api';
  private currentUserId?: string;
  private currentGroup?: string;

  constructor() {
    this.addLog('info', 'SignalR Service initialized');
  }

  async connect(userId: string): Promise<void> {
    try {
      this.currentUserId = userId;
      this.addLog('info', `Starting connection for user: ${userId}`);

      // Get connection info from negotiate function with userId
      const response = await fetch(`${this.apiBaseUrl}/negotiate?userId=${encodeURIComponent(userId)}`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error(`Failed to negotiate: ${response.statusText}`);
      }

      const connectionInfo = await response.json();
      this.addLog('debug', 'Received connection info', connectionInfo);

      // Build connection with logging
      this.hubConnection = new signalR.HubConnectionBuilder()
        .withUrl(connectionInfo.url, {
          accessTokenFactory: () => connectionInfo.accessToken
        })
        .configureLogging(signalR.LogLevel.Information)
        .withAutomaticReconnect({
          nextRetryDelayInMilliseconds: retryContext => {
            // Exponential backoff with max 30 seconds
            const delay = Math.min(1000 * Math.pow(2, retryContext.previousRetryCount), 30000);
            this.addLog('warn', `Reconnecting in ${delay}ms (attempt ${retryContext.previousRetryCount + 1})`);
            return delay;
          }
        })
        .build();

      // Setup event handlers
      this.setupEventHandlers();

      // Start connection
      await this.hubConnection.start();
      this.addLog('info', 'SignalR connection established successfully', {
        connectionId: this.hubConnection.connectionId
      });

      this.connectionStateSubject.next({
        isConnected: true,
        connectionId: this.hubConnection.connectionId
      });

    } catch (error) {
      this.addLog('error', 'Failed to connect to SignalR', error);
      this.connectionStateSubject.next({
        isConnected: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  private setupEventHandlers(): void {
    if (!this.hubConnection) return;

    // Handle new messages
    this.hubConnection.on('newMessage', (message: ChatMessage) => {
      this.addLog('info', 'Received message', message);
      this.messagesSubject.next(message);
    });

    // Handle user joined
    this.hubConnection.on('userJoined', (event: UserJoinedEvent) => {
      this.addLog('info', 'User joined', event);
      this.userJoinedSubject.next(event);
    });

    // Handle user left
    this.hubConnection.on('userLeft', (event: UserLeftEvent) => {
      this.addLog('info', 'User left', event);
      this.userLeftSubject.next(event);
    });

    // Connection state handlers
    this.hubConnection.onreconnecting((error) => {
      this.addLog('warn', 'Connection lost, reconnecting...', error);
      this.connectionStateSubject.next({
        isConnected: false,
        error: 'Reconnecting...'
      });
    });

    this.hubConnection.onreconnected((connectionId) => {
      this.addLog('info', 'Reconnected successfully', { connectionId });
      this.connectionStateSubject.next({
        isConnected: true,
        connectionId: connectionId
      });
    });

    this.hubConnection.onclose((error) => {
      this.addLog('error', 'Connection closed', error);
      this.connectionStateSubject.next({
        isConnected: false,
        error: error ? error.message : 'Connection closed'
      });
    });
  }

  async joinGroup(groupName: string): Promise<void> {
    try {
      if (!this.currentUserId) {
        throw new Error('User not connected');
      }

      this.addLog('info', `Joining group: ${groupName}`);
      this.currentGroup = groupName;

      const response = await fetch(`${this.apiBaseUrl}/joinGroup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          groupName: groupName,
          userId: this.currentUserId
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to join group: ${response.statusText}`);
      }

      const result = await response.json();
      this.addLog('info', 'Successfully joined group', result);

    } catch (error) {
      this.addLog('error', 'Failed to join group', error);
      throw error;
    }
  }

  async leaveGroup(groupName: string): Promise<void> {
    try {
      if (!this.currentUserId) {
        throw new Error('User not connected');
      }

      this.addLog('info', `Leaving group: ${groupName}`);

      const response = await fetch(`${this.apiBaseUrl}/leaveGroup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          groupName: groupName,
          userId: this.currentUserId
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to leave group: ${response.statusText}`);
      }

      const result = await response.json();
      this.addLog('info', 'Successfully left group', result);
      
      if (this.currentGroup === groupName) {
        this.currentGroup = undefined;
      }

    } catch (error) {
      this.addLog('error', 'Failed to leave group', error);
      throw error;
    }
  }

  async sendMessage(groupName: string, message: string): Promise<void> {
    try {
      if (!this.currentUserId) {
        throw new Error('User not connected');
      }

      this.addLog('info', `Sending message to group: ${groupName}`, { message });

      const response = await fetch(`${this.apiBaseUrl}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          groupName: groupName,
          message: message,
          sender: this.currentUserId
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.statusText}`);
      }

      const result = await response.json();
      this.addLog('info', 'Message sent successfully', result);

    } catch (error) {
      this.addLog('error', 'Failed to send message', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.currentGroup && this.currentUserId) {
        await this.leaveGroup(this.currentGroup);
      }

      if (this.hubConnection) {
        this.addLog('info', 'Disconnecting from SignalR');
        await this.hubConnection.stop();
        this.hubConnection = undefined;
      }

      this.connectionStateSubject.next({ isConnected: false });
      this.currentUserId = undefined;
      this.currentGroup = undefined;

    } catch (error) {
      this.addLog('error', 'Error during disconnect', error);
      throw error;
    }
  }

  private addLog(level: LogEntry['level'], message: string, details?: any): void {
    const log: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      details
    };
    
    this.logs.push(log);
    
    // Keep only last 100 logs
    if (this.logs.length > 100) {
      this.logs.shift();
    }
    
    this.logsSubject.next([...this.logs]);
    
    // Also log to console
    const consoleMessage = `[${log.timestamp}] ${level.toUpperCase()}: ${message}`;
    switch (level) {
      case 'error':
        console.error(consoleMessage, details);
        break;
      case 'warn':
        console.warn(consoleMessage, details);
        break;
      case 'debug':
        console.debug(consoleMessage, details);
        break;
      default:
        console.log(consoleMessage, details);
    }
  }

  clearLogs(): void {
    this.logs = [];
    this.logsSubject.next([]);
  }

  getConnectionInfo(): { userId?: string; group?: string; connectionId?: string | null } {
    return {
      userId: this.currentUserId,
      group: this.currentGroup,
      connectionId: this.hubConnection?.connectionId
    };
  }

  // Simulate connection issues for testing
  async simulateConnectionIssue(): Promise<void> {
    this.addLog('warn', 'Simulating connection issue - stopping connection');
    if (this.hubConnection) {
      await this.hubConnection.stop();
    }
  }

  // Simulate throttling by sending many messages quickly
  async simulateThrottling(groupName: string, messageCount: number = 100): Promise<void> {
    this.addLog('warn', `Simulating throttling - sending ${messageCount} messages rapidly`);
    
    const promises: Promise<void>[] = [];
    for (let i = 0; i < messageCount; i++) {
      promises.push(this.sendMessage(groupName, `Throttle test message ${i + 1}`));
    }
    
    try {
      await Promise.all(promises);
      this.addLog('info', 'Throttling simulation completed');
    } catch (error) {
      this.addLog('error', 'Throttling simulation failed (this may indicate throttling is active)', error);
    }
  }

  setApiBaseUrl(url: string): void {
    this.apiBaseUrl = url;
    this.addLog('info', `API base URL updated to: ${url}`);
  }
}
