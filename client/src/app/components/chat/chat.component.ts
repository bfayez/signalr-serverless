import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SignalrService } from '../../services/signalr.service';
import { HealthService, HealthStatus } from '../../services/health.service';
import { ChatMessage, ConnectionState, LogEntry, UserSimulationStatus } from '../../models/signalr.models';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})
export class ChatComponent implements OnInit, OnDestroy {
  userId = '';
  groupName = '';
  messageText = '';
  apiUrl = 'http://localhost:7071/api';
  
  isConnected = false;
  currentGroup?: string;
  messages: ChatMessage[] = [];
  logs: LogEntry[] = [];
  healthStatus?: HealthStatus;
  
  showLogs = false;
  showHealth = false;
  showDiagnostics = false;
  
  // User simulation properties
  simulationStatus?: UserSimulationStatus;
  simulationUserCount = 100;
  simulationDuration = 5;
  
  private subscriptions: Subscription[] = [];

  constructor(
    private signalrService: SignalrService,
    private healthService: HealthService
  ) {}

  ngOnInit(): void {
    // Subscribe to connection state
    this.subscriptions.push(
      this.signalrService.connectionState$.subscribe((state: ConnectionState) => {
        this.isConnected = state.isConnected;
      })
    );

    // Subscribe to messages
    this.subscriptions.push(
      this.signalrService.messages$.subscribe((message: ChatMessage) => {
        this.messages.push(message);
      })
    );

    // Subscribe to user joined events
    this.subscriptions.push(
      this.signalrService.userJoined$.subscribe((event) => {
        this.messages.push({
          sender: 'System',
          message: `${event.userId} joined the group`,
          timestamp: event.timestamp
        });
      })
    );

    // Subscribe to user left events
    this.subscriptions.push(
      this.signalrService.userLeft$.subscribe((event) => {
        this.messages.push({
          sender: 'System',
          message: `${event.userId} left the group`,
          timestamp: event.timestamp
        });
      })
    );

    // Subscribe to logs
    this.subscriptions.push(
      this.signalrService.logs$.subscribe((logs: LogEntry[]) => {
        this.logs = logs;
      })
    );

    // Subscribe to health status
    this.subscriptions.push(
      this.healthService.healthStatus$.subscribe((status) => {
        if (status) {
          this.healthStatus = status;
        }
      })
    );

    // Subscribe to simulation status
    this.subscriptions.push(
      this.signalrService.simulationStatus$.subscribe((status) => {
        this.simulationStatus = status;
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.disconnect();
  }

  async connect(): Promise<void> {
    try {
      if (!this.userId.trim()) {
        alert('Please enter a user ID');
        return;
      }

      // Update API URL if changed
      if (this.apiUrl) {
        this.signalrService.setApiBaseUrl(this.apiUrl);
        this.healthService.setApiBaseUrl(this.apiUrl);
      }

      await this.signalrService.connect(this.userId);
    } catch (error) {
      console.error('Connection error:', error);
      alert('Failed to connect. Check console for details.');
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.signalrService.disconnect();
      this.currentGroup = undefined;
      this.messages = [];
    } catch (error) {
      console.error('Disconnect error:', error);
    }
  }

  async joinGroup(): Promise<void> {
    try {
      if (!this.groupName.trim()) {
        alert('Please enter a group name');
        return;
      }

      await this.signalrService.joinGroup(this.groupName);
      this.currentGroup = this.groupName;
    } catch (error) {
      console.error('Join group error:', error);
      alert('Failed to join group. Check console for details.');
    }
  }

  async leaveGroup(): Promise<void> {
    try {
      if (!this.currentGroup) {
        return;
      }

      await this.signalrService.leaveGroup(this.currentGroup);
      this.currentGroup = undefined;
      this.messages = [];
    } catch (error) {
      console.error('Leave group error:', error);
      alert('Failed to leave group. Check console for details.');
    }
  }

  async sendMessage(): Promise<void> {
    try {
      if (!this.messageText.trim() || !this.currentGroup) {
        return;
      }

      await this.signalrService.sendMessage(this.currentGroup, this.messageText);
      this.messageText = '';
    } catch (error) {
      console.error('Send message error:', error);
      alert('Failed to send message. Check console for details.');
    }
  }

  async checkHealth(): Promise<void> {
    try {
      await this.healthService.checkHealth();
      this.showHealth = true;
    } catch (error) {
      console.error('Health check error:', error);
      alert('Failed to check health. Check console for details.');
    }
  }

  async simulateConnectionIssue(): Promise<void> {
    if (confirm('This will simulate a connection issue by stopping the connection. Continue?')) {
      await this.signalrService.simulateConnectionIssue();
    }
  }

  async simulateThrottling(): Promise<void> {
    if (!this.currentGroup) {
      alert('Please join a group first');
      return;
    }

    if (confirm('This will send 100 messages rapidly to simulate throttling. Continue?')) {
      try {
        await this.signalrService.simulateThrottling(this.currentGroup, 100);
        alert('Throttling simulation completed. Check logs for any throttling errors.');
      } catch (error) {
        console.error('Throttling simulation error:', error);
      }
    }
  }

  clearLogs(): void {
    this.signalrService.clearLogs();
  }

  toggleLogs(): void {
    this.showLogs = !this.showLogs;
  }

  toggleHealth(): void {
    this.showHealth = !this.showHealth;
  }

  toggleDiagnostics(): void {
    this.showDiagnostics = !this.showDiagnostics;
  }

  getLogClass(level: string): string {
    switch (level) {
      case 'error': return 'log-error';
      case 'warn': return 'log-warn';
      case 'debug': return 'log-debug';
      default: return 'log-info';
    }
  }

  getHealthStatusClass(): string {
    if (!this.healthStatus) return '';
    
    switch (this.healthStatus.status) {
      case 'healthy': return 'health-healthy';
      case 'degraded': return 'health-degraded';
      case 'unhealthy': return 'health-unhealthy';
      default: return '';
    }
  }

  async startUserSimulation(): Promise<void> {
    if (!this.currentGroup) {
      alert('Please join a group first');
      return;
    }

    if (this.simulationStatus?.isRunning) {
      alert('User simulation is already running');
      return;
    }

    const confirmed = confirm(
      `This will simulate ${this.simulationUserCount} users connecting to group "${this.currentGroup}" and sending messages every 20 seconds for ${this.simulationDuration} minutes.\n\n` +
      `This will generate a lot of traffic. Continue?`
    );

    if (confirmed) {
      try {
        await this.signalrService.startUserSimulation(
          this.currentGroup,
          this.simulationUserCount,
          this.simulationDuration
        );
      } catch (error) {
        console.error('User simulation error:', error);
        alert('Failed to start user simulation. Check console for details.');
      }
    }
  }

  async stopUserSimulation(): Promise<void> {
    if (confirm('Stop the user simulation?')) {
      try {
        await this.signalrService.stopUserSimulation();
      } catch (error) {
        console.error('Error stopping simulation:', error);
      }
    }
  }
}
