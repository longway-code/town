import { useEffect } from 'react';
import { useWsStore } from '../../store/wsStore.js';
import { useAgentStore } from '../../store/agentStore.js';

export function DialogueBubble() {
  const { dialogues, clearOldDialogues } = useWsStore();
  const agents = useAgentStore(s => s.agents);

  useEffect(() => {
    const interval = setInterval(clearOldDialogues, 2000);
    return () => clearInterval(interval);
  }, [clearOldDialogues]);

  const recent = dialogues.slice(-5);

  if (recent.length === 0) return null;

  return (
    <div style={styles.container}>
      <div style={styles.header}>💬 正在对话</div>
      {recent.map((d, i) => {
        const speaker = agents.find(a => a.identity.id === d.agentId);
        const partner = agents.find(a => a.identity.id === d.partnerAgentId);
        return (
          <div key={i} style={styles.bubble}>
            <span style={styles.speakerName}>
              {speaker?.identity.name ?? d.agentId.slice(0, 8)}
            </span>
            <span style={styles.arrow}> → {partner?.identity.name ?? ''}：</span>
            <span style={styles.utterance}>"{d.utterance}"</span>
          </div>
        );
      })}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute', bottom: 8, left: 8, right: 280,
    background: 'rgba(22, 33, 62, 0.92)',
    border: '1px solid #0f3460', borderRadius: 6,
    padding: '8px 12px', maxHeight: 150, overflowY: 'auto',
    pointerEvents: 'none',
  },
  header: { fontSize: 10, color: '#ffa726', marginBottom: 6 },
  bubble: { fontSize: 11, marginBottom: 4, lineHeight: 1.4 },
  speakerName: { color: '#42a5f5', fontWeight: 'bold' },
  arrow: { color: '#546e7a' },
  utterance: { color: '#e0e0e0' },
};
