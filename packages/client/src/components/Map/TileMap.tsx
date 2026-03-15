import { useEffect, useRef, useState } from 'react';
import type { WorldMapData } from '@town/shared';
import { useAgentStore } from '../../store/agentStore.js';

const TILE_SIZE = 20;

const TILE_COLORS: Record<string, string> = {
  floor: '#2d4a2d',
  wall: '#4a3728',
  door: '#7a6040',
  grass: '#1e3a1e',
  path: '#6b6b5a',
  water: '#1a3a5c',
};

const LOCATION_COLORS: Record<string, string> = {
  home: '#2a4a3a',
  park: '#1a4a1a',
  cafe: '#4a3a1a',
  library: '#1a2a4a',
  town_hall: '#3a1a4a',
  market: '#4a2a1a',
};

const STATUS_COLORS: Record<string, string> = {
  idle: '#aaaaaa',
  moving: '#66bb6a',
  acting: '#42a5f5',
  conversing: '#ffa726',
  sleeping: '#7e57c2',
};

interface Props {
  mapData: WorldMapData | null;
}

export function TileMap({ mapData }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { agents, selectedAgentId, selectAgent } = useAgentStore();
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !mapData) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = mapData.width * TILE_SIZE;
    canvas.height = mapData.height * TILE_SIZE;

    function draw() {
      if (!ctx || !mapData) return;

      // Draw tiles
      for (let y = 0; y < mapData.height; y++) {
        for (let x = 0; x < mapData.width; x++) {
          const tile = mapData.tiles[y]?.[x];
          if (!tile) continue;

          let color = TILE_COLORS[tile.type] ?? '#333';
          if (tile.locationId && tile.type === 'floor') {
            color = LOCATION_COLORS[tile.locationId] ?? color;
          }

          ctx.fillStyle = color;
          ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
      }

      // Draw location labels
      ctx.font = '9px Courier New';
      for (const loc of mapData.locations) {
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.fillText(
          loc.name,
          loc.bounds.x * TILE_SIZE + 3,
          (loc.bounds.y + 2) * TILE_SIZE
        );
      }

      // Draw agents
      for (const agent of agents) {
        const { x, y } = agent.position;
        const isSelected = agent.identity.id === selectedAgentId;
        const color = STATUS_COLORS[agent.status] ?? '#fff';

        // Agent circle
        ctx.beginPath();
        ctx.arc(
          x * TILE_SIZE + TILE_SIZE / 2,
          y * TILE_SIZE + TILE_SIZE / 2,
          isSelected ? 7 : 5,
          0, Math.PI * 2
        );
        ctx.fillStyle = color;
        ctx.fill();

        if (isSelected) {
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        // Name label on selected
        if (isSelected) {
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 10px Courier New';
          ctx.fillText(
            agent.identity.name.split(' ')[0] ?? '',
            x * TILE_SIZE - 5,
            y * TILE_SIZE - 5
          );
        }
      }

      rafRef.current = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [mapData, agents, selectedAgentId]);

  function handleClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const cx = Math.floor(((e.clientX - rect.left) * scaleX) / TILE_SIZE);
    const cy = Math.floor(((e.clientY - rect.top) * scaleY) / TILE_SIZE);

    // Find closest agent
    let closest: string | null = null;
    let minDist = 2;
    for (const agent of agents) {
      const dist = Math.abs(agent.position.x - cx) + Math.abs(agent.position.y - cy);
      if (dist < minDist) { minDist = dist; closest = agent.identity.id; }
    }
    selectAgent(closest);
  }

  return (
    <canvas
      ref={canvasRef}
      onClick={handleClick}
      style={{ cursor: 'crosshair', maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
    />
  );
}
