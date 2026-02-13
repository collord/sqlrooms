/**
 * Resium Viewer wrapper with lifecycle management and store synchronization.
 * Core component that manages the Cesium viewer instance.
 */

import React, {useRef, useEffect, useMemo} from 'react';
import {Viewer, Clock, CesiumComponentRef} from 'resium';
import {
  Viewer as CesiumViewer,
  Cartesian3,
  JulianDate,
  ClockRange,
  SceneMode,
  Color,
  Ion,
  Terrain,
  EllipsoidTerrainProvider,
  OpenStreetMapImageryProvider,
} from 'cesium';
import {useStoreWithCesium} from '../cesium-slice';
import {CesiumEntityLayer} from './CesiumEntityLayer';
import {useClockSync} from '../hooks/useClockSync';

/**
 * Imperatively configure terrain and imagery on a Cesium viewer.
 * Extracted as a module-level function to avoid React Compiler immutability tracking.
 *
 * Strategy:
 * - With Ion token + terrain enabled: use Terrain.fromWorldTerrain() for real 3D terrain
 * - Without Ion token or terrain disabled: use flat EllipsoidTerrainProvider
 * - For imagery: OpenStreetMap when no Ion token or explicitly configured
 */
function setupTerrainAndImagery(
  viewer: CesiumViewer,
  terrainEnabled: boolean,
  baseLayerImagery: string,
): void {
  const hasIonToken = Boolean(Ion.defaultAccessToken);

  // Set up terrain
  if (terrainEnabled && hasIonToken) {
    // Use Cesium Ion world terrain (requires valid token)
    viewer.scene.setTerrain(Terrain.fromWorldTerrain());
  } else {
    // Flat ellipsoid terrain (no external dependency)
    viewer.terrainProvider = new EllipsoidTerrainProvider();
  }

  // Set up imagery based on config and token availability
  if (baseLayerImagery === 'openstreetmap' || !hasIonToken) {
    // Remove default Ion imagery and add OpenStreetMap
    viewer.imageryLayers.removeAll();
    viewer.imageryLayers.addImageryProvider(
      new OpenStreetMapImageryProvider({
        url: 'https://tile.openstreetmap.org/',
      }),
    );
  }
  // 'ion-default' with a valid token uses Cesium's built-in default imagery (Bing Maps via Ion)
  // 'none' would leave whatever default is configured
}

// Map config enum strings to Cesium constants
const CLOCK_RANGE_MAP = {
  UNBOUNDED: ClockRange.UNBOUNDED,
  CLAMPED: ClockRange.CLAMPED,
  LOOP_STOP: ClockRange.LOOP_STOP,
} as const;

const SCENE_MODE_MAP = {
  SCENE3D: SceneMode.SCENE3D,
  SCENE2D: SceneMode.SCENE2D,
  COLUMBUS_VIEW: SceneMode.COLUMBUS_VIEW,
} as const;

/**
 * Wraps Resium Viewer component with SQLRooms lifecycle management.
 *
 * **Lifecycle Pattern** (from cosmos):
 * 1. Create ref for Viewer component
 * 2. On mount: register viewer in store, apply initial camera, attach listeners
 * 3. On config changes: apply imperatively (don't re-create viewer)
 * 4. On unmount: cleanup listeners, null viewer ref
 *
 * **Critical**: Mount viewer ONCE. Never re-create on config changes.
 * Updates applied via imperative API (viewer.camera.setView) not React re-renders.
 *
 * **Granular Selectors**: Only select specific state to prevent unnecessary re-renders.
 *
 * @example
 * ```typescript
 * <CesiumViewerWrapper />
 * ```
 */
