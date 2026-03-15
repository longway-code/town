import { useEffect, useRef } from 'react';
import type { WorldMapData } from '@town/shared';
import { useAgentStore } from '../../store/agentStore.js';

const TILE_SIZE = 22;

const TERRAIN: Record<string, string> = {
  grass: '#182c18',
  path:  '#4a3e2c',
  wall:  '#2e2416',
  door:  '#7a5c12',
  water: '#0c2236',
  floor: '#1e2e1a',
};

const LOC_FILL: Record<string, string> = {
  home:      '#1e3022',
  park:      '#102614',
  cafe:      '#2e1a0c',
  library:   '#101830',
  town_hall: '#1e1230',
  market:    '#2e2008',
};

const LOC_ACCENT: Record<string, string> = {
  home:      '#4a7a58',
  park:      '#3a8a42',
  cafe:      '#a05a20',
  library:   '#3a68b0',
  town_hall: '#7a44b0',
  market:    '#b07a20',
};

const LOC_LABEL: Record<string, string> = {
  home:      '🏠 住宅区',
  park:      '🌳 中央公园',
  cafe:      '☕ 咖啡馆',
  library:   '📚 图书馆',
  town_hall: '🏛 市政厅',
  market:    '🏪 集市',
};

const STATUS_COLOR: Record<string, string> = {
  idle:       '#78909c',
  moving:     '#66bb6a',
  acting:     '#42a5f5',
  conversing: '#ffa726',
  sleeping:   '#ce93d8',
};

const FONT = '"PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif';

interface Props {
  mapData: WorldMapData | null;
}

export function TileMap({ mapData }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const { agents, selectedAgentId, selectAgent } = useAgentStore();
  const rafRef = useRef<number>(0);

  // Build static background once when mapData arrives
  useEffect(() => {
    if (!mapData) return;

    const bg = document.createElement('canvas');
    bg.width = mapData.width * TILE_SIZE;
    bg.height = mapData.height * TILE_SIZE;
    const ctx = bg.getContext('2d');
    if (!ctx) return;

    // Base
    ctx.fillStyle = '#0e1a0e';
    ctx.fillRect(0, 0, bg.width, bg.height);

    // Terrain tiles
    for (let y = 0; y < mapData.height; y++) {
      for (let x = 0; x < mapData.width; x++) {
        const tile = mapData.tiles[y]?.[x];
        if (!tile) continue;
        ctx.fillStyle = TERRAIN[tile.type] ?? '#1a1a1a';
        ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      }
    }

    // Location fills + borders
    for (const loc of mapData.locations) {
      const { x, y, width, height } = loc.bounds;
      const px = x * TILE_SIZE;
      const py = y * TILE_SIZE;
      const pw = width * TILE_SIZE;
      const ph = height * TILE_SIZE;
      const accent = LOC_ACCENT[loc.id] ?? '#555';

      ctx.fillStyle = LOC_FILL[loc.id] ?? '#1a1a1a';
      ctx.fillRect(px, py, pw, ph);

      // Outer border
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2;
      ctx.strokeRect(px + 1, py + 1, pw - 2, ph - 2);

      // Inner subtle glow border
      ctx.strokeStyle = accent + '33';
      ctx.lineWidth = 5;
      ctx.strokeRect(px + 4, py + 4, pw - 8, ph - 8);
    }

    // Subtle tile grid
    ctx.strokeStyle = 'rgba(0,0,0,0.18)';
    ctx.lineWidth = 0.5;
    for (let gx = 0; gx <= mapData.width; gx++) {
      ctx.beginPath();
      ctx.moveTo(gx * TILE_SIZE, 0);
      ctx.lineTo(gx * TILE_SIZE, bg.height);
      ctx.stroke();
    }
    for (let gy = 0; gy <= mapData.height; gy++) {
      ctx.beginPath();
      ctx.moveTo(0, gy * TILE_SIZE);
      ctx.lineTo(bg.width, gy * TILE_SIZE);
      ctx.stroke();
    }

    // Location labels
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (const loc of mapData.locations) {
      const { x, y, width } = loc.bounds;
      const label = LOC_LABEL[loc.id] ?? loc.name;
      const accent = LOC_ACCENT[loc.id] ?? '#aaa';
      const lx = (x + width / 2) * TILE_SIZE;
      const ly = y * TILE_SIZE + 5;

      ctx.font = `bold 11px ${FONT}`;
      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.9)';
      ctx.fillText(label, lx + 1, ly + 1);
      // Label
      ctx.fillStyle = accent;
      ctx.fillText(label, lx, ly);
    }

    bgCanvasRef.current = bg;
  }, [mapData]);

  // Render dynamic agent layer every rAF
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !mapData) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = mapData.width * TILE_SIZE;
    canvas.height = mapData.height * TILE_SIZE;

    function draw() {
      if (!ctx || !canvas || !mapData) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Static bg
      if (bgCanvasRef.current) {
        ctx.drawImage(bgCanvasRef.current, 0, 0);
      }

      const now = Date.now();

      for (const agent of agents) {
        const { x, y } = agent.position;
        const isSelected = agent.identity.id === selectedAgentId;
        const isConversing = agent.status === 'conversing';
        const color = STATUS_COLOR[agent.status] ?? '#fff';
        const cx = x * TILE_SIZE + TILE_SIZE / 2;
        const cy = y * TILE_SIZE + TILE_SIZE / 2;
        const r = isSelected ? 9 : 7;

        // Conversing pulse ring
        if (isConversing) {
          const pulse = 0.5 + 0.5 * Math.sin(now / 350);
          ctx.beginPath();
          ctx.arc(cx, cy, r + 5 + pulse * 3, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(255,167,38,${0.25 + pulse * 0.4})`;
          ctx.lineWidth = 2.5;
          ctx.stroke();
        }

        // Glow
        ctx.shadowBlur = isSelected ? 16 : 10;
        ctx.shadowColor = isSelected ? 'rgba(255,255,255,0.8)' : color + '88';

        // Main circle
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        ctx.shadowBlur = 0;

        // Selected ring
        if (isSelected) {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        // Surname char inside circle
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `bold ${isSelected ? 10 : 9}px ${FONT}`;
        ctx.fillStyle = 'rgba(0,0,0,0.75)';
        ctx.fillText(agent.identity.name[0] ?? '?', cx, cy + 0.5);

        // Name tag above circle
        const name = agent.identity.name;
        ctx.font = `${isSelected ? 'bold ' : ''}9px ${FONT}`;
        const tw = ctx.measureText(name).width;
        const tagX = cx - tw / 2 - 3;
        const tagY = cy - r - 14;

        ctx.fillStyle = 'rgba(0,0,0,0.72)';
        ctx.fillRect(tagX, tagY, tw + 6, 12);

        ctx.textBaseline = 'top';
        ctx.fillStyle = isSelected ? '#ffffff' : '#d0d0d0';
        ctx.fillText(name, cx, tagY + 1.5);
      }

      ctx.shadowBlur = 0;
      ctx.textBaseline = 'alphabetic';
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

    let closest: string | null = null;
    let minDist = 3;
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
