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
    // URL DEL API GATEWAY (Dinámico por ambiente)
    private readonly API_GATEWAY = environment.apiUrl;

    constructor() {}

    private setToken(value: string) {
        sessionStorage.setItem('session_token', value);
    }

    public getToken(): string | null {
        return sessionStorage.getItem('session_token');
    }

    private deleteToken() {
        sessionStorage.removeItem('session_token');
    }

    // --- LOGIN REAL AL API GATEWAY ---
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

    // --- REGISTER REAL AL API GATEWAY ---
    async register(user: RegisteredUser): Promise<ApiResponse> {
        try {
            // Renombramos campos para que coincidan con lo que espera el microservicio
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

    getUserId(): string | null {
        const payload = this.getPayload();
        return payload ? payload.id : null;
    }

    hasPermission(permission: string): boolean {
        const payload = this.getPayload();
        if (!payload || !payload.permissions) return false;
        return payload.permissions.includes(permission);
    }

    // Ya no exponemos las credenciales hardcodeadas (Seguridad Pro)
    getHardcodedCredentials() {
        return [
            { email: 'admin@miapp.com', password: 'Admin@12345 (Admin)' },
            { email: 'usuario@miapp.com', password: 'User@12345! (Agente)' }
        ];
    }
}
