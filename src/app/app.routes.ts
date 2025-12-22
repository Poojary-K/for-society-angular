import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/feed/landing/landing.component').then(m => m.LandingComponent),
  },
  {
    path: 'feed',
    loadComponent: () => import('./features/feed/feed/feed.component').then(m => m.FeedComponent),
    canActivate: [authGuard],
  },
  {
    path: 'auth',
    children: [
      {
        path: 'login',
        loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent),
      },
      {
        path: 'register',
        loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent),
      },
    ],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
