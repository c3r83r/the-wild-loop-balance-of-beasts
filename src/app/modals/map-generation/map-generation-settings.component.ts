import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MapGenerationOptions, TerrainPreset } from '../../services/map.service';

@Component({
  selector: 'app-map-generation-settings',
  templateUrl: './map-generation-settings.component.html',
  styleUrls: ['./map-generation-settings.component.scss'],
  standalone: true,
  imports: [FormsModule]
})
export class MapGenerationSettingsComponent {
  @Input() options: MapGenerationOptions = {};
  @Output() save = new EventEmitter<MapGenerationOptions>();
  @Output() cancel = new EventEmitter<void>();

  presets: { label: string, value: TerrainPreset }[] = [
    { label: 'Niziny', value: 'niziny' },
    { label: 'Pagórki', value: 'pagorki' },
    { label: 'Góry', value: 'gory' }
  ];

  onSave() {
    this.save.emit(this.options);
  }
}
