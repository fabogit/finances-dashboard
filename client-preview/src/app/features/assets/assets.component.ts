import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MockDataService } from '../../core/services/mock-data.service';

@Component({
  selector: 'app-assets',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './assets.component.html',
  styleUrls: ['./assets.component.scss']
})
export class AssetsComponent {
  mockService = inject(MockDataService);
}
