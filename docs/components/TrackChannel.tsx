
import React, { useEffect, useRef, useState } from 'react';
import { TrackState, TrackData } from '../types';
import { ControlKnob } from './ControlKnob';
import { VerticalFader } from './VerticalFader';

interface TrackChannelProps {
  data: TrackData;
  onUpdate: (id: number, updates: Partial<TrackData>) => void;
  audioCtx: AudioContext | null;
  inputLevel: number;
  micLevel: number;
  instLevel: number;
  inputFx: { A: boolean; B: boolean; C: boolean };
  trackFx: { A: boolean; B: boolean; C: boolean };
  masterVolume: number;
}

function makeDistortionCurve(amount: number) {
  const k = amount,
    n_samples = 44100,
    curve = new Float32Array(n_samples),
    deg = Math.PI / 180;
  for (let i = 0; i < n_samples; ++i ) {
    const x = i * 2 / n_samples - 1;
    curve[i] = ( 3 + k ) * x * 20 * deg / ( Math.PI + k * Math.abs(x) );
  }
  return curve;
}

export const TrackChannel: React.FC<TrackChannelProps> = ({ 
  data, 
  onUpdate, 
  audioCtx,
  inputLevel,
  micLevel,
  instLevel,
  inputFx,
  trackFx,
  masterVolume
}) => {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const fxNodesRef = useRef<AudioNode[]>([]);

  // Handle Playback Loop & Audio Graph
  useEffect(() => {
    if (data.audioUrl) {
      if (!audioRef.current) {
        const audio = new Audio(data.audioUrl);
        audio.loop = true;
        audioRef.current = audio;
        
        // Setup Web Audio Graph if Context is ready
        if (audioCtx) {
           try {
             const source = audioCtx.createMediaElementSource(audio);
             sourceNodeRef.current = source;
             const gain = audioCtx.createGain();
             gainNodeRef.current = gain;
             
             // Initial Connect (Source -> Gain -> Dest) - FX inserted later
             source.connect(gain);
             gain.connect(audioCtx.destination);
           } catch (e) {
             console.error("Audio Graph Setup Error", e);
           }
        }
      } else {
        // Update SRC and reload
        audioRef.current.src = data.audioUrl;
        audioRef.current.load(); // 重新載入音檔
      }
    }
  }, [data.audioUrl, audioCtx]); // Depend on audioCtx to setup graph once ready

  // Handle Track FX Chain Update
  useEffect(() => {
    if (!audioCtx || !sourceNodeRef.current || !gainNodeRef.current) return;

    // Disconnect to rebuild
    sourceNodeRef.current.disconnect();
    fxNodesRef.current.forEach(n => { n.disconnect(); });
    fxNodesRef.current = [];
    
    let lastNode: AudioNode = sourceNodeRef.current;

    // Apply Track FX
    if (trackFx.A) { // Delay
       const delay = audioCtx.createDelay();
       delay.delayTime.value = 0.25; // 250ms
       // For simple series delay
       lastNode.connect(delay);
       lastNode = delay;
       fxNodesRef.current.push(delay);
    }
    if (trackFx.B) { // Filter
       const filter = audioCtx.createBiquadFilter();
       filter.type = 'highpass';
       filter.frequency.value = 800;
       lastNode.connect(filter);
       lastNode = filter;
       fxNodesRef.current.push(filter);
    }
    if (trackFx.C) { // Lo-Fi Saturation
       const shaper = audioCtx.createWaveShaper();
       shaper.curve = makeDistortionCurve(20);
       lastNode.connect(shaper);
       lastNode = shaper;
       fxNodesRef.current.push(shaper);
    }

    // Connect to Volume Gain
    lastNode.connect(gainNodeRef.current);
    
    // Connect Gain to Output
    gainNodeRef.current.disconnect(); // ensure clean
    gainNodeRef.current.connect(audioCtx.destination);

  }, [trackFx, audioCtx]);

  // Handle State Transitions
  useEffect(() => {
    if (!audioRef.current) return;

    if (data.state === TrackState.PLAYING) {
      // Ensure context is running
      if (audioCtx?.state === 'suspended') audioCtx.resume();
      
      audioRef.current.play().catch(e => console.error("Playback failed", e));
    } else if (data.state === TrackState.STOPPED || data.state === TrackState.EMPTY) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, [data.state, audioCtx]);

  // Handle Volume
  useEffect(() => {
    const finalVolume = (data.volume / 100) * (masterVolume / 100);
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = finalVolume;
    } else if (audioRef.current) {
      // Fallback if no Web Audio
      audioRef.current.volume = finalVolume;
    }
  }, [data.volume, masterVolume]);


  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      let finalStream = stream;

      // Apply Input Processing if AudioContext is available
      if (audioCtx) {
        if (audioCtx.state === 'suspended') await audioCtx.resume();
        
        const source = audioCtx.createMediaStreamSource(stream);
        const gainNode = audioCtx.createGain();
        
        // Calculate Gain: (Input Master * Channel Level)
        // Simplified mixing logic: Mic and Inst are treated as max for now
        const level = (inputLevel / 50) * (Math.max(micLevel, instLevel) / 50); 
        gainNode.gain.value = level;

        let lastNode: AudioNode = gainNode;
        source.connect(gainNode);

        // Input FX Chain
        if (inputFx.A) { // Robot / Ring Mod (simulated with filter)
           const filter = audioCtx.createBiquadFilter();
           filter.type = 'lowpass';
           filter.frequency.value = 400;
           lastNode.connect(filter);
           lastNode = filter;
        }
        if (inputFx.B) { // High Pass
           const filter = audioCtx.createBiquadFilter();
           filter.type = 'highpass';
           filter.frequency.value = 1000;
           lastNode.connect(filter);
           lastNode = filter;
        }
        if (inputFx.C) { // Boost/Distortion
           const waveShaper = audioCtx.createWaveShaper();
           waveShaper.curve = makeDistortionCurve(400);
           lastNode.connect(waveShaper);
           lastNode = waveShaper;
        }

        const dest = audioCtx.createMediaStreamDestination();
        lastNode.connect(dest);
        finalStream = dest.stream;
      }

      const recorder = new MediaRecorder(finalStream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        onUpdate(data.id, { audioUrl: url, state: TrackState.PLAYING });
      };

      recorder.start();
      onUpdate(data.id, { state: TrackState.RECORDING });
    } catch (err) {
      console.error("Microphone access denied", err);
      alert("Please allow microphone access to record loops.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      // recorder.onstop will trigger and update state to PLAYING
    }
  };

  const handleMainClick = () => {
    if (data.state === TrackState.EMPTY || data.state === TrackState.STOPPED) {
      startRecording();
    } else if (data.state === TrackState.RECORDING) {
      stopRecording();
    } else if (data.state === TrackState.PLAYING) {
      onUpdate(data.id, { state: TrackState.STOPPED });
    }
  };

  const handleStopClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (data.state === TrackState.RECORDING) {
        stopRecording();
    } else if (data.state === TrackState.PLAYING) {
        // 點擊後暫停
        onUpdate(data.id, { state: TrackState.STOPPED });
    } else if (data.state === TrackState.STOPPED && data.audioUrl) {
        // 點擊後繼續播放（如果有音檔）
        onUpdate(data.id, { state: TrackState.PLAYING });
    }
  };

  const getStatusConfig = () => {
    switch (data.state) {
      case TrackState.RECORDING:
        return { label: 'RECORDING', color: 'text-red-500', bar: 'bg-red-500 shadow-[0_0_10px_red]' };
      case TrackState.PLAYING:
        return { label: 'PLAYING >', color: 'text-green-500', bar: 'bg-green-500 shadow-[0_0_10px_green]' };
      case TrackState.STOPPED:
        return { label: 'STOPPED', color: 'text-yellow-600', bar: 'bg-yellow-900 shadow-none opacity-50' };
      default:
        return { label: 'EMPTY', color: 'text-gray-600', bar: 'bg-transparent' };
    }
  };

  const status = getStatusConfig();

  return (
    <div className="flex-1 min-w-[140px] max-w-[180px] h-full mx-1">
      <div className="h-full bg-[#151515] border-x border-white/5 flex flex-col relative group px-2 pb-4 pt-4">
        
        {/* Upper Section: Controls & Fader */}
        <div className="flex flex-1 mb-4 relative">
           {/* Left Col: Buttons */}
           <div className="flex flex-col items-center gap-6 z-10 pt-2">
              <button className="w-14 h-8 rounded-full border border-green-900 bg-[#0a0a0a] shadow-[inset_0_0_10px_rgba(0,255,0,0.1)] flex items-center justify-center active:translate-y-px active:shadow-inner hover:border-green-600 transition-colors">
                <span className="text-[10px] font-bold text-green-600 tracking-wider">EDIT</span>
              </button>
              
              <div className="flex flex-col items-center gap-1">
                 <span className="text-[6px] text-gray-600 font-bold uppercase whitespace-nowrap scale-75 origin-center">Clear: Hold &gt; 2 Sec</span>
                 <button 
                   onClick={handleStopClick}
                   className="w-10 h-10 rounded-full bg-[#222] border border-[#333] shadow-lg flex items-center justify-center active:bg-[#111] active:translate-y-px group"
                 >
                   {data.state === TrackState.PLAYING ? (
                     // 暫停圖標（兩個垂直線條）
                     <div className="flex items-center gap-0.5">
                       <div className="w-1 h-3 bg-gray-400 rounded-[1px] group-active:bg-white shadow-[0_0_2px_black]" />
                       <div className="w-1 h-3 bg-gray-400 rounded-[1px] group-active:bg-white shadow-[0_0_2px_black]" />
                     </div>
                   ) : (
                     // 播放圖標（三角形）
                     <div className="w-0 h-0 border-l-[6px] border-l-gray-400 border-y-[4px] border-y-transparent ml-0.5 group-active:border-l-white shadow-[0_0_2px_black]" />
                   )}
                 </button>
              </div>

              <span className="text-3xl font-black text-[#333] font-sans mt-2">{data.id}</span>
           </div>

           {/* Right Col: Fader */}
           <div className="h-full relative ml-12 mr-auto">
              <VerticalFader 
                value={data.volume} 
                onChange={(val) => onUpdate(data.id, { volume: val })} 
              />
           </div>
        </div>

        {/* Lower Section: Loop Ring */}
        <div className="flex justify-center items-end mt-auto">
             <div className="relative w-28 h-28 flex items-center justify-center">
                {/* Outer Ring Segments */}
                <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full rotate-[-90deg]">
                   {/* Background Track */}
                   <circle cx="50" cy="50" r="44" fill="none" stroke="#1a1a1a" strokeWidth="8" />
                   
                   {/* Lit Segments */}
                   <circle 
                     cx="50" cy="50" r="44" fill="none" 
                     stroke={data.state === TrackState.RECORDING ? '#ef4444' : (data.state === TrackState.PLAYING ? '#22c55e' : '#333')} 
                     strokeWidth="6" 
                     strokeDasharray="2 4"
                     className="transition-colors duration-200"
                   />
                </svg>

                {/* Inner Button */}
                <div 
                  onClick={handleMainClick}
                  className="w-16 h-16 rounded-full bg-gradient-to-b from-[#222] to-[#000] shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_5px_10px_black] border border-[#111] flex items-center justify-center cursor-pointer active:scale-95 transition-transform z-10"
                >
                   {data.state === TrackState.PLAYING && (
                      <div className="flex items-center gap-1">
                         <div className="w-0 h-0 border-l-[10px] border-l-green-500 border-y-[6px] border-y-transparent ml-1" />
                         <div className="w-3 h-3 rounded-full bg-green-500" />
                      </div>
                   )}
                   {data.state === TrackState.RECORDING && <div className="w-4 h-4 rounded-full bg-red-600 shadow-[0_0_10px_red]" />}
                   {(data.state === TrackState.EMPTY || data.state === TrackState.STOPPED) && (
                      <div className="flex items-center gap-1 opacity-20">
                         <div className="w-0 h-0 border-l-[10px] border-l-white border-y-[6px] border-y-transparent ml-1" />
                         <div className="w-3 h-3 rounded-full bg-white" />
                      </div>
                   )}
                </div>
             </div>
        </div>

      </div>
    </div>
  );
};
