/**
 * Main App component for Cesium Earthquake Explorer.
 */

import React from 'react';
import {RoomShell} from '@sqlrooms/room-shell';
import {ThemeProvider} from '@sqlrooms/ui';
import {roomStore} from './store';

export const App: React.FC = () => {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="cesium-app-theme">
      <RoomShell className="h-screen" roomStore={roomStore}>
        <RoomShell.LayoutComposer />
        <RoomShell.LoadingProgress />
      </RoomShell>
    </ThemeProvider>
  );
};
