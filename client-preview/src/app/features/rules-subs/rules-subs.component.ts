import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { MockDataService } from '../../core/services/mock-data.service';

@Component({
  selector: 'app-rules-subs',
  standalone: true,
  imports: [CommonModule, MatIconModule, FormsModule],
  templateUrl: './rules-subs.component.html',
  styleUrls: ['./rules-subs.component.scss']
})
export class RulesSubsComponent {
  mockService = inject(MockDataService);

  // Rule form bindings
  newKeyword = signal<string>('');
  newCategory = signal<string>('Leisure');

  addRule() {
    if (this.newKeyword().trim()) {
      this.mockService.localRules.update(rules => [
        ...rules,
        {
          id: `r-${Date.now()}`,
          keyword: this.newKeyword().trim(),
          assignCategory: this.newCategory()
        }
      ]);
      this.newKeyword.set('');
    }
  }

  deleteRule(id: string) {
    this.mockService.localRules.update(rules => rules.filter(r => r.id !== id));
  }
}
