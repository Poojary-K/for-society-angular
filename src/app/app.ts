import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastComponent } from './shared/components/toast/toast.component';
import { LoadingComponent } from './shared/components/loading/loading.component';
import { SidebarComponent } from './shared/components/sidebar/sidebar.component';
import { ProfileDrawerComponent } from './shared/components/profile-drawer/profile-drawer.component';
import { HeaderComponent } from './shared/components/header/header.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastComponent, LoadingComponent, SidebarComponent, ProfileDrawerComponent, HeaderComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {}
