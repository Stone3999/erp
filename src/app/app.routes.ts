import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: '',
        loadComponent: () =>
            import('./components/landing/landing.component').then((m) => m.LandingComponent),
    },
    {
        path: 'login',
        loadComponent: () =>
            import('./components/login/login.component').then((m) => m.LoginComponent),
    },
    {
        path: 'register',
        loadComponent: () =>
            import('./components/register/register.component').then((m) => m.RegisterComponent),
    },
    {
        path: 'dashboard',
        loadComponent: () =>
            import('./components/layout/main-layout/main-layout.component').then(
                (m) => m.MainLayoutComponent
            ),
        children: [
            {
                path: '',
                loadComponent: () =>
                    import('./components/dashboard/dashboard.component').then(
                        (m) => m.DashboardComponent
                    ),
            },
            {
                path: 'grupos',
                loadComponent: () =>
                    import('./components/grupos/grupos.component').then((m) => m.GruposComponent),
            },
            {
                path: 'usuarios',
                loadComponent: () =>
                    import('./components/usuarios/usuarios.component').then((m) => m.UsuariosComponent),
            },
            {
                path: 'perfil',
                loadComponent: () =>
                    import('./components/perfil/perfil.component').then((m) => m.PerfilComponent),
            },
            {
                path: 'room',
                loadComponent: () =>
                    import('./components/room/room.component').then((m) => m.RoomComponent),
            },
            
        ],
    },
    { path: '**', redirectTo: '' },
];