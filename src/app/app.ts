import { Component, inject } from '@angular/core';
import { Layout } from './components/layout/layout/layout';
import { ToastModule } from 'primeng/toast';
import { ThemeService } from './pages/services/theme-service';
import { ConfirmPopupModule } from 'primeng/confirmpopup';

@Component({
  selector: 'app-root',
  imports: [Layout, ToastModule, ConfirmPopupModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected title = 'Collection_Media_Fend';
  private themeService = inject(ThemeService);
}
