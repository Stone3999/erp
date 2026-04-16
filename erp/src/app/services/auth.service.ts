import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface RegisteredUser {
    usuario: string;
    email: string;
    password?: string;
    fullName: string;
    address?: string;
    phone?: string;
    birthDate?: string;
}

export interface ApiResponse<T = any> {
    statusCode: number;
    intOpCode: string;
    data: T | null;
    message?: string;
}

import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root',
})
export class AuthService {
    private http = inject(HttpClient);
    
    private readonly API_GATEWAY = environment.apiUrl;

    constructor() {}

    private setToken(value: string) {
        
        const d = new Date();
        d.setTime(d.getTime() + (24 * 60 * 60 * 1000)); 
        const expires = "expires=" + d.toUTCString();
        document.cookie = `session_token=${value};${expires};path=/;SameSite=Lax`;
    }

    public getToken(): string | null {
        const name = "session_token=";
        const decodedCookie = decodeURIComponent(document.cookie);
        const ca = decodedCookie.split(';');
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) === ' ') {
                c = c.substring(1);
            }
            if (c.indexOf(name) === 0) {
                return c.substring(name.length, c.length);
            }
        }
        return null;
    }

    private deleteToken() {
        document.cookie = "session_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    }

    
    async login(email: string, password: string): Promise<ApiResponse> {
        try {
            const response = await firstValueFrom(
                this.http.post<ApiResponse>(`${this.API_GATEWAY}/auth/login`, { email, password })
            );

            if (response.statusCode === 200 && response.data) {
                const { token } = response.data as any;
                this.setToken(token);
            }
            return response;
        } catch (error: any) {
            return {
                statusCode: error.status || 500,
                intOpCode: 'ExUS500',
                data: null,
                message: error.error?.message || 'Error de conexión con el servidor'
            };
        }
    }

    
    async refreshToken(): Promise<boolean> {
        try {
            const response = await firstValueFrom(
                this.http.get<ApiResponse>(`${this.API_GATEWAY}/auth/refresh`)
            );
            if (response.statusCode === 200 && response.data) {
                const { token } = response.data as any;
                this.setToken(token);
                console.log('[AuthService] Token refrescado exitosamente.');
                return true;
            }
            return false;
        } catch (error) {
            console.error('[AuthService] Error al refrescar token:', error);
            return false;
        }
    }

    
    async register(user: RegisteredUser): Promise<ApiResponse> {
        try {
            const payload = {
                email: user.email,
                password: user.password,
                name: user.fullName
            };
            return await firstValueFrom(
                this.http.post<ApiResponse>(`${this.API_GATEWAY}/auth/register`, payload)
            );
        } catch (error: any) {
            return {
                statusCode: error.status || 400,
                intOpCode: 'ExUS400',
                data: null,
                message: error.error?.message || 'Error al registrar usuario'
            };
        }
    }

    logout(): void {
        this.deleteToken();
    }

    isLoggedIn(): boolean {
        return !!this.getToken();
    }

    private getPayload(): any {
        const token = this.getToken();
        if (!token) return null;
        try {
            const payloadEncodificado = token.split('.')[1]; 
            return JSON.parse(atob(payloadEncodificado)); 
        } catch (e) {
            return null;
        }
    }

    getCurrentUser(): string {
        const payload = this.getPayload();
        return payload ? payload.name : 'Invitado';
    }

    getCurrentUserEmail(): string | null {
        const payload = this.getPayload();
        return payload ? payload.email : null;
    }

    getUserId(): string | null {
        const payload = this.getPayload();
        return payload ? payload.id : null;
    }

    hasPermission(permission: string): boolean {
        const payload = this.getPayload();
        if (!payload || !payload.permissions) return false;
        return payload.permissions.includes(permission);
    }
}
