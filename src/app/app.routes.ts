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
    path: 'causes',
    loadComponent: () => import('./features/causes/causes-view/causes-view.component').then(m => m.CausesViewComponent),
  },
  {
    path: 'causes/:id',
    loadComponent: () => import('./features/causes/cause-detail/cause-detail.component').then(m => m.CauseDetailComponent),
  },
  {
    path: 'contributions',
    loadComponent: () => import('./features/contributions/contributions-view/contributions-view.component').then(m => m.ContributionsViewComponent),
    canActivate: [authGuard],
  },
  {
    path: 'contributions/:id',
    loadComponent: () => import('./features/contributions/contribution-detail/contribution-detail.component').then(m => m.ContributionDetailComponent),
    canActivate: [authGuard],
  },
  {
    path: 'members/:id',
    loadComponent: () => import('./features/members/member-detail/member-detail.component').then(m => m.MemberDetailComponent),
    canActivate: [authGuard],
  },
  {
    path: 'members',
    loadComponent: () => import('./features/members/members.component').then(m => m.MembersComponent),
    canActivate: [authGuard],
  },
  {
    path: 'profile',
    loadComponent: () => import('./features/profile/profile-drawer/profile-drawer.component').then(m => m.ProfileDrawerComponent),
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
