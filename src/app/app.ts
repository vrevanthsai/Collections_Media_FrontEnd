import { Component, inject } from '@angular/core';
import { Layout } from './components/layout/layout/layout';
import { ToastModule } from 'primeng/toast';
import { ThemeService } from './pages/services/theme-service';

@Component({
  selector: 'app-root',
  imports: [Layout, ToastModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected title = 'Collection_Media_Fend';
  private themeService = inject(ThemeService);
}
