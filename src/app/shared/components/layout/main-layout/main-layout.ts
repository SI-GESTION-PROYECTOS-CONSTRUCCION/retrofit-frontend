import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Sidebar } from '../sidebar/sidebar';
import { Header } from '../header/header';
import { Footer } from '../footer/footer';
import { AuthService } from '../../../../core/services/auth.service';
import { Skeleton } from '../../skeleton/skeleton';

@Component({
  selector: 'app-main-layout',
  imports: [CommonModule, RouterModule, Sidebar, Header, Footer, Skeleton],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.css',
})
export class MainLayout implements OnInit{
  isSidebarOpen = false; 
  private authService = inject(AuthService);
  public isReady = false;

  ngOnInit() {
    this.authService.loadUserProfile().subscribe({
      next: () => {
        this.isReady = true; 
      },
      error: () => {
        this.isReady = true; 
      }
    });
  }

  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
  }
}
