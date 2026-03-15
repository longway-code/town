import type { MemoryEntry } from '@town/shared';

const TYPE_COLORS: Record<string, string> = {
  observation: '#42a5f5',
  reflection: '#ab47bc',
  dialogue: '#ffa726',
};

const TYPE_LABELS: Record<string, string> = {
  observation: '观察',
  reflection: '感悟',
  dialogue: '对话',
};

interface Props {
  memories: MemoryEntry[];
}

export function MemoryLog({ memories }: Props) {
  return (
    <div style={styles.container}>
      {memories.length === 0 && (
        <div style={styles.empty}>暂无记忆。</div>
      )}
      {memories.map(mem => (
        <div key={mem.id} style={styles.entry}>
          <div style={styles.meta}>
            <span style={{ ...styles.badge, background: TYPE_COLORS[mem.type] ?? '#555' }}>
              {TYPE_LABELS[mem.type] ?? mem.type}
            </span>
            <span style={styles.importance}>★{mem.importance.toFixed(1)}</span>
            <span style={styles.time}>{new Date(mem.createdAt).toISOString().split('T')[1]?.slice(0, 5)}</span>
          </div>
          <div style={styles.content}>{mem.content}</div>
        </div>
      ))}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { overflowY: 'auto', flex: 1 },
  empty: { color: '#546e7a', fontSize: 11, padding: '8px 0' },
  entry: { padding: '6px 0', borderBottom: '1px solid #0a1628' },
  meta: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 },
  badge: { fontSize: 9, padding: '1px 5px', borderRadius: 8, color: '#fff' },
  importance: { fontSize: 10, color: '#ffd54f' },
  time: { fontSize: 10, color: '#546e7a', marginLeft: 'auto' },
  content: { fontSize: 11, color: '#b0bec5', lineHeight: 1.4 },
};
