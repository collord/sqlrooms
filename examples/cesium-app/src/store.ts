/**
 * Room store configuration for Cesium Earthquake Explorer example.
 * Demonstrates integration of Cesium slice with room store.
 */

import {
  createRoomStore,
  createRoomShellSlice,
  type RoomShellSliceState,
} from '@sqlrooms/room-shell';
import {
  createCesiumSlice,
  type CesiumSliceState,
  createDefaultCesiumConfig,
  CesiumPanel,
} from '@sqlrooms/cesium';
import {Globe} from 'lucide-react';

// Combined room state type
export type RoomState = RoomShellSliceState & CesiumSliceState;

// Create default Cesium configuration
const cesiumConfig = createDefaultCesiumConfig();

// Configure earthquake layer with SQL query
cesiumConfig.cesium.layers = [
  {
    id: 'earthquakes',
    type: 'sql-entities',
    visible: true,
    sqlQuery: `
      SELECT
        latitude,
        longitude,
        depth AS altitude,
        time AS timestamp,
        mag AS size,
        place AS label
      FROM earthquakes
      WHERE mag > 4.0
      ORDER BY time
    `,
    columnMapping: {
      longitude: 'longitude',
      latitude: 'latitude',
      altitude: 'altitude',
      time: 'timestamp',
      label: 'label',
      size: 'size',
    },
  },
];

// Configure time range for earthquake data
cesiumConfig.cesium.clock = {
  startTime: '2024-01-01T00:00:00Z',
  stopTime: '2024-12-31T23:59:59Z',
  multiplier: 86400, // 1 day per second
  shouldAnimate: false,
  clockRange: 'LOOP_STOP',
};

// Create room store with Cesium slice
export const {roomStore, useRoomStore} = createRoomStore<RoomState>(
  (set, get, store) => ({
    ...createRoomShellSlice({
      config: {
        title: 'Earthquake Explorer',
        dataSources: [
          {
            tableName: 'earthquakes',
            type: 'url',
            url: 'https://huggingface.co/datasets/sqlrooms/earthquakes/resolve/main/earthquakes.parquet',
          },
        ],
      },
      layout: {
        config: {
          type: 'mosaic',
          nodes: 'cesium-globe', // Single panel layout
        },
        panels: {
          'cesium-globe': {
            title: '3D Globe',
            icon: Globe,
            component: CesiumPanel,
            placement: 'main',
          },
        },
      },
    })(set, get, store),

    ...createCesiumSlice(cesiumConfig)(set, get, store),
  }),
);
