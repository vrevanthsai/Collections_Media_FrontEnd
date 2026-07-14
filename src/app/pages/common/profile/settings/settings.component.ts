import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { ButtonModule } from 'primeng/button';
import { ThemeService } from '../../../services/theme-service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, SelectModule, ToggleSwitchModule, ButtonModule],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent {
  themeService = inject(ThemeService);
  darkMode = true;

  ngOnInit() {
    this.darkMode = this.themeService.isDarkMode();
  }

  saveSettings(){
    console.log("darkmode ", this.darkMode);
    this.themeService.setTheme(this.darkMode);
  }
}
