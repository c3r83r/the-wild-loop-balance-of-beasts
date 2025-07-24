import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MapGenerationOptions, TerrainPreset } from '../../services/map.service';

@Component({
  selector: 'app-map-generation-modal',
  templateUrl: './map-generation-modal.component.html',
  styleUrls: ['./map-generation-modal.component.scss'],
  standalone: true,
  imports: [FormsModule, CommonModule]
})
export class MapGenerationModalComponent {
  @Input() show = false;
  @Input() options: MapGenerationOptions = {};
  @Output() close = new EventEmitter<void>();
  @Output() generate = new EventEmitter<MapGenerationOptions>();
  @Output() openSettings = new EventEmitter<void>();

  presets: { label: string, value: TerrainPreset }[] = [
    { label: 'Niziny', value: 'niziny' },
    { label: 'Pagórki', value: 'pagorki' },
    { label: 'Góry', value: 'gory' }
  ];

  selectedPreset: TerrainPreset = 'niziny';

  onGenerate() {
    this.generate.emit({ ...this.options, preset: this.selectedPreset });
    this.close.emit();
  }

  onSettings() {
    this.openSettings.emit();
  }
}
