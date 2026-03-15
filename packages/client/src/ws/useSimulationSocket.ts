import { useEffect, useRef } from 'react';
import type { WsEvent, SimulationState, SimTickPayload, AgentDialoguePayload } from '@town/shared';
import { useSimulationStore } from '../store/simulationStore.js';
import { useAgentStore } from '../store/agentStore.js';
import { useWsStore } from '../store/wsStore.js';

const WS_URL = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws`;
const RECONNECT_DELAY = 3000;

export function useSimulationSocket(): void {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { setSimulation } = useSimulationStore();
  const { setAgents, updateAgent } = useAgentStore();
  const { setConnected, addDialogue } = useWsStore();

  useEffect(() => {
    let active = true;

    function connect() {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!active) return;
        setConnected(true);
        // Load initial state
        fetch('/api/simulation/status')
          .then(r => r.json())
          .then(sim => setSimulation(sim as SimulationState));
        fetch('/api/agents')
          .then(r => r.json())
          .then(agents => setAgents(agents as Parameters<typeof setAgents>[0]));
      };

      ws.onmessage = (evt) => {
        if (!active) return;
        try {
          const event = JSON.parse(evt.data as string) as WsEvent;
          handleEvent(event);
        } catch { /* ignore parse errors */ }
      };

      ws.onclose = () => {
        if (!active) return;
        setConnected(false);
        wsRef.current = null;
        reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY);
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    function handleEvent(event: WsEvent) {
      switch (event.type) {
        case 'sim:state':
          setSimulation(event.payload as SimulationState);
          break;
        case 'sim:tick': {
          const payload = event.payload as SimTickPayload;
          payload.agents.forEach(a => updateAgent(a));
          break;
        }
        case 'agent:dialogue':
          addDialogue(event.payload as AgentDialoguePayload & { timestamp: number });
          break;
        default:
          break;
      }
    }

    connect();

    return () => {
      active = false;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, []);
}
