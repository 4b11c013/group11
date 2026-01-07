
import React, { useState, useEffect, useRef } from 'react';
import { TrackChannel } from './components/TrackChannel';
import { OnboardingTutorial } from './components/OnboardingTutorial';
import { ControlKnob } from './components/ControlKnob';
import { TrackData, TrackState } from './types';
import { Settings, Play, Undo, Edit2, Mic, ListMusic, Square, Power } from 'lucide-react';

// 預設音樂包資料
interface MusicPreset {
  id: string;
  name: string;
  category: string;
  tracks: Array<{
    trackId: number;
    audioPath: string;
    volume: number;
    fxInput: number;
    fxTrack: number;
  }>;
}

const musicPresets: MusicPreset[] = [
  {
    id: 'lofi-1',
    name: 'Lo-Fi Chill',
    category: 'Lo-Fi',
    tracks: [
      { trackId: 1, audioPath: '/audio/lofi/琵因音.mp3', volume: 80, fxInput: 60, fxTrack: 40 },
    ]
  },
  {
    id: 'cyberpunk-1',
    name: 'Cyberpunk Night',
    category: 'Cyberpunk',
    tracks: [
      { trackId: 1, audioPath: '/audio/cyberpunk/賽博龐克 [bass music vocals].mp3', volume: 85, fxInput: 70, fxTrack: 50 },
    ]
  },
  {
    id: 'house-1',
    name: 'House Groove',
    category: 'House',
    tracks: [
      { trackId: 1, audioPath: '/audio/house/505.mp3', volume: 90, fxInput: 50, fxTrack: 45 },
    ]
  },
];

