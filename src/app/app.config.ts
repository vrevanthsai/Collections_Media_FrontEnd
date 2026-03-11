import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeuix/themes/aura';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './interceptors/auth.interceptors';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    // Routing config
    provideRouter(routes),
    // PrimeNG config
    providePrimeNG({
      theme: {
        preset: Aura,
      },
    }),
    // HttpClient config and Custom Interceptor config
    provideHttpClient(
      withInterceptors([authInterceptor]), // it takes multiple interceptors
    ),
  ],
};
