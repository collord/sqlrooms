/**
 * Room store configuration for Cesium Earthquake Explorer example.
 * Demonstrates integration of Cesium slice with room store.
 */

import {
  createRoomStore,
  createRoomShellSlice,
  type RoomShellSliceState,
  MAIN_VIEW,
} from '@sqlrooms/room-shell';
import {
  createCesiumSlice,
  type CesiumSliceState,
  createDefaultCesiumConfig,
  CesiumPanel,
} from '@sqlrooms/cesium';
import {createWasmDuckDbConnector} from '@sqlrooms/duckdb';
import {
  createSqlEditorSlice,
  type SqlEditorSliceState,
} from '@sqlrooms/sql-editor';
import {Globe} from 'lucide-react';

// Combined room state type
export type RoomState = RoomShellSliceState &
  CesiumSliceState &
  SqlEditorSliceState;

// Create default Cesium configuration with earthquake layer
const cesiumConfig = createDefaultCesiumConfig();

// Configure earthquake layer with SQL query (create new object to avoid mutating frozen config)
const configWithLayers = {
  ...cesiumConfig,
  cesium: {
    ...cesiumConfig.cesium,
    layers: [
      {
        id: 'earthquakes',
        type: 'sql-entities' as const,
        visible: true,
        tableName: 'earthquakes',
        sqlQuery: `
          SELECT
            Latitude AS latitude,
            Longitude AS longitude,
            0 AS altitude,
            DateTime AS timestamp,
            Magnitude AS size,
            'M' || CAST(Magnitude AS VARCHAR) || ' - ' || CAST(DateTime AS VARCHAR) AS label
          FROM earthquakes
          WHERE Magnitude >= 5.0
          ORDER BY DateTime
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
    ],
    // Configure time range for earthquake data
    clock: {
      startTime: '1967-01-01T00:00:00Z',
      stopTime: '2018-12-31T23:59:59Z',
      currentTime: '1967-01-01T00:00:00Z', // MUST set currentTime when using animation widget
      multiplier: 86400, // 1 day per second
      shouldAnimate: false,
      clockRange: 'LOOP_STOP',
    },
    // Disable animation widget until clock is properly configured
    showAnimation: false,
    showTimeline: false,
  },
};

// Create DuckDB connector
const connector = createWasmDuckDbConnector();

// Create room store with Cesium slice
export const {roomStore, useRoomStore} = createRoomStore<RoomState>(
  (set, get, store) => ({
    ...createRoomShellSlice({
      connector,
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
        panels: {
          [MAIN_VIEW]: {
            title: '3D Globe',
            icon: Globe,
            component: CesiumPanel,
            placement: 'main',
          },
        },
      },
    })(set, get, store),

    ...createCesiumSlice(configWithLayers)(set, get, store),

    ...createSqlEditorSlice()(set, get, store),
  }),
);
