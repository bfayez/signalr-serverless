import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  service: string;
  version: string;
  checks: {
    [key: string]: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class HealthService {
  private healthStatusSubject = new BehaviorSubject<HealthStatus | null>(null);
  public healthStatus$ = this.healthStatusSubject.asObservable();

  private apiBaseUrl = 'http://localhost:7071/api';

  async checkHealth(): Promise<HealthStatus> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/health`);
      
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.statusText}`);
      }

      const health = await response.json();
      this.healthStatusSubject.next(health);
      return health;

    } catch (error) {
      const unhealthyStatus: HealthStatus = {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        service: 'signalr-serverless',
        version: '1.0.0',
        checks: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
      
      this.healthStatusSubject.next(unhealthyStatus);
      throw error;
    }
  }

  setApiBaseUrl(url: string): void {
    this.apiBaseUrl = url;
  }
}
