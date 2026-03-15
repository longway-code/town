import { useAgentStore } from '../../store/agentStore.js';
import { useSimulationStore } from '../../store/simulationStore.js';
import { MemoryLog } from './MemoryLog.js';

export function AgentDetail() {
  const { agents, selectedAgentId, agentMemories } = useAgentStore();
  const simTime = useSimulationStore(s => s.simulation?.simTime ?? 0);
  const agent = agents.find(a => a.identity.id === selectedAgentId);

  if (!agent) {
    return (
      <div style={styles.empty}>
        点击地图或列表中的角色查看详情。
      </div>
    );
  }

  const { identity, status, currentAction, currentPlan } = agent;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.name}>{identity.name}</div>
        <div style={styles.meta}>{identity.age}岁 · {identity.occupation}</div>
        <div style={styles.traits}>{identity.traits.join(' · ')}</div>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionLabel}>当前行动</div>
        <div style={styles.value}>{currentAction.description}</div>
        <div style={{ ...styles.badge, background: statusColor(status) }}>{STATUS_LABELS[status] ?? status}</div>
      </div>

      {currentPlan && (
        <div style={styles.section}>
          <div style={styles.sectionLabel}>今日计划（第 {new Date(simTime * 1000).getUTCHours()} 时）</div>
          <div style={styles.planHour}>
            {currentPlan.hourlyPlan[new Date(simTime * 1000).getUTCHours()] ?? '本时段暂无计划'}
          </div>
        </div>
      )}

      <div style={styles.section}>
        <div style={styles.sectionLabel}>人生目标</div>
        {identity.goals.map((g, i) => (
          <div key={i} style={styles.goal}>• {g}</div>
        ))}
      </div>

      <div style={{ ...styles.section, flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={styles.sectionLabel}>记忆日志（{agentMemories.length}条）</div>
        <MemoryLog memories={agentMemories} />
      </div>
    </div>
  );
}

const STATUS_LABELS: Record<string, string> = {
  idle: '空闲', moving: '移动中', acting: '行动中',
  conversing: '交谈中', sleeping: '睡觉中',
};

function statusColor(status: string): string {
  const map: Record<string, string> = {
    idle: '#546e7a', moving: '#2e7d32', acting: '#1565c0',
    conversing: '#e65100', sleeping: '#4527a0',
  };
  return map[status] ?? '#333';
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' },
  header: { padding: '10px 12px', borderBottom: '1px solid #0f3460', background: '#16213e' },
  name: { fontSize: 14, fontWeight: 'bold', color: '#42a5f5' },
  meta: { fontSize: 11, color: '#7a8fa6', marginTop: 2 },
  traits: { fontSize: 10, color: '#546e7a', marginTop: 4 },
  section: { padding: '8px 12px', borderBottom: '1px solid #0a1628' },
  sectionLabel: { fontSize: 10, color: '#546e7a', textTransform: 'uppercase', marginBottom: 4 },
  value: { fontSize: 12, color: '#e0e0e0' },
  badge: { display: 'inline-block', padding: '1px 6px', borderRadius: 10, fontSize: 10, color: '#fff', marginTop: 4 },
  planHour: { fontSize: 12, color: '#aaa', fontStyle: 'italic' },
  goal: { fontSize: 11, color: '#90a4ae', margin: '2px 0' },
  empty: { padding: 20, color: '#546e7a', fontSize: 12, textAlign: 'center' },
};
