import { useAgentStore } from '../../store/agentStore.js';

const STATUS_EMOJI: Record<string, string> = {
  idle: '💤', moving: '🚶', acting: '⚡', conversing: '💬', sleeping: '😴',
};

const STATUS_LABEL: Record<string, string> = {
  idle: '空闲', moving: '移动中', acting: '行动中', conversing: '交谈中', sleeping: '睡觉',
};

export function AgentList() {
  const { agents, selectedAgentId, selectAgent } = useAgentStore();

  return (
    <div style={styles.container}>
      <div style={styles.header}>角色列表（{agents.length}人）</div>
      <div style={styles.list}>
        {agents.map(agent => (
          <div
            key={agent.identity.id}
            style={{
              ...styles.item,
              background: agent.identity.id === selectedAgentId ? '#0f3460' : 'transparent',
            }}
            onClick={() => selectAgent(
              agent.identity.id === selectedAgentId ? null : agent.identity.id
            )}
          >
            <span style={styles.emoji}>{STATUS_EMOJI[agent.status] ?? '?'}</span>
            <div style={styles.info}>
              <div style={styles.name}>{agent.identity.name}</div>
              <div style={styles.action}>{agent.currentAction.description?.slice(0, 30) ?? ''}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', height: '100%' },
  header: { padding: '8px 12px', fontSize: 12, color: '#7a8fa6', borderBottom: '1px solid #0f3460' },
  list: { overflowY: 'auto', flex: 1 },
  item: {
    display: 'flex', alignItems: 'center', padding: '6px 10px',
    cursor: 'pointer', borderBottom: '1px solid #0a1628',
    transition: 'background 0.1s',
  },
  emoji: { fontSize: 16, marginRight: 8 },
  info: { flex: 1, minWidth: 0 },
  name: { fontSize: 12, fontWeight: 'bold', color: '#e0e0e0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  action: { fontSize: 10, color: '#7a8fa6', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
};
