import { useEffect, useState } from 'react';
import type { WorldMapData } from '@town/shared';
import { useSimulationSocket } from './ws/useSimulationSocket.js';
import { TileMap } from './components/Map/TileMap.js';
import { SimControls } from './components/HUD/SimControls.js';
import { ClockDisplay } from './components/HUD/ClockDisplay.js';
import { AgentList } from './components/AgentPanel/AgentList.js';
import { AgentDetail } from './components/AgentPanel/AgentDetail.js';
import { DialogueBubble } from './components/Dialogue/DialogueBubble.js';

export function App() {
  useSimulationSocket();
  const [mapData, setMapData] = useState<WorldMapData | null>(null);

  useEffect(() => {
    fetch('/api/map')
      .then(r => r.json())
      .then(data => setMapData(data as WorldMapData));
  }, []);

  return (
    <div style={styles.root}>
      {/* Top HUD bar */}
      <div style={styles.hud}>
        <div style={styles.title}>🏘 TOWN</div>
        <ClockDisplay />
        <SimControls />
      </div>

      {/* Main content */}
      <div style={styles.main}>
        {/* Map area */}
        <div style={styles.mapArea}>
          <TileMap mapData={mapData} />
          <DialogueBubble />
        </div>

        {/* Right panel */}
        <div style={styles.panel}>
          <div style={styles.panelTop}>
            <AgentList />
          </div>
          <div style={styles.panelBottom}>
            <AgentDetail />
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: { display: 'flex', flexDirection: 'column', height: '100vh', background: '#0d1117' },
  hud: {
    display: 'flex', alignItems: 'center',
    background: '#16213e', borderBottom: '2px solid #0f3460',
    padding: '0 8px', minHeight: 48, flexShrink: 0,
  },
  title: {
    fontWeight: 'bold', fontSize: 16, color: '#42a5f5',
    marginRight: 16, letterSpacing: 2,
  },
  main: { display: 'flex', flex: 1, overflow: 'hidden' },
  mapArea: {
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: '#0d1117', position: 'relative', overflow: 'hidden',
  },
  panel: {
    width: 260, display: 'flex', flexDirection: 'column',
    borderLeft: '1px solid #0f3460', background: '#0d1117',
  },
  panelTop: { flex: '0 0 200px', borderBottom: '1px solid #0f3460', overflow: 'hidden' },
  panelBottom: { flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' },
};
