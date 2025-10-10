import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { ChatMessage, ConnectionState, LogEntry, UserJoinedEvent, UserLeftEvent, SimulatedUser, UserSimulationStatus } from '../models/signalr.models';

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

  // User simulation properties
  private simulationStatus = new BehaviorSubject<UserSimulationStatus>({
    isRunning: false,
    totalUsers: 0,
    connectedUsers: 0,
    totalMessagesSent: 0,
    totalErrors: 0,
    users: []
  });
  public simulationStatus$ = this.simulationStatus.asObservable();
  private simulatedUsers: Map<string, { connection: signalR.HubConnection; user: SimulatedUser; intervalId?: any }> = new Map();
  private simulationGroupName?: string;

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

  // Simulate 100 users connecting and sending messages
  async startUserSimulation(groupName: string, userCount: number = 100, durationMinutes: number = 5): Promise<void> {
    if (this.simulationStatus.value.isRunning) {
      this.addLog('warn', 'User simulation is already running');
      return;
    }

    this.addLog('info', `Starting simulation: ${userCount} users for ${durationMinutes} minutes in group ${groupName}`);
    this.simulationGroupName = groupName;

    // Initialize status
    const users: SimulatedUser[] = [];
    for (let i = 1; i <= userCount; i++) {
      users.push({
        userId: `user-${i}`,
        isConnected: false,
        messagesSent: 0,
        errors: 0
      });
    }

    this.simulationStatus.next({
      isRunning: true,
      startTime: new Date(),
      totalUsers: userCount,
      connectedUsers: 0,
      totalMessagesSent: 0,
      totalErrors: 0,
      users
    });

    // Connect all users
    for (let i = 1; i <= userCount; i++) {
      const userId = `user-${i}`;
      try {
        await this.connectSimulatedUser(userId, groupName);
      } catch (error) {
        this.addLog('error', `Failed to connect simulated user ${userId}`, error);
        this.updateSimulatedUserError(userId);
      }
    }

    // Stop simulation after duration
    setTimeout(() => {
      this.stopUserSimulation();
    }, durationMinutes * 60 * 1000);
  }

  private async connectSimulatedUser(userId: string, groupName: string): Promise<void> {
    try {
      // Get connection info
      const response = await fetch(`${this.apiBaseUrl}/negotiate?userId=${encodeURIComponent(userId)}`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error(`Failed to negotiate for ${userId}: ${response.statusText}`);
      }

      const connectionInfo = await response.json();

      // Build connection
      const hubConnection = new signalR.HubConnectionBuilder()
        .withUrl(connectionInfo.url, {
          accessTokenFactory: () => connectionInfo.accessToken
        })
        .configureLogging(signalR.LogLevel.Error) // Reduce logging for simulated users
        .withAutomaticReconnect()
        .build();

      // Start connection
      await hubConnection.start();

      // Join group
      const joinResponse = await fetch(`${this.apiBaseUrl}/joinGroup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupName: groupName,
          userId: userId
        })
      });

      if (!joinResponse.ok) {
        throw new Error(`Failed to join group for ${userId}`);
      }

      // Update user status
      const user: SimulatedUser = {
        userId,
        connectionId: hubConnection.connectionId || undefined,
        isConnected: true,
        messagesSent: 0,
        errors: 0
      };

      // Start sending messages every 20 seconds
      const intervalId = setInterval(async () => {
        await this.sendSimulatedUserMessage(userId, groupName);
      }, 20000); // 20 seconds

      this.simulatedUsers.set(userId, { connection: hubConnection, user, intervalId });
      this.updateSimulationStatus();
      
      this.addLog('debug', `Simulated user ${userId} connected`);
    } catch (error) {
      this.addLog('error', `Failed to connect simulated user ${userId}`, error);
      this.updateSimulatedUserError(userId);
      throw error;
    }
  }

  private async sendSimulatedUserMessage(userId: string, groupName: string): Promise<void> {
    const simulatedUser = this.simulatedUsers.get(userId);
    if (!simulatedUser || !this.simulationStatus.value.isRunning) {
      return;
    }

    try {
      const message = `Hello from ${userId}! This is an automated message.`;
      
      const response = await fetch(`${this.apiBaseUrl}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupName: groupName,
          message: message,
          sender: userId
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to send message for ${userId}: ${response.statusText}`);
      }

      // Update user stats
      simulatedUser.user.messagesSent++;
      simulatedUser.user.lastMessageTime = new Date();
      this.updateSimulationStatus();
      
    } catch (error) {
      this.addLog('error', `Failed to send message for ${userId}`, error);
      simulatedUser.user.errors++;
      this.updateSimulatedUserError(userId);
    }
  }

  private updateSimulatedUserError(userId: string): void {
    const status = this.simulationStatus.value;
    const user = status.users.find(u => u.userId === userId);
    if (user) {
      user.errors++;
      this.simulationStatus.next({
        ...status,
        totalErrors: status.totalErrors + 1
      });
    }
  }

  private updateSimulationStatus(): void {
    const status = this.simulationStatus.value;
    const users: SimulatedUser[] = [];
    let connectedUsers = 0;
    let totalMessagesSent = 0;
    let totalErrors = 0;

    status.users.forEach(u => {
      const simulatedUser = this.simulatedUsers.get(u.userId);
      if (simulatedUser) {
        users.push(simulatedUser.user);
        if (simulatedUser.user.isConnected) connectedUsers++;
        totalMessagesSent += simulatedUser.user.messagesSent;
        totalErrors += simulatedUser.user.errors;
      } else {
        users.push(u);
        totalErrors += u.errors;
      }
    });

    this.simulationStatus.next({
      ...status,
      connectedUsers,
      totalMessagesSent,
      totalErrors,
      users
    });
  }

  async stopUserSimulation(): Promise<void> {
    if (!this.simulationStatus.value.isRunning) {
      return;
    }

    this.addLog('info', 'Stopping user simulation...');

    // Stop all message intervals and disconnect users
    for (const [userId, { connection, intervalId }] of this.simulatedUsers.entries()) {
      try {
        // Clear interval
        if (intervalId) {
          clearInterval(intervalId);
        }

        // Leave group
        if (this.simulationGroupName) {
          await fetch(`${this.apiBaseUrl}/leaveGroup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              groupName: this.simulationGroupName,
              userId: userId
            })
          });
        }

        // Disconnect
        await connection.stop();
      } catch (error) {
        this.addLog('error', `Error disconnecting simulated user ${userId}`, error);
      }
    }

    this.simulatedUsers.clear();
    
    const finalStatus = this.simulationStatus.value;
    this.addLog('info', `User simulation stopped. Messages sent: ${finalStatus.totalMessagesSent}, Errors: ${finalStatus.totalErrors}`);
    
    this.simulationStatus.next({
      ...finalStatus,
      isRunning: false,
      connectedUsers: 0
    });
  }
}
