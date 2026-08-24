import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { TabsModule } from 'primeng/tabs';
import { ShareTabType } from '../../services/share-collection-service';
import { ShareTabContentComponent } from './share-tab-content.component/share-tab-content.component';

@Component({
  selector: 'app-recommendations',
  imports: [CommonModule, TabsModule, ShareTabContentComponent],
  templateUrl: './recommendations.html',
  styleUrl: './recommendations.scss',
})
export class Recommendations {
  activeTab = signal<ShareTabType>('SHARE_WITH_ME');

  onTabChange(value: string | number | undefined): void {
    this.activeTab.set(value as ShareTabType);
  }
}
