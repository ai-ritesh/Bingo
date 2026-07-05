import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  PhoneCall, 
  PhoneOff, 
  Radio, 
  Users, 
  Volume1
} from 'lucide-react';
import { RoomState, Player } from '../types';

interface VoiceChatProps {
  socket: any;
  roomState: RoomState;
  currentPlayerId: string;
}

export default function VoiceChat({ socket, roomState, currentPlayerId }: VoiceChatProps) {
  const [isJoined, setIsJoined] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [volumeMultiplier, setVolumeMultiplier] = useState<number>(3.0); // Default to 3x (300%) volume boost

  const localStreamRef = useRef<MediaStream | null>(null);
  const pcsRef = useRef<Record<string, RTCPeerConnection>>({});
  const audioElementsRef = useRef<Record<string, HTMLAudioElement>>({});
  
  // Web Audio API refs for volume boosting
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodesRef = useRef<Record<string, GainNode>>({});
  const sourcesRef = useRef<Record<string, MediaStreamAudioSourceNode>>({});

  // Track voice state changes from room state
  const myProfile = roomState.players[currentPlayerId];
  const voicePlayers = Object.values(roomState.players).filter(p => p.isConnected && p.isVoiceJoined);

  // Sync internal UI state with the server profile state
  useEffect(() => {
    if (myProfile) {
      setIsJoined(!!myProfile.isVoiceJoined);
      setIsMuted(!!myProfile.isMuted);
      setIsDeafened(!!myProfile.isDeafened);
    }
  }, [myProfile]);

  // Handle peer connection teardown for a specific player
  const closeConnection = (playerId: string) => {
    if (pcsRef.current[playerId]) {
      try {
        pcsRef.current[playerId].close();
      } catch (e) {
        console.error('Error closing peer connection', e);
      }
      delete pcsRef.current[playerId];
    }
    if (audioElementsRef.current[playerId]) {
      audioElementsRef.current[playerId].pause();
      audioElementsRef.current[playerId].remove();
      delete audioElementsRef.current[playerId];
    }
    if (sourcesRef.current[playerId]) {
      try {
        sourcesRef.current[playerId].disconnect();
      } catch (e) {}
      delete sourcesRef.current[playerId];
    }
    if (gainNodesRef.current[playerId]) {
      try {
        gainNodesRef.current[playerId].disconnect();
      } catch (e) {}
      delete gainNodesRef.current[playerId];
    }
  };

  // Teardown everything
  const leaveVoiceChannel = () => {
    // 1. Tell server we left voice
    socket.emit('toggle_voice_state', {
      isVoiceJoined: false,
      isMuted: false,
      isDeafened: false
    });

    // 2. Close WebRTC peers
    Object.keys(pcsRef.current).forEach(closeConnection);

    // 3. Stop microphone stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    setIsJoined(false);
  };

  // Play remote audio stream safely with Web Audio volume booster
  const playAudio = (playerId: string, stream: MediaStream) => {
    // Lazy-initialize audio context
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const audioCtx = audioContextRef.current;
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(console.error);
    }

    // Check if audio element already exists, if not create one
    let audio = audioElementsRef.current[playerId];
    if (!audio) {
      audio = document.createElement('audio');
      audio.id = `remote-audio-${playerId}`;
      audio.autoplay = true;
      audio.muted = true; // MUST be muted so we don't hear double audio (the unboosted HTMLAudioElement audio)
      document.body.appendChild(audio);
      audioElementsRef.current[playerId] = audio;
    }
    audio.srcObject = stream;
    
    // Play with error handling (muted so silent)
    audio.play().catch(err => {
      console.warn('Audio play request failed (likely pending user interaction):', err);
    });

    // Tear down any pre-existing Web Audio nodes for this player
    if (sourcesRef.current[playerId]) {
      try { sourcesRef.current[playerId].disconnect(); } catch (e) {}
    }
    if (gainNodesRef.current[playerId]) {
      try { gainNodesRef.current[playerId].disconnect(); } catch (e) {}
    }

    // Route stream through GainNode
    try {
      const source = audioCtx.createMediaStreamSource(stream);
      const gainNode = audioCtx.createGain();
      
      // Apply volume boost multiplier (mute if locally deafened)
      const initialGain = isDeafened ? 0 : volumeMultiplier;
      gainNode.gain.setValueAtTime(initialGain, audioCtx.currentTime);
      
      source.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      sourcesRef.current[playerId] = source;
      gainNodesRef.current[playerId] = gainNode;
    } catch (e) {
      console.error('Failed to setup Web Audio API gain pipeline:', e);
    }
  };

  // Synchronize gain values in real-time when volume multiplier or deafened state changes
  useEffect(() => {
    Object.keys(gainNodesRef.current).forEach(playerId => {
      const gainNode = gainNodesRef.current[playerId];
      if (gainNode && audioContextRef.current) {
        const targetGain = isDeafened ? 0 : volumeMultiplier;
        gainNode.gain.setValueAtTime(targetGain, audioContextRef.current.currentTime);
      }
    });
  }, [volumeMultiplier, isDeafened]);

  // Handle WebRTC Peer Connection instantiation
  const initiatePeerConnection = async (targetPlayerId: string, initiateOffer: boolean) => {
    if (pcsRef.current[targetPlayerId]) {
      // Connection already exists, skip
      return;
    }

    console.log(`[WebRTC] Setting up peer connection with ${targetPlayerId} (Initiator: ${initiateOffer})`);
    
    // Setup RTCPeerConnection with public Google STUN servers
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
      ]
    });

    pcsRef.current[targetPlayerId] = pc;

    // Add local microphone tracks to the peer connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    // ICE Candidate handler
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('rtc_signal', {
          targetId: targetPlayerId,
          signal: {
            type: 'candidate',
            candidate: event.candidate
          }
        });
      }
    };

    // Connection state logger
    pc.onconnectionstatechange = () => {
      console.log(`[WebRTC] Connection with ${targetPlayerId} status: ${pc.connectionState}`);
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        closeConnection(targetPlayerId);
      }
    };

    // Stream track receiving handler
    pc.ontrack = (event) => {
      console.log(`[WebRTC] Received remote audio stream track from player ${targetPlayerId}`);
      if (event.streams && event.streams[0]) {
        playAudio(targetPlayerId, event.streams[0]);
      }
    };

    // If we are designated as the initiator, create and send the SDP offer
    if (initiateOffer) {
      try {
        const offer = await pc.createOffer({
          offerToReceiveAudio: true
        });
        await pc.setLocalDescription(offer);
        socket.emit('rtc_signal', {
          targetId: targetPlayerId,
          signal: {
            type: 'offer',
            sdp: offer.sdp
          }
        });
      } catch (e) {
        console.error('Failed to create RTC offer:', e);
      }
    }
  };

  // Join Voice Channel
  const joinVoiceChannel = async () => {
    setPermissionError(null);
    try {
      // 1. Ask for mic permission
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      });

      localStreamRef.current = stream;

      // 2. Notify server that we joined voice
      socket.emit('toggle_voice_state', {
        isVoiceJoined: true,
        isMuted: false,
        isDeafened: false
      });

      setIsJoined(true);
    } catch (err: any) {
      console.error('Microphone access denied:', err);
      setPermissionError('Microphone permission was denied. Please allow mic access in your browser to talk.');
    }
  };

  // Toggle Mute mic
  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);

    // Toggle local audio track
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !nextMuted;
      });
    }

    socket.emit('toggle_voice_state', { isMuted: nextMuted });
  };

  // Toggle Deafen sounds
  const handleToggleDeafen = () => {
    const nextDeafened = !isDeafened;
    setIsDeafened(nextDeafened);

    // Mute all remote playbacks locally (legacy, keep for safety)
    Object.values(audioElementsRef.current).forEach(audio => {
      if (audio) {
        (audio as HTMLAudioElement).muted = true;
      }
    });

    // In modern voice apps, deafen also mutes the mic
    const nextMuted = nextDeafened ? true : isMuted;
    setIsMuted(nextMuted);
    
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !nextMuted;
      });
    }

    socket.emit('toggle_voice_state', { 
      isDeafened: nextDeafened,
      isMuted: nextMuted
    });
  };

  // Handle incoming RTC signals (SDP Offer/Answer & ICE Candidates)
  useEffect(() => {
    const handleRtcSignal = async ({ senderId, signal }: { senderId: string; signal: any }) => {
      if (!isJoined) return;

      try {
        let pc = pcsRef.current[senderId];

        if (signal.type === 'offer') {
          // Received SDP Offer: Setup peer connection if not already created
          if (!pc) {
            await initiatePeerConnection(senderId, false);
            pc = pcsRef.current[senderId];
          }

          if (pc) {
            await pc.setRemoteDescription(new RTCSessionDescription({
              type: 'offer',
              sdp: signal.sdp
            }));

            // Create and send SDP Answer
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit('rtc_signal', {
              targetId: senderId,
              signal: {
                type: 'answer',
                sdp: answer.sdp
              }
            });
          }
        } else if (signal.type === 'answer') {
          // Received SDP Answer: set remote description on initiator pc
          if (pc) {
            await pc.setRemoteDescription(new RTCSessionDescription({
              type: 'answer',
              sdp: signal.sdp
            }));
          }
        } else if (signal.type === 'candidate') {
          // Received ICE Candidate: add candidate
          if (pc) {
            await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
          }
        }
      } catch (err) {
        console.error('Error handling RTC signal:', err);
      }
    };

    socket.on('rtc_signal', handleRtcSignal);
    return () => {
      socket.off('rtc_signal', handleRtcSignal);
    };
  }, [isJoined, socket]);

  // Handle peer mesh sync whenever the room voice roster changes
  useEffect(() => {
    if (!isJoined) return;

    // 1. Clean up stale peers who left the voice channel
    const activeVoicePlayerIds = Object.values(roomState.players)
      .filter(p => p.id !== currentPlayerId && p.isVoiceJoined && p.isConnected)
      .map(p => p.id);

    Object.keys(pcsRef.current).forEach(id => {
      if (!activeVoicePlayerIds.includes(id)) {
        console.log(`[WebRTC] Cleaning up stale peer connection for ${id}`);
        closeConnection(id);
      }
    });

    // 2. Establish connections with newly joined voice peers
    activeVoicePlayerIds.forEach(id => {
      if (!pcsRef.current[id]) {
        // Simple design: lexicographically smaller player ID initiates offer to avoid duplicate signals
        const shouldInitiate = currentPlayerId < id;
        initiatePeerConnection(id, shouldInitiate);
      }
    });

  }, [roomState.players, isJoined, currentPlayerId]);

  // Teardown connections on unmount
  useEffect(() => {
    return () => {
      // Stop local tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      // Close connections
      Object.keys(pcsRef.current).forEach(closeConnection);

      // Close AudioContext
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(console.error);
      }
    };
  }, []);

  return (
    <div id="voice-chat-widget" className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-xl font-sans space-y-3.5 relative overflow-hidden">
      {/* Background visual cue */}
      <div className="absolute -top-6 -right-6 w-20 h-20 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-xl pointer-events-none" />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-950 dark:text-white flex items-center gap-1.5">
              Live Voice Room
              {voicePlayers.length > 0 && (
                <span className="text-[10px] bg-indigo-600 text-white px-1.5 py-0.5 rounded-full font-black font-mono">
                  {voicePlayers.length}
                </span>
              )}
            </h4>
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">
              WebRTC ultra-low latency voice chat
            </p>
          </div>
        </div>

        {isJoined && (
          <div className="flex items-center gap-1">
            <button
              id="voice-mute-btn"
              onClick={handleToggleMute}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                isMuted
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-500 hover:bg-rose-500/20'
                  : 'bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-950 dark:hover:bg-zinc-800/80 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300'
              }`}
              title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
            >
              {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
            <button
              id="voice-deafen-btn"
              onClick={handleToggleDeafen}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                isDeafened
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-500 hover:bg-rose-500/20'
                  : 'bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-950 dark:hover:bg-zinc-800/80 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300'
              }`}
              title={isDeafened ? 'Undeafen sound' : 'Deafen sound'}
            >
              {isDeafened ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        )}
      </div>

      {permissionError && (
        <div className="text-xs text-rose-600 dark:text-rose-400 font-semibold bg-rose-500/5 p-2 rounded-xl border border-rose-500/10">
          {permissionError}
        </div>
      )}

      {/* Dynamic Voice Sound Boost Controls */}
      {isJoined && (
        <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-950 p-2 rounded-xl border border-zinc-200/80 dark:border-zinc-800">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1">
            <Volume1 className="w-3.5 h-3.5 text-indigo-500" /> Voice Boost:
          </span>
          <div className="flex gap-1">
            {[1.0, 2.0, 3.0, 4.0].map((v) => (
              <button
                key={v}
                onClick={() => setVolumeMultiplier(v)}
                className={`text-[10px] font-black px-2 py-1 rounded cursor-pointer transition-all ${
                  volumeMultiplier === v
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                {v === 1.0 ? 'Off' : `${v}x`}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Voice Active members roster */}
      <div className="space-y-1.5">
        {voicePlayers.length === 0 ? (
          <p className="text-xs text-zinc-400 dark:text-zinc-500 text-center py-2.5 italic border border-dashed border-zinc-200 dark:border-zinc-800/80 rounded-xl bg-zinc-50/50 dark:bg-zinc-950/20">
            Voice room is empty. Join to start chatting!
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {voicePlayers.map(p => {
              const isMe = p.id === currentPlayerId;
              const soundWaveState = !p.isMuted && !p.isDeafened;
              
              return (
                <div
                  key={p.id}
                  className={`flex items-center gap-2 p-2 rounded-xl border transition-all ${
                    isMe
                      ? 'bg-indigo-500/5 border-indigo-500/20 text-indigo-950 dark:text-indigo-100'
                      : 'bg-zinc-50/60 border-zinc-200 dark:bg-zinc-950/30 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200'
                  }`}
                >
                  <div className="relative flex shrink-0">
                    <div className={`w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center text-[10px] font-black uppercase tracking-tight shadow-md ${
                      soundWaveState ? 'ring-2 ring-indigo-500 animate-pulse' : ''
                    }`}>
                      {p.name.slice(0, 2)}
                    </div>
                    {/* Status badges */}
                    <span className={`absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-zinc-900 ${
                      p.isMuted ? 'bg-rose-500' : 'bg-emerald-500'
                    }`} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold truncate">
                      {p.name} {isMe && <span className="text-[9px] font-normal text-zinc-400 font-mono">(You)</span>}
                    </p>
                    <div className="flex items-center gap-1 text-[9px] text-zinc-400 font-semibold uppercase tracking-wider">
                      {p.isMuted ? (
                        <span className="text-rose-500 flex items-center gap-0.5">
                          <MicOff className="w-2.5 h-2.5" /> Muted
                        </span>
                      ) : p.isDeafened ? (
                        <span className="text-amber-500 flex items-center gap-0.5">
                          <VolumeX className="w-2.5 h-2.5" /> Deafened
                        </span>
                      ) : (
                        <span className="text-emerald-500 flex items-center gap-0.5">
                          {/* Mini voice active bars */}
                          <span className="flex items-end gap-0.5 h-2 w-3 shrink-0 py-0.5">
                            <span className="w-0.5 bg-emerald-500 animate-bounce" style={{ height: '50%', animationDelay: '0.1s' }} />
                            <span className="w-0.5 bg-emerald-500 animate-bounce" style={{ height: '100%', animationDelay: '0.3s' }} />
                            <span className="w-0.5 bg-emerald-500 animate-bounce" style={{ height: '70%', animationDelay: '0.5s' }} />
                          </span>
                          Active
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Primary Connect Button */}
      <button
        id="voice-join-toggle-btn"
        onClick={isJoined ? leaveVoiceChannel : joinVoiceChannel}
        className={`w-full py-2.5 px-4 font-extrabold text-xs tracking-wider uppercase rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
          isJoined
            ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/15'
            : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/15'
        }`}
      >
        {isJoined ? (
          <>
            <PhoneOff className="w-3.5 h-3.5" />
            Disconnect Voice Chat
          </>
        ) : (
          <>
            <PhoneCall className="w-3.5 h-3.5" />
            Connect Voice Chat
          </>
        )}
      </button>
    </div>
  );
}