export const CesiumViewerWrapper: React.FC = () => {
  const viewerInstanceRef = useRef<CesiumViewer | null>(null);

  // Granular selectors (prevent re-renders on unrelated state changes)
  const setViewer = useStoreWithCesium((s) => s.cesium.setViewer);
  const saveCameraPosition = useStoreWithCesium(
    (s) => s.cesium.saveCameraPosition,
  );
  const cameraConfig = useStoreWithCesium((s) => s.cesium.config.camera);
  const clockConfig = useStoreWithCesium((s) => s.cesium.config.clock);
  const sceneMode = useStoreWithCesium((s) => s.cesium.config.sceneMode);
  const showTimeline = useStoreWithCesium((s) => s.cesium.config.showTimeline);
  const showAnimation = useStoreWithCesium(
    (s) => s.cesium.config.showAnimation,
  );
  const layers = useStoreWithCesium((s) => s.cesium.config.layers);
  const terrainEnabled = useStoreWithCesium((s) => s.cesium.config.terrain);
  const baseLayerImagery = useStoreWithCesium(
    (s) => s.cesium.config.baseLayerImagery,
  );

  // Callback ref to capture viewer when Resium creates it
  const handleViewerRef = (
    resiumRef: CesiumComponentRef<CesiumViewer> | null,
  ) => {
    if (!resiumRef) return;

    const viewer = resiumRef.cesiumElement;
    if (!viewer) return;

    // Avoid re-initializing if already set
    if (viewerInstanceRef.current === viewer) return;

    viewerInstanceRef.current = viewer;

    // Set dark background for space behind the globe
    // Set up terrain based on config and Ion token availability
    setupTerrainAndImagery(viewer, terrainEnabled, baseLayerImagery);

    viewer.scene.backgroundColor = Color.fromCssColorString('#0a0a14');

    // Register viewer in store
    setViewer(viewer);

    // Apply initial camera position from config
    viewer.camera.setView({
      destination: Cartesian3.fromDegrees(
        cameraConfig.longitude,
        cameraConfig.latitude,
        cameraConfig.height,
      ),
      orientation: {
        heading: cameraConfig.heading,
        pitch: cameraConfig.pitch,
        roll: cameraConfig.roll,
      },
    });

    // Save camera position when user finishes moving
    // Only fires on moveEnd (not during drag) to reduce write frequency
    viewer.camera.moveEnd.addEventListener(saveCameraPosition);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const viewer = viewerInstanceRef.current;
      if (viewer && !viewer.isDestroyed()) {
        viewer.camera.moveEnd.removeEventListener(saveCameraPosition);
      }
      setViewer(null);
      viewerInstanceRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps = unmount only

  // Activate bidirectional clock sync
  useClockSync();

  // Compute clock props from config (memoized to avoid recreation)
  const clockProps = useMemo(() => {
    const props: Record<string, any> = {
      shouldAnimate: clockConfig.shouldAnimate,
      multiplier: clockConfig.multiplier,
      clockRange: CLOCK_RANGE_MAP[clockConfig.clockRange],
    };

    if (clockConfig.startTime) {
      props.startTime = JulianDate.fromIso8601(clockConfig.startTime);
    }
    if (clockConfig.stopTime) {
      props.stopTime = JulianDate.fromIso8601(clockConfig.stopTime);
    }
    if (clockConfig.currentTime) {
      props.currentTime = JulianDate.fromIso8601(clockConfig.currentTime);
    }

    return props;
  }, [clockConfig]);

  return (
    <Viewer
      ref={handleViewerRef}
      full
      timeline={showTimeline}
      animation={showAnimation}
      sceneMode={SCENE_MODE_MAP[sceneMode]}
      // Disable default UI elements (can enable via config later)
      baseLayerPicker={false}
      geocoder={false}
      homeButton={false}
      navigationHelpButton={false}
      sceneModePicker={false}
    >
      {/* Clock configuration */}
      <Clock {...clockProps} />

      {/* Render configured layers */}
      {layers.map((layer) => {
        if (!layer.visible) return null;

        switch (layer.type) {
          case 'sql-entities':
            return <CesiumEntityLayer key={layer.id} layerConfig={layer} />;

          // Future layer types: geojson, czml, tileset
          default:
            return null;
        }
      })}
    </Viewer>
  );
};
