import { useSimulationStore } from '../../store/simulationStore.js';

export function ClockDisplay() {
  const simulation = useSimulationStore(s => s.simulation);
  if (!simulation) return null;

  const date = new Date(simulation.simTime);
  const timeStr = `${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}`;
  const dateStr = date.toISOString().split('T')[0];

  return (
    <div style={styles.container}>
      <div style={styles.time}>{timeStr}</div>
      <div style={styles.date}>{dateStr}</div>
      <div style={styles.agents}>
        {simulation.agentCount} agent{simulation.agentCount !== 1 ? 's' : ''}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: '4px 16px', minWidth: 100,
  },
  time: { fontSize: 20, fontWeight: 'bold', color: '#42a5f5', fontFamily: 'Courier New' },
  date: { fontSize: 10, color: '#7a8fa6' },
  agents: { fontSize: 10, color: '#66bb6a' },
};