const App: React.FC = () => {
  const [tracks, setTracks] = useState<TrackData[]>([
    { id: 1, state: TrackState.EMPTY, volume: 80, fxInput: 60, fxTrack: 40 },
    { id: 2, state: TrackState.EMPTY, volume: 80, fxInput: 30, fxTrack: 30 },
    { id: 3, state: TrackState.EMPTY, volume: 80, fxInput: 20, fxTrack: 10 },
    { id: 4, state: TrackState.EMPTY, volume: 80, fxInput: 10, fxTrack: 80 },
    { id: 5, state: TrackState.EMPTY, volume: 80, fxInput: 10, fxTrack: 30 },
  ]);

  const [bpm, setBpm] = useState(128);
  const [isMetronomeOn, setIsMetronomeOn] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(0); // 0-3
  const [showTutorial, setShowTutorial] = useState(true);
  const [globalProgress, setGlobalProgress] = useState(0); // 0-1 for a bar
  const [masterVolume, setMasterVolume] = useState(100);
  const [showLoadMenu, setShowLoadMenu] = useState(false);
  const [selectedLoadTrack, setSelectedLoadTrack] = useState(1);
  const [showMusicList, setShowMusicList] = useState(false);

  // Simulation State
  const [micLevel, setMicLevel] = useState(50);
  const [instLevel, setInstLevel] = useState(50);
  const [inputFx, setInputFx] = useState({ A: false, B: false, C: false });
  const [trackFx, setTrackFx] = useState({ A: false, B: false, C: false });
  const [inputLevel, setInputLevel] = useState(50);
  const [memoryLevel, setMemoryLevel] = useState(1);
  const [lcdMessage, setLcdMessage] = useState<string | null>(null);
  
  // Memory Banks System
  const [banks, setBanks] = useState<Record<number, TrackData[]>>(() => {
    try {
      const saved = localStorage.getItem('rc505_banks');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  const prevMemoryRef = useRef(memoryLevel);
  const tracksRef = useRef(tracks);
  
  useEffect(() => {
    tracksRef.current = tracks;
  }, [tracks]);

  // Persist Banks
  useEffect(() => {
    try {
      localStorage.setItem('rc505_banks', JSON.stringify(banks));
    } catch (e) {
      console.error("Failed to save memory banks", e);
    }
  }, [banks]);

  // Handle Memory Switch
  useEffect(() => {
    if (prevMemoryRef.current === memoryLevel) return;

    // 1. Save current tracks to previous slot
    const prevId = prevMemoryRef.current;
    const currentTracks = tracksRef.current;
    
    setBanks(prev => ({
      ...prev,
      [prevId]: currentTracks
    }));

    // 2. Load tracks from new slot
    if (banks[memoryLevel]) {
      setTracks(banks[memoryLevel]);
      setLcdMessage(`READING MEMORY ${memoryLevel}...`);
    } else {
      // Default Empty Tracks
      setTracks([
        { id: 1, state: TrackState.EMPTY, volume: 80, fxInput: 60, fxTrack: 40 },
        { id: 2, state: TrackState.EMPTY, volume: 80, fxInput: 30, fxTrack: 30 },
        { id: 3, state: TrackState.EMPTY, volume: 80, fxInput: 20, fxTrack: 10 },
        { id: 4, state: TrackState.EMPTY, volume: 80, fxInput: 10, fxTrack: 80 },
        { id: 5, state: TrackState.EMPTY, volume: 80, fxInput: 10, fxTrack: 30 },
      ]);
      setLcdMessage(`INIT MEMORY ${memoryLevel}`);
    }
    
    setTimeout(() => setLcdMessage(null), 1500);
    prevMemoryRef.current = memoryLevel;
  }, [memoryLevel]); // banks is read from state closure

  const audioCtxRef = useRef<AudioContext | null>(null);
  const nextNoteTimeRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const beatRef = useRef(0);
  const bpmRef = useRef(bpm);
  const tapTimesRef = useRef<number[]>([]);
  
  // Global Clock for Visual Sync (Animation Loop)
  useEffect(() => {
    let animationId: number;
    
    const updateGlobalClock = () => {
      // Use AudioContext time if available for tighter sync, otherwise fallback to Date.now()
      // We want to sync visuals to the audio scheduler.
      if (bpm > 0) {
        const secondsPerBar = (60 / bpm) * 4;
        let p = 0;
        
        if (audioCtxRef.current && audioCtxRef.current.state === 'running') {
             // Sync with AudioContext time
             // The scheduler schedules ahead, but currentTime is the playback head.
             const time = audioCtxRef.current.currentTime;
             p = (time % secondsPerBar) / secondsPerBar;
        } else {
             // Fallback to wall clock if audio not started yet
             const now = Date.now() / 1000;
             p = (now % secondsPerBar) / secondsPerBar;
        }
        
        setGlobalProgress(p);
      }
      animationId = requestAnimationFrame(updateGlobalClock);
    };
    
    updateGlobalClock();
    
    return () => cancelAnimationFrame(animationId);
  }, [bpm]);

  useEffect(() => {
    bpmRef.current = bpm;
  }, [bpm]);

  const handleTap = () => {
    const now = Date.now();
    const times = tapTimesRef.current;
    
    // Reset if too long since last tap (> 2 seconds)
    if (times.length > 0 && now - times[times.length - 1] > 2000) {
      tapTimesRef.current = [now];
      return;
    }
    
    tapTimesRef.current.push(now);
    if (tapTimesRef.current.length > 4) tapTimesRef.current.shift(); // Keep last 4 taps
    
    if (tapTimesRef.current.length > 1) {
       const intervals = [];
       for (let i = 1; i < tapTimesRef.current.length; i++) {
         intervals.push(tapTimesRef.current[i] - tapTimesRef.current[i-1]);
       }
       const avg = intervals.reduce((a,b) => a+b, 0) / intervals.length;
       const newBpm = Math.round(60000 / avg);
       setBpm(Math.max(40, Math.min(240, newBpm)));
    }
  };

  useEffect(() => {
    // Init AudioContext on mount (or first interaction lazily, but let's prep it)
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioCtxRef.current = new AudioContextClass();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      audioCtxRef.current?.close();
    };
  }, []);

  useEffect(() => {
    if (isMetronomeOn) {
      // Start the scheduler
      if (audioCtxRef.current?.state === 'suspended') {
        audioCtxRef.current.resume();
      }
      nextNoteTimeRef.current = audioCtxRef.current!.currentTime + 0.1;
      beatRef.current = 0;
      scheduler();
    } else {
      // Stop
      if (timerRef.current) clearTimeout(timerRef.current);
      setCurrentBeat(-1); // Turn off visuals
    }
  }, [isMetronomeOn]);

  const scheduler = () => {
    if (!audioCtxRef.current) return;
    
    // Look ahead 0.1s
    while (nextNoteTimeRef.current < audioCtxRef.current.currentTime + 0.1) {
      scheduleNote(beatRef.current, nextNoteTimeRef.current);
      nextNote();
    }
    timerRef.current = window.setTimeout(scheduler, 25);
  };

  const scheduleNote = (beatNumber: number, time: number) => {
    if (!audioCtxRef.current) return;
    
    // Audio Beep
    const osc = audioCtxRef.current.createOscillator();
    const gainNode = audioCtxRef.current.createGain();
    
    osc.connect(gainNode);
    gainNode.connect(audioCtxRef.current.destination);
    
    // High pitch on beat 1 (index 0), lower on others
    osc.frequency.value = beatNumber === 0 ? 1000 : 800;
    gainNode.gain.value = 0.1;
    
    osc.start(time);
    osc.stop(time + 0.05);

    // Visual Sync
    // Schedule visual update close to audio time
    // We can't perfectly schedule setState, so we use setTimeout
    const drawTime = (time - audioCtxRef.current.currentTime) * 1000;
    setTimeout(() => {
      setCurrentBeat(beatNumber);
    }, Math.max(0, drawTime));
  };

  const nextNote = () => {
    const secondsPerBeat = 60.0 / bpmRef.current;
    nextNoteTimeRef.current += secondsPerBeat;
    beatRef.current = (beatRef.current + 1) % 4;
  };

  const handleUpdateTrack = (id: number, updates: Partial<TrackData>) => {
    setTracks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const handleAllStop = () => {
    setTracks(prev => prev.map(t => ({ 
      ...t, 
      state: t.state !== TrackState.EMPTY ? TrackState.STOPPED : TrackState.EMPTY 
    })));
  };

  const handleAllStart = () => {
    setTracks(prev => prev.map(t => ({ 
      ...t, 
      state: t.audioUrl ? TrackState.PLAYING : t.state 
    })));
  };

  const handleAllToggle = () => {
    // Check if any track is playing
    const isAnyPlaying = tracks.some(t => t.state === TrackState.PLAYING);

    if (isAnyPlaying) {
      // STOP ALL
      handleAllStop();
    } else {
      // START ALL (only tracks with audio)
      handleAllStart();
    }
  };

  const clearAll = () => {
    if (confirm("Clear all recorded loops?")) {
      setTracks(prev => prev.map(t => ({ 
        ...t, 
        state: TrackState.EMPTY, 
        audioUrl: undefined 
      })));
    }
  };

  const handleLoadAudioToTrack = (file: File) => {
    const url = URL.createObjectURL(file);
    setTracks(prev =>
      prev.map(t =>
        t.id === selectedLoadTrack
          ? { ...t, audioUrl: url, state: TrackState.STOPPED }
          : t
      )
    );
    setLcdMessage(`LOADED TRACK ${selectedLoadTrack}`);
    setShowLoadMenu(false);
    setTimeout(() => setLcdMessage(null), 1200);
  };

  const loadPreset = (preset: MusicPreset) => {
    // 載入預設音樂包到對應的軌道
    setTracks(prev =>
      prev.map(track => {
        const presetTrack = preset.tracks.find(pt => pt.trackId === track.id);
        if (presetTrack) {
          // 處理路徑中的中文字元和特殊字元，確保 URL 正確編碼
          const pathParts = presetTrack.audioPath.split('/');
          const fileName = pathParts.pop() || '';
          const encodedFileName = encodeURIComponent(fileName);
          const encodedPath = pathParts.join('/') + '/' + encodedFileName;
          
          return {
            ...track,
            audioUrl: encodedPath,
            volume: presetTrack.volume,
            fxInput: presetTrack.fxInput,
            fxTrack: presetTrack.fxTrack,
            state: TrackState.PLAYING, // 載入後自動播放
          };
        }
        return track;
      })
    );
    setLcdMessage('LOADED...');
    setShowMusicList(false);
    setTimeout(() => setLcdMessage(null), 1500);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#111] text-white overflow-hidden select-none font-sans p-4">
      {showTutorial && <OnboardingTutorial onClose={() => setShowTutorial(false)} />}
      
      {/* Main Unit Container */}
      <div className="bg-[#0c0c0c] rounded-lg shadow-2xl border border-[#333] flex flex-col overflow-hidden max-w-[1200px] w-full">
        
        {/* TOP PANEL */}
        <div className="bg-[#111] p-6 border-b border-[#333] relative">
           {/* Top Row: Knobs & Display */}
           <div className="grid grid-cols-3 items-center mb-6 px-2">
              
              {/* Left: Input */}
              <div className="flex items-center gap-6 justify-start pl-4">
                 <ControlKnob label="INPUT FX" value={inputLevel} onChange={setInputLevel} size="large" />
                 <div className="flex gap-4 ml-2">
                    <ControlKnob label="MIC" value={micLevel} onChange={setMicLevel} size="medium" />
                    <ControlKnob label="INST" value={instLevel} onChange={setInstLevel} size="medium" />
                    <ControlKnob label="OUTPUT" value={masterVolume} onChange={setMasterVolume} size="medium" />
                 </div>
              </div>
          
              {/* Center: Display & Status */}
              <div className="flex flex-col items-center justify-center">
                 {/* LCD Display */}
                 <div className="w-80 h-28 bg-[#001] border-4 border-[#222] rounded shadow-[inset_0_0_20px_rgba(0,0,0,1)] relative flex flex-col items-center justify-center mb-3 overflow-hidden mx-auto">
                    {/* LOAD 按鈕 */}
                    {!showMusicList && (
                      <button
                        onClick={() => setShowMusicList(true)}
                        className="absolute top-1 right-1 text-[8px] px-1.5 py-0.5 rounded bg-blue-900/40 border border-blue-700 text-blue-100 hover:bg-blue-800/60 transition-colors font-mono"
                      >
                        LOAD
                      </button>
                    )}

                    {/* 載入音樂選單（保留原有功能） */}
                    {showLoadMenu && !showMusicList && (
                      <div className="absolute top-2 right-2 w-48 bg-[#001]/95 border border-[#113] rounded shadow-lg p-2 text-[10px] z-20 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-blue-100 font-mono">載入音樂選單</span>
                          <button
                            onClick={() => setShowLoadMenu(false)}
                            className="text-gray-400 hover:text-white text-[9px]"
                          >
                            ✕
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-blue-200 whitespace-nowrap">目標軌道</span>
                          <select
                            className="flex-1 bg-[#002] border border-[#123] text-blue-100 text-[10px] rounded px-1 py-0.5"
                            value={selectedLoadTrack}
                            onChange={(e) => setSelectedLoadTrack(parseInt(e.target.value))}
                          >
                            {tracks.map(t => (
                              <option key={t.id} value={t.id}>Track {t.id}</option>
                            ))}
                          </select>
                        </div>
                        <label className="w-full inline-flex items-center justify-center gap-2 px-2 py-1 rounded bg-blue-900/60 border border-blue-700 text-blue-100 hover:bg-blue-800/80 cursor-pointer">
                          <input
                            type="file"
                            accept="audio/*"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) handleLoadAudioToTrack(f);
                            }}
                          />
                          <span>選擇音檔</span>
                        </label>
                        <p className="text-[9px] text-blue-200/70 leading-tight">
                          選擇音檔後會載入到指定軌道，狀態為停止。
                        </p>
                      </div>
                    )}

                    <div className="absolute inset-0 bg-blue-900/10 pointer-events-none" />
                    
                    {/* 音樂列表視圖 */}
                    {showMusicList ? (
                      <div className="w-full h-full flex flex-col items-center justify-center px-2 py-1 relative z-10">
                        <div className="flex items-center justify-between w-full mb-1">
                          <span className="text-[8px] text-blue-200 font-mono opacity-70">MUSIC PRESETS</span>
                          <button
                            onClick={() => setShowMusicList(false)}
                            className="text-[8px] text-blue-300 hover:text-blue-100 font-mono"
                          >
                            BACK
                          </button>
                        </div>
                        <div className="flex-1 w-full overflow-y-auto space-y-1">
                          {musicPresets.map((preset) => (
                            <button
                              key={preset.id}
                              onClick={() => loadPreset(preset)}
                              className="w-full text-left px-2 py-1 rounded bg-blue-900/20 border border-blue-700/30 hover:bg-blue-800/40 hover:border-blue-600/50 transition-colors"
                            >
                              <div className="text-[9px] font-mono text-blue-100 font-bold">
                                {preset.name}
                              </div>
                              <div className="text-[7px] font-mono text-blue-300/70">
                                {preset.category}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : lcdMessage ? (
                      <div className="flex items-center justify-center h-full animate-pulse">
                        <span className="text-lg font-mono text-blue-100 font-bold tracking-widest uppercase text-center px-2">
                          {lcdMessage}
                        </span>
                      </div>
                    ) : (
                      <>
                        <span className="text-blue-200 font-mono text-xs opacity-50 mb-1">RC-505 LOOP STATION</span>
                        <div className="flex items-center gap-8 px-4 w-full justify-between">
                           <div className="flex flex-col items-center">
                              <span className="text-xs text-blue-300 font-bold mb-1">MEMORY</span>
                              <span className="text-2xl font-mono text-red-500 font-bold drop-shadow-[0_0_5px_rgba(255,0,0,0.5)]">
                                {memoryLevel}
                              </span>
                           </div>
                           <div className="flex flex-col items-center">
                               <span className="text-xs text-blue-300 font-bold mb-1">BPM</span>
                               <span className="text-2xl font-mono text-blue-100 font-bold drop-shadow-[0_0_5px_rgba(100,200,255,0.8)]">
                                 {bpm.toFixed(1)}
                               </span>
                           </div>
                        </div>
                        <div className="w-full flex justify-center gap-1 mt-1">
                          {[0,1,2,3].map(i => (
                            <div key={i} className={`w-2 h-2 rounded-full ${currentBeat === i && isMetronomeOn ? 'bg-red-500' : 'bg-[#112]'}`} />
                          ))}
                        </div>
                      </>
                    )}
                 </div>
                 
                 {/* Transport Buttons */}
                 <div className="flex gap-3 justify-center">
                    <button 
                       onClick={handleTap}
                       className="w-9 h-9 rounded-full bg-[#222] border border-[#444] shadow-lg flex items-center justify-center active:bg-[#333] active:translate-y-px group"
                    >
                       <span className="text-[8px] font-bold text-gray-400 group-hover:text-white">TAP</span>
                    </button>
                    <button 
                       onClick={() => setIsMetronomeOn(!isMetronomeOn)}
                       className={`w-9 h-9 rounded-full border border-[#444] shadow-lg flex items-center justify-center active:translate-y-px transition-colors ${isMetronomeOn ? 'bg-red-900/50' : 'bg-[#222]'}`}
                    >
                       <span className={`text-[8px] font-bold ${isMetronomeOn ? 'text-red-400' : 'text-gray-400'}`}>RHYTHM</span>
                    </button>
                 </div>
              </div>

              {/* Right: Output & Memory */}
              <div className="flex items-center gap-8 justify-end pr-8">
                 <ControlKnob label="MEMORY" value={memoryLevel} onChange={(v) => setMemoryLevel(Math.max(1, Math.min(99, v)))} size="large" />
              </div>
           </div>

           {/* Middle Row: FX Sections */}
           <div className="flex justify-between items-center px-4">
              {/* Input FX */}
              <div className="flex flex-col items-center gap-2 bg-[#151515] p-2 rounded-lg border border-[#222]">
                 <span className="text-[8px] font-bold text-red-700 tracking-widest">INPUT FX</span>
                 <div className="flex gap-3">
                    {['A', 'B', 'C'].map(l => (
                      <button key={l} 
                        onClick={() => setInputFx(p => ({...p, [l]: !p[l as keyof typeof inputFx]}))}
                        className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all shadow-md ${inputFx[l as keyof typeof inputFx] ? 'bg-red-900 border-red-500 shadow-[0_0_10px_rgba(220,38,38,0.3)]' : 'bg-[#222] border-[#333]'}`}
                      >
                        <span className={`font-bold text-xs ${inputFx[l as keyof typeof inputFx] ? 'text-white' : 'text-gray-600'}`}>{l}</span>
                      </button>
                    ))}
            </div>
          </div>

              {/* Master Transport */}
              <div className="flex gap-6 items-center mx-8">
                 <button onClick={handleAllStart} className="flex flex-col items-center gap-1 group">
                    <div className="w-16 h-16 rounded-full bg-[#222] border-2 border-[#333] flex items-center justify-center shadow-lg group-active:translate-y-px hover:border-green-800 transition-colors">
                       <Play className="fill-green-600 text-green-600" size={24} />
                    </div>
                    <span className="text-[8px] font-bold text-gray-500">ALL START</span>
                 </button>
                 <button onClick={handleAllStop} className="flex flex-col items-center gap-1 group">
                    <div className="w-16 h-16 rounded-full bg-[#222] border-2 border-[#333] flex items-center justify-center shadow-lg group-active:translate-y-px hover:border-yellow-800 transition-colors">
                       <Square className="fill-yellow-600 text-yellow-600" size={24} />
                    </div>
                    <span className="text-[8px] font-bold text-gray-500">ALL STOP</span>
                 </button>
              </div>

              {/* Track FX */}
              <div className="flex flex-col items-center gap-2 bg-[#151515] p-2 rounded-lg border border-[#222]">
                 <span className="text-[8px] font-bold text-green-700 tracking-widest">TRACK FX</span>
                 <div className="flex gap-3">
                    {['A', 'B', 'C'].map(l => (
                      <button key={l} 
                        onClick={() => setTrackFx(p => ({...p, [l]: !p[l as keyof typeof trackFx]}))}
                        className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all shadow-md ${trackFx[l as keyof typeof trackFx] ? 'bg-green-900 border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]' : 'bg-[#222] border-[#333]'}`}
                      >
                        <span className={`font-bold text-xs ${trackFx[l as keyof typeof trackFx] ? 'text-white' : 'text-gray-600'}`}>{l}</span>
                      </button>
               ))}
            </div>
          </div>
        </div>
        </div>
        
        {/* BOTTOM PANEL (TRACKS) */}
        <div className="flex-1 bg-[#0a0a0a] p-4 flex gap-1 justify-center items-stretch overflow-x-auto min-h-[400px]">
        {tracks.map(track => (
          <TrackChannel 
            key={track.id} 
            data={track} 
                onUpdate={handleUpdateTrack} 
                audioCtx={audioCtxRef.current}
                inputLevel={inputLevel}
                micLevel={micLevel}
                instLevel={instLevel}
                inputFx={inputFx}
                trackFx={trackFx}
            masterVolume={masterVolume}
              />
            ))}
          </div>

        </div>

      {/* Footer Branding */}
      <div className="mt-8 text-[#333] text-xs font-mono">
         BOSS RC-505 SIMULATOR
        </div>
    </div>
  );
};

export default App;
