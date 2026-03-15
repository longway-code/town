import type { SimTime } from '@town/shared';

// Sim time starts at 2025-01-01 06:00:00 UTC
const SIM_START_UNIX = new Date('2025-01-01T06:00:00Z').getTime();

export class Clock {
  private _simTime: SimTime;
  private _simMinutesPerTick: number;

  constructor(simMinutesPerTick: number, startTime?: SimTime) {
    this._simMinutesPerTick = simMinutesPerTick;
    this._simTime = startTime ?? SIM_START_UNIX;
  }

  get simTime(): SimTime {
    return this._simTime;
  }

  get simDate(): Date {
    return new Date(this._simTime);
  }

  get simHour(): number {
    return this.simDate.getUTCHours();
  }

  get simMinute(): number {
    return this.simDate.getUTCMinutes();
  }

  get simDateString(): string {
    return this.simDate.toISOString().split('T')[0]!;
  }

  get simTimeString(): string {
    const d = this.simDate;
    return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
  }

  tick(): void {
    this._simTime += this._simMinutesPerTick * 60 * 1000;
  }

  advanceTo(simTime: SimTime): void {
    this._simTime = simTime;
  }

  setMinutesPerTick(minutes: number): void {
    this._simMinutesPerTick = minutes;
  }

  get minutesPerTick(): number {
    return this._simMinutesPerTick;
  }
}
