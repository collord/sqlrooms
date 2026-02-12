/**
 * Clock control component for time-dynamic Cesium visualizations.
 */

import React from 'react';
import {Play, Pause} from 'lucide-react';
import {Button, Slider, Label} from '@sqlrooms/ui';
import {useStoreWithCesium} from '../cesium-slice';
import {cn} from '@sqlrooms/ui';

export interface CesiumClockProps {
  className?: string;
}

/**
 * Clock controls for animation playback and speed adjustment.
 * Provides play/pause and speed multiplier slider.
 *
 * @example
 * ```typescript
 * <CesiumClock className="absolute bottom-4 left-4 z-10" />
 * ```
 */
export const CesiumClock: React.FC<CesiumClockProps> = ({className}) => {
  const isAnimating = useStoreWithCesium((s) => s.cesium.isAnimating);
  const multiplier = useStoreWithCesium(
    (s) => s.cesium.config.clock.multiplier,
  );
  const toggleAnimation = useStoreWithCesium((s) => s.cesium.toggleAnimation);
  const setClockConfig = useStoreWithCesium((s) => s.cesium.setClockConfig);

  return (
    <div
      className={cn(
        'bg-background/80 flex items-center gap-3 rounded-lg p-3 shadow-lg backdrop-blur',
        className,
      )}
    >
      {/* Play/Pause button */}
      <Button
        onClick={toggleAnimation}
        variant="outline"
        size="sm"
        title={isAnimating ? 'Pause animation' : 'Play animation'}
      >
        {isAnimating ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4" />
        )}
      </Button>

      {/* Speed multiplier slider */}
      <div className="flex items-center gap-2">
        <Label className="text-xs">Speed:</Label>
        <Slider
          value={[multiplier]}
          onValueChange={([v]) => setClockConfig({multiplier: v})}
          min={0.1}
          max={100}
          step={0.1}
          className="w-24"
          title={`${multiplier}x speed`}
        />
        <span className="text-muted-foreground text-xs">{multiplier}x</span>
      </div>
    </div>
  );
};
