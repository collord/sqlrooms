/**
 * Component that renders Cesium entities from SQL query results.
 * Bridges DuckDB data to 3D globe visualization.
 */

import React, {useMemo} from 'react';
import {Entity, PointGraphics} from 'resium';
import {Color} from 'cesium';
import {useSql} from '@sqlrooms/duckdb';
import type {CesiumLayerConfig} from '../cesium-config';
import {useSqlToCesiumEntities} from '../hooks/useSqlToCesiumEntities';

export interface CesiumEntityLayerProps {
  /** Layer configuration with SQL query and column mappings */
  layerConfig: CesiumLayerConfig;
}

/**
 * Executes a SQL query and renders each row as a Cesium Entity.
 *
 * Column mapping determines which columns map to lon/lat/alt/time/label/color/size.
 * Follows the vega pattern: useSql hook for data fetching, useMemo for conversion.
 *
 * **Performance**: Uses useMemo to prevent entity recreation on every render.
 * Only recomputes when SQL data changes.
 *
 * @example
 * ```typescript
 * <CesiumEntityLayer
 *   layerConfig={{
 *     id: 'earthquakes',
 *     type: 'sql-entities',
 *     sqlQuery: 'SELECT * FROM earthquakes WHERE mag > 5',
 *     columnMapping: {
 *       longitude: 'lon',
 *       latitude: 'lat',
 *       label: 'place',
 *       size: 'mag'
 *     }
 *   }}
 * />
 * ```
 */
export const CesiumEntityLayer: React.FC<CesiumEntityLayerProps> = ({
  layerConfig,
}) => {
  const {sqlQuery} = layerConfig;

  // Execute SQL query using vega pattern
  // Note: Query will fail if table doesn't exist yet, but that's expected during data loading
  const {data, isLoading, error} = useSql<Record<string, any>>({
    query: sqlQuery ?? '',
    enabled: Boolean(sqlQuery),
  });

  // Don't log errors during loading - tables may not exist yet
  if (error && !isLoading) {
    console.debug(`CesiumEntityLayer[${layerConfig.id}]: Query error (may be temporary during data load):`, error.message);
  }

  // Convert Arrow table rows to entity descriptors
  const entities = useSqlToCesiumEntities(data?.toArray() ?? [], layerConfig);

  // Don't render if loading, error, or no data
  if (isLoading || error || !entities.length) {
    return null;
  }

  // Render each entity as a Resium Entity component
  return (
    <>
      {entities.map((entity) => (
        <Entity
          key={entity.id}
          name={entity.label ?? entity.id}
          position={entity.position}
          description={entity.label}
        >
          <PointGraphics
            pixelSize={entity.size ? entity.size * 2 : 8}
            color={entity.color ? Color.fromCssColorString(entity.color) : Color.CYAN}
            outlineColor={Color.WHITE}
            outlineWidth={1}
          />
        </Entity>
      ))}
    </>
  );
};
