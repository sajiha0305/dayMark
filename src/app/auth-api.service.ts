import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

export interface AuthAccount {
  id: string;
  username: string;
}

export interface ApiMessage {
  message: string;
}

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly http = inject(HttpClient);
  readonly account = signal<AuthAccount | null>(null);

  async initialize(): Promise<void> {
    await this.refreshCsrf();
    try {
      this.account.set(await firstValueFrom(this.http.get<AuthAccount>('/api/auth/me')));
    } catch (error) {
      if (error instanceof HttpErrorResponse && [401, 403].includes(error.status)) {
        this.account.set(null);
        return;
      }
      throw error;
    }
  }

  async refreshCsrf(): Promise<void> {
    await firstValueFrom(this.http.get('/api/auth/csrf'));
  }

  register(username: string, password: string): Promise<ApiMessage> {
    return firstValueFrom(this.http.post<ApiMessage>('/api/auth/register', { username, password }));
  }

  async login(username: string, password: string): Promise<AuthAccount> {
    const account = await firstValueFrom(
      this.http.post<AuthAccount>('/api/auth/login', { username, password }),
    );
    this.account.set(account);
    await this.refreshCsrf();
    return account;
  }

  async logout(): Promise<void> {
    await firstValueFrom(this.http.post<void>('/api/auth/logout', {}));
    this.account.set(null);
    await this.refreshCsrf();
  }

  getTracker<T>(): Promise<T> {
    return firstValueFrom(this.http.get<T>('/api/tracker'));
  }

  saveTracker<T>(state: T): Promise<T> {
    return firstValueFrom(this.http.put<T>('/api/tracker', state));
  }

  importTracker<T>(state: T): Promise<T> {
    return firstValueFrom(this.http.post<T>('/api/tracker/import', state));
  }

  migrationAvailable(): Promise<boolean> {
    return firstValueFrom(this.http.get<{ available: boolean }>('/api/tracker/import-status'))
      .then((status) => status.available);
  }
}
