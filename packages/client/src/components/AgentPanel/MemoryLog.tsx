import { useState } from 'react';
import type { MemoryEntry } from '@town/shared';

const TYPE_COLORS: Record<string, string> = {
  observation: '#42a5f5',
  reflection:  '#ab47bc',
  dialogue:    '#ffa726',
};

const TYPE_LABELS: Record<string, string> = {
  observation: '观察',
  reflection:  '感悟',
  dialogue:    '对话',
};

type FilterType = 'all' | MemoryEntry['type'];

interface Props {
  memories: MemoryEntry[];
}

export function MemoryLog({ memories }: Props) {
  const [filter, setFilter] = useState<FilterType>('all');

  const filtered = filter === 'all' ? memories : memories.filter(m => m.type === filter);

  const counts = {
    all:         memories.length,
    observation: memories.filter(m => m.type === 'observation').length,
    dialogue:    memories.filter(m => m.type === 'dialogue').length,
    reflection:  memories.filter(m => m.type === 'reflection').length,
  };

  return (
    <div style={styles.wrapper}>
      {/* Filter tabs */}
      <div style={styles.tabs}>
        {(['all', 'observation', 'dialogue', 'reflection'] as FilterType[]).map(t => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            style={{
              ...styles.tab,
              borderBottom: filter === t ? `2px solid ${t === 'all' ? '#90a4ae' : TYPE_COLORS[t]}` : '2px solid transparent',
              color: filter === t ? (t === 'all' ? '#e0e0e0' : TYPE_COLORS[t]) : '#546e7a',
            }}
          >
            {t === 'all' ? `全部 ${counts.all}` : `${TYPE_LABELS[t]} ${counts[t]}`}
          </button>
        ))}
      </div>

      {/* Memory list */}
      <div style={styles.list}>
        {filtered.length === 0 && (
          <div style={styles.empty}>暂无记忆。</div>
        )}
        {filtered.map(mem => (
          <div key={mem.id} style={styles.entry}>
            <div style={styles.meta}>
              <span style={{ ...styles.badge, background: TYPE_COLORS[mem.type] ?? '#555' }}>
                {TYPE_LABELS[mem.type] ?? mem.type}
              </span>
              <span style={styles.importance}>★{mem.importance.toFixed(1)}</span>
              <span style={styles.time}>{formatSimTime(mem.createdAt)}</span>
            </div>
            <div style={styles.content}>{mem.content}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatSimTime(simTime: number): string {
  const d = new Date(simTime * 1000);
  const h = d.getUTCHours().toString().padStart(2, '0');
  const m = d.getUTCMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

const styles: Record<string, React.CSSProperties> = {
  wrapper:    { display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' },
  tabs:       { display: 'flex', borderBottom: '1px solid #0f3460', flexShrink: 0 },
  tab:        {
    flex: 1, background: 'none', border: 'none', cursor: 'pointer',
    fontSize: 9, padding: '4px 2px', textAlign: 'center',
  },
  list:       { overflowY: 'auto', flex: 1, padding: '0 12px' },
  empty:      { color: '#546e7a', fontSize: 11, padding: '12px 0', textAlign: 'center' },
  entry:      { padding: '6px 0', borderBottom: '1px solid #0a1628' },
  meta:       { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 },
  badge:      { fontSize: 9, padding: '1px 5px', borderRadius: 8, color: '#fff' },
  importance: { fontSize: 10, color: '#ffd54f' },
  time:       { fontSize: 10, color: '#546e7a', marginLeft: 'auto' },
  content:    { fontSize: 11, color: '#b0bec5', lineHeight: 1.4 },
};
