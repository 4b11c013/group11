
export enum TrackState {
  EMPTY = 'EMPTY',
  RECORDING = 'RECORDING',
  PLAYING = 'PLAYING',
  STOPPED = 'STOPPED'
}

export interface TrackData {
  id: number;
  state: TrackState;
  volume: number;
  fxInput: number;
  fxTrack: number;
  audioUrl?: string; // Stores the URL of the recorded audio blob
  isReverse?: boolean;
  playMode?: 'LOOP' | 'ONE_SHOT';
  latencyOffset?: number; // Custom latency compensation per track
}
