'use client';

import { Layers } from 'lucide-react';

interface LayerState {
    clicks: boolean;
    impressions: boolean;
    impact: boolean;
}

interface LayerControlsProps {
    layers: LayerState;
    onLayerChange: (layers: LayerState) => void;
}

export function LayerControls({ layers, onLayerChange }: LayerControlsProps) {
    const toggleLayer = (key: keyof LayerState) => {
        onLayerChange({ ...layers, [key]: !layers[key] });
    };

    return (
        <div className="flex items-center gap-4 text-sm flex-wrap">
            <span className="text-muted-foreground flex items-center gap-1">
                <Layers className="w-3 h-3" /> Layers:
            </span>
            <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                    type="checkbox"
                    checked={layers.clicks}
                    onChange={() => toggleLayer('clicks')}
                    className="rounded border-input accent-blue-600"
                />
                <span className="text-blue-600 font-medium">GSC Clicks</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                    type="checkbox"
                    checked={layers.impressions}
                    onChange={() => toggleLayer('impressions')}
                    className="rounded border-input accent-purple-600"
                />
                <span className="text-purple-600 font-medium">GSC Impressions</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                    type="checkbox"
                    checked={layers.impact}
                    onChange={() => toggleLayer('impact')}
                    className="rounded border-input accent-emerald-600"
                />
                <span className="text-emerald-600 font-medium">Impact Windows</span>
            </label>
        </div>
    );
}
