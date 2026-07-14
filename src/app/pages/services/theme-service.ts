import { Injectable, Renderer2, RendererFactory2, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private renderer: Renderer2;
//   localStorage key value is- darkMode and it has boolean value true or false stored. If true then dark mode is enabled otherwise light mode is enabled.
  private readonly STORAGE_KEY = 'darkMode';

  isDarkMode = signal<boolean>(true); // default - dark theme(True) orelse False(white theme)

  constructor(rendererFactory: RendererFactory2) {
    this.renderer = rendererFactory.createRenderer(null, null);
    this.loadInitialTheme();
  }

  private loadInitialTheme(): void {
    const saved = localStorage.getItem(this.STORAGE_KEY) === 'true';
    this.applyTheme(saved);
  }

  toggleTheme(): void {
    this.applyTheme(!this.isDarkMode());
  }

  setTheme(isDark: boolean): void {
    this.applyTheme(isDark);
  }

  private applyTheme(isDark: boolean): void {
    this.isDarkMode.set(isDark);
    localStorage.setItem(this.STORAGE_KEY, String(isDark));

    const html = document.documentElement;

    if (isDark) {
      this.renderer.addClass(html, 'dark-theme');
    } else {
      this.renderer.removeClass(html, 'dark-theme');
    }

    // keep color-scheme in sync so native form controls, scrollbars etc. render correctly too
    this.renderer.setStyle(document.body, 'color-scheme', isDark ? 'dark' : 'light');
  }
}