/**
 * Hook for converting SQL query results to Cesium entity descriptors.
 * Provides a reusable pattern for SQL → visualization data bridge.
 */

import {useMemo} from 'react';
import {Cartesian3} from 'cesium';
import type {CesiumLayerConfig} from '../cesium-config';

/**
 * Entity descriptor for rendering.
 * Simplified interface for creating Cesium entities from data rows.
 */
export interface CesiumEntityDescriptor {
  id: string;
  position: ReturnType<typeof Cartesian3.fromDegrees>;
  label?: string;
  time?: string;
  color?: string;
  size?: number;
}

/**
 * Converts SQL query result rows to Cesium entity descriptors.
 * Handles column mapping and type coercion.
 *
 * @param rows Array of data rows from SQL query
 * @param layerConfig Layer configuration with column mappings
 * @returns Array of entity descriptors ready for rendering
 *
 * @example
 * ```typescript
 * const {data} = useSql({query: 'SELECT * FROM earthquakes'});
 * const entities = useSqlToCesiumEntities(
 *   data?.toArray() ?? [],
 *   layerConfig
 * );
 * ```
 */
export function useSqlToCesiumEntities(
  rows: any[],
  layerConfig: CesiumLayerConfig,
): CesiumEntityDescriptor[] {
  const mapping = layerConfig.columnMapping ?? {
    longitude: 'longitude',
    latitude: 'latitude',
  };

  return useMemo(() => {
    if (!rows || rows.length === 0) return [];

    return rows.map((row: any, i: number) => {
      const lon = Number(row[mapping.longitude]);
      const lat = Number(row[mapping.latitude]);
      const alt = mapping.altitude ? Number(row[mapping.altitude]) : 0;

      return {
        id: `${layerConfig.id}-${i}`,
        position: Cartesian3.fromDegrees(lon, lat, alt),
        label: mapping.label ? String(row[mapping.label]) : undefined,
        time: mapping.time ? String(row[mapping.time]) : undefined,
        color: mapping.color ? String(row[mapping.color]) : undefined,
        size: mapping.size ? Number(row[mapping.size]) : undefined,
      };
    });
  }, [rows, mapping, layerConfig.id]);
}
