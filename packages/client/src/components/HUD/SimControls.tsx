import { useSimulationStore } from '../../store/simulationStore.js';
import { useWsStore } from '../../store/wsStore.js';

export function SimControls() {
  const { simulation, start, pause, reset, updateSpeed } = useSimulationStore();
  const connected = useWsStore(s => s.connected);

  const isRunning = simulation?.status === 'running';
  const isPaused = simulation?.status === 'paused';

  return (
    <div style={styles.container}>
      <div style={styles.status}>
        <span style={{ color: connected ? '#66bb6a' : '#ef5350' }}>
          {connected ? '● 已连接' : '○ 已断开'}
        </span>
        <span style={{ marginLeft: 12, color: '#aaa' }}>
          第 {simulation?.tick ?? 0} 轮
        </span>
      </div>

      <div style={styles.buttons}>
        {!isRunning ? (
          <button style={styles.btn} onClick={() => start()}>
            {isPaused ? '▶ 继续' : '▶ 开始'}
          </button>
        ) : (
          <button style={styles.btn} onClick={() => pause()}>⏸ 暂停</button>
        )}
        <button style={{ ...styles.btn, background: '#c62828' }} onClick={() => reset()}>
          ↺ 重置
        </button>
      </div>

      <div style={styles.speedControl}>
        <label style={{ fontSize: 11, color: '#aaa' }}>速度</label>
        <input
          type="range" min={200} max={5000} step={100}
          value={simulation?.config?.tickIntervalMs ?? 1000}
          onChange={e => updateSpeed(Number(e.target.value))}
          style={{ width: 80 }}
        />
        <span style={{ fontSize: 11, color: '#aaa' }}>
          {simulation?.config?.tickIntervalMs ?? 1000}ms
        </span>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex', alignItems: 'center', gap: 16,
    padding: '6px 12px', background: '#16213e',
    borderBottom: '1px solid #0f3460',
  },
  status: { fontSize: 12, display: 'flex', alignItems: 'center' },
  buttons: { display: 'flex', gap: 8 },
  btn: {
    padding: '4px 12px', background: '#0f3460', color: '#e0e0e0',
    border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12,
  },
  speedControl: { display: 'flex', alignItems: 'center', gap: 6 },
};
