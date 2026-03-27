import { getSocket } from "./socket";

type OfferPayload = { from: string; sdp: RTCSessionDescriptionInit };
type AnswerPayload = { from: string; sdp: RTCSessionDescriptionInit };
type CandidatePayload = { from: string; candidate: RTCIceCandidateInit | null };

export type VoiceParticipant = {
  socketId: string;
  userId: string;
  username: string;
  channelId: string;
  speaking: boolean;
  muted?: boolean;
};

type VoiceMembersPayload = {
  channelId: string;
  members: VoiceParticipant[];
};

type VoiceUserJoinedPayload = {
  socketId: string;
  userId: string;
  username: string;
  channelId: string;
};

type VoiceUserLeftPayload = {
  socketId: string;
  userId: string;
  username: string;
  channelId: string;
};

type VoiceSpeakingPayload = {
  channelId: string;
  socketId: string;
  userId: string;
  username: string;
  speaking: boolean;
};

type VoiceMutePayload = {
  channelId: string;
  socketId: string;
  userId: string;
  username: string;
  muted: boolean;
};

type PeerInfo = {
  pc: RTCPeerConnection;
  stream: MediaStream;
  audio: HTMLAudioElement;
  volume: number;
};

export class VoiceManager {
  private rawLocalStream: MediaStream | null = null;
  private outboundStream: MediaStream | null = null;

  private peers = new Map<string, PeerInfo>();
  private audioCtx: AudioContext | null = null;
  private channelId: string | null = null;
  private onChange: () => void;
  private onForcedDisconnect?: () => void;

  private participantsByChannel = new Map<string, VoiceParticipant[]>();

  private micSource: MediaStreamAudioSourceNode | null = null;
  private highpass: BiquadFilterNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private micGain: GainNode | null = null;
  private gateGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private destination: MediaStreamAudioDestinationNode | null = null;

  private speakingTimer: number | null = null;
  private speakingState = false;

  private globalListenersAttached = false;
  private voiceListenersAttached = false;
  private processingOffers = new Set<string>();
  private processingAnswers = new Set<string>();
  private offeringPeers = new Set<string>();

  private muted = false;
  private pushToTalk = false;
  private pttPressed = false;
  private readonly pttKey = "v";

  private readonly gateThreshold = 22;
  private selfMicLevel = 1;

  constructor(onPeersChanged: () => void, onForcedDisconnect?: () => void) {
    this.onChange = onPeersChanged;
    this.onForcedDisconnect = onForcedDisconnect;

    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
    window.addEventListener("blur", this.handleWindowBlur);
  }

  get peerIds(): string[] {
    return Array.from(this.peers.keys());
  }

  get isMuted(): boolean {
    return this.muted;
  }

  get isPushToTalk(): boolean {
    return this.pushToTalk;
  }

  get pushToTalkLabel(): string {
    return "Hold V";
  }

  getSelfMicLevel(): number {
    return this.selfMicLevel;
  }

  setSelfMicLevel(v: number) {
    const next = Math.max(0, Math.min(2, v));
    this.selfMicLevel = next;

    if (this.micGain) {
      this.micGain.gain.value = next;
    }

    this.onChange();
  }

  getVolume(socketId: string): number {
    return this.peers.get(socketId)?.volume ?? 1;
  }

  setVolume(socketId: string, v: number) {
    const p = this.peers.get(socketId);
    if (!p) return;
    const next = Math.max(0, Math.min(2, v));
    p.volume = next;
    p.audio.volume = Math.max(0, Math.min(1, next / 2));
    this.onChange();
  }

  getParticipants(channelId: string): VoiceParticipant[] {
    return this.participantsByChannel.get(channelId) ?? [];
  }

  setMuted(next: boolean) {
    this.muted = !!next;

    if (this.channelId) {
      getSocket().emit("voice:mute", {
        channelId: this.channelId,
        muted: this.muted,
      });
    }

    this.applyLocalTransmitState(true);
    this.onChange();
  }

  toggleMute() {
    this.setMuted(!this.muted);
  }

  setPushToTalk(next: boolean) {
    this.pushToTalk = !!next;
    if (!this.pushToTalk) this.pttPressed = false;
    this.applyLocalTransmitState(true);
    this.onChange();
  }

  togglePushToTalk() {
    this.setPushToTalk(!this.pushToTalk);
  }

  async join(channelId: string) {
    if (this.channelId === channelId) return;

    await this.leave();
    this.channelId = channelId;

    this.audioCtx = new (
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext
    )();

    this.rawLocalStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
      },
    });

    if (this.audioCtx.state === "suspended") {
      await this.audioCtx.resume();
    }

    this.buildLocalProcessingChain();
    this.attachGlobalSocketListeners();
    this.attachVoiceSocketListeners();

    getSocket().emit("voice:join", { channelId }, () => {
      if (this.channelId) {
        getSocket().emit("voice:mute", {
          channelId: this.channelId,
          muted: this.muted,
        });
      }
    });

    this.startSpeakingDetection();
    this.onChange();
  }

  async leave() {
    const socket = getSocket();

    if (this.channelId) {
      socket.emit("voice:leave", { channelId: this.channelId });
      this.participantsByChannel.set(this.channelId, []);
    }

    this.stopSpeakingDetection();
    this.channelId = null;
    this.speakingState = false;
    this.pttPressed = false;

    this.offeringPeers.clear();
    this.processingOffers.clear();
    this.processingAnswers.clear();

    for (const [, info] of this.peers) {
      info.pc.close();
      info.stream.getTracks().forEach((t) => t.stop());
      info.audio.pause();
      info.audio.srcObject = null;
    }
    this.peers.clear();

    if (this.rawLocalStream) {
      this.rawLocalStream.getTracks().forEach((t) => t.stop());
      this.rawLocalStream = null;
    }

    if (this.outboundStream) {
      this.outboundStream.getTracks().forEach((t) => t.stop());
      this.outboundStream = null;
    }

    try {
      this.micSource?.disconnect();
    } catch (err) {
      // ignore disconnect errors
    }
    try {
      this.highpass?.disconnect();
    } catch (err) {
      // ignore disconnect errors
    }
    try {
      this.compressor?.disconnect();
    } catch (err) {
      // ignore disconnect errors
    }
    try {
      this.micGain?.disconnect();
    } catch (err) {
      // ignore disconnect errors
    }
    try {
      this.gateGain?.disconnect();
    } catch (err) {
      // ignore disconnect errors
    }
    try {
      this.analyser?.disconnect();
    } catch (err) {
      // ignore disconnect errors
    }

    this.micSource = null;
    this.highpass = null;
    this.compressor = null;
    this.micGain = null;
    this.gateGain = null;
    this.analyser = null;
    this.destination = null;

    if (this.audioCtx) {
      try {
        await this.audioCtx.close();
      } catch (err) {
        // ignore close errors
      }
      this.audioCtx = null;
    }

    this.detachVoiceSocketListeners();
    this.onChange();
  }

  private buildLocalProcessingChain() {
    if (!this.audioCtx || !this.rawLocalStream) return;

    this.micSource = this.audioCtx.createMediaStreamSource(this.rawLocalStream);

    this.highpass = this.audioCtx.createBiquadFilter();
    this.highpass.type = "highpass";
    this.highpass.frequency.value = 135;
    this.highpass.Q.value = 0.7;

    this.compressor = this.audioCtx.createDynamicsCompressor();
    this.compressor.threshold.value = -24;
    this.compressor.knee.value = 18;
    this.compressor.ratio.value = 10;
    this.compressor.attack.value = 0.003;
    this.compressor.release.value = 0.2;

    this.micGain = this.audioCtx.createGain();
    this.micGain.gain.value = this.selfMicLevel;

    this.gateGain = this.audioCtx.createGain();
    this.gateGain.gain.value = 0;

    this.analyser = this.audioCtx.createAnalyser();
    this.analyser.fftSize = 512;
    this.analyser.smoothingTimeConstant = 0.72;

    this.destination = this.audioCtx.createMediaStreamDestination();

    this.micSource.connect(this.highpass);
    this.highpass.connect(this.compressor);
    this.compressor.connect(this.micGain);
    this.micGain.connect(this.analyser);
    this.analyser.connect(this.gateGain);
    this.gateGain.connect(this.destination);

    this.outboundStream = this.destination.stream;
    this.applyLocalTransmitState(true);
  }

  private onMembers = (p: VoiceMembersPayload) => {
    this.participantsByChannel.set(p.channelId, p.members);
    this.onChange();
  };

  private onUserJoined = (p: VoiceUserJoinedPayload) => {
    if (p.channelId !== this.channelId) return;

    const current = this.participantsByChannel.get(p.channelId) ?? [];
    const exists = current.some((x) => x.socketId === p.socketId);
    if (!exists) {
      this.participantsByChannel.set(p.channelId, [
        ...current,
        { ...p, speaking: false, muted: false },
      ]);
    }

    void this.handleUserJoined(p.socketId);
    this.onChange();
  };

  private onUserLeft = (p: VoiceUserLeftPayload) => {
    const current = this.participantsByChannel.get(p.channelId) ?? [];
    this.participantsByChannel.set(
      p.channelId,
      current.filter((x) => x.socketId !== p.socketId),
    );

    this.handleUserLeft(p.socketId);
    this.onChange();
  };

  private onSpeaking = (p: VoiceSpeakingPayload) => {
    const current = this.participantsByChannel.get(p.channelId) ?? [];
    this.participantsByChannel.set(
      p.channelId,
      current.map((m) =>
        m.socketId === p.socketId ? { ...m, speaking: p.speaking } : m,
      ),
    );
    this.onChange();
  };

  private onMute = (p: VoiceMutePayload) => {
    const current = this.participantsByChannel.get(p.channelId) ?? [];
    this.participantsByChannel.set(
      p.channelId,
      current.map((m) =>
        m.socketId === p.socketId
          ? { ...m, muted: p.muted, speaking: p.muted ? false : m.speaking }
          : m,
      ),
    );
    this.onChange();
  };

  private onOffer = async (p: OfferPayload) => {
    if (this.processingOffers.has(p.from)) return;
    this.processingOffers.add(p.from);

    try {
      const peer = await this.ensurePeer(p.from);
      if (!peer) return;

      if (peer.pc.signalingState !== "stable") return;

      await peer.pc.setRemoteDescription(new RTCSessionDescription(p.sdp));
      const answer = await peer.pc.createAnswer();
      await peer.pc.setLocalDescription(answer);
      getSocket().emit("voice:answer", { to: p.from, sdp: answer });
    } finally {
      this.processingOffers.delete(p.from);
    }
  };

  private onAnswer = async (p: AnswerPayload) => {
    if (this.processingAnswers.has(p.from)) return;
    this.processingAnswers.add(p.from);

    try {
      const peer = this.peers.get(p.from);
      if (!peer) return;

      if (peer.pc.signalingState !== "have-local-offer") return;

      await peer.pc.setRemoteDescription(new RTCSessionDescription(p.sdp));
    } finally {
      this.processingAnswers.delete(p.from);
      this.offeringPeers.delete(p.from);
    }
  };

  private onCandidate = async (p: CandidatePayload) => {
    const peer = this.peers.get(p.from);
    if (!peer || !p.candidate) return;
    try {
      await peer.pc.addIceCandidate(new RTCIceCandidate(p.candidate));
    } catch (err) {
      console.warn("[voice] addIceCandidate failed", p.from, err);
    }
  };

  private onForceDisconnect = async () => {
    await this.leave();
    this.onForcedDisconnect?.();
  };

  private attachGlobalSocketListeners() {
    if (this.globalListenersAttached) return;

    const socket = getSocket();
    socket.on("voice:members", this.onMembers);
    socket.on("voice:speaking", this.onSpeaking);
    socket.on("voice:mute", this.onMute);

    this.globalListenersAttached = true;
  }

  private attachVoiceSocketListeners() {
    if (this.voiceListenersAttached) return;

    const socket = getSocket();
    socket.on("voice:user-joined", this.onUserJoined);
    socket.on("voice:user-left", this.onUserLeft);
    socket.on("voice:offer", this.onOffer);
    socket.on("voice:answer", this.onAnswer);
    socket.on("voice:candidate", this.onCandidate);
    socket.on("voice:disconnect", this.onForceDisconnect);

    this.voiceListenersAttached = true;
  }

  private detachVoiceSocketListeners() {
    if (!this.voiceListenersAttached) return;

    const socket = getSocket();
    socket.off("voice:user-joined", this.onUserJoined);
    socket.off("voice:user-left", this.onUserLeft);
    socket.off("voice:offer", this.onOffer);
    socket.off("voice:answer", this.onAnswer);
    socket.off("voice:candidate", this.onCandidate);
    socket.off("voice:disconnect", this.onForceDisconnect);

    this.voiceListenersAttached = false;
  }

  private startSpeakingDetection() {
    if (!this.analyser || !this.channelId) return;

    const data = new Uint8Array(this.analyser.frequencyBinCount);
    const socket = getSocket();
    const channelId = this.channelId;

    const tick = () => {
      if (!this.analyser || !this.channelId || this.channelId !== channelId) {
        return;
      }

      this.analyser.getByteFrequencyData(data);

      let sum = 0;
      for (let i = 0; i < data.length; i++) sum += data[i];
      const avg = sum / data.length;

      const allowedByMode = this.pushToTalk ? this.pttPressed : true;
      const speakingNow =
        !this.muted && allowedByMode && avg > this.gateThreshold;

      this.applyGate(speakingNow);

      if (speakingNow !== this.speakingState) {
        this.speakingState = speakingNow;
        socket.emit("voice:speaking", {
          channelId,
          speaking: speakingNow,
        });
      }

      this.speakingTimer = window.setTimeout(tick, 90);
    };

    tick();
  }

  private stopSpeakingDetection() {
    if (this.speakingTimer) {
      window.clearTimeout(this.speakingTimer);
      this.speakingTimer = null;
    }

    if (this.channelId) {
      getSocket().emit("voice:speaking", {
        channelId: this.channelId,
        speaking: false,
      });
    }

    this.speakingState = false;
    this.applyGate(false);

    try {
      this.micSource?.disconnect();
    } catch (err) {
      // ignore disconnect errors
    }

    try {
      this.analyser?.disconnect();
    } catch (err) {
      // ignore disconnect errors
    }

    this.micSource = null;
    this.analyser = null;
  }

  private applyGate(open: boolean) {
    if (!this.gateGain || !this.audioCtx) return;
    const now = this.audioCtx.currentTime;
    this.gateGain.gain.cancelScheduledValues(now);
    this.gateGain.gain.setValueAtTime(this.gateGain.gain.value, now);
    this.gateGain.gain.linearRampToValueAtTime(open ? 1 : 0, now + 0.025);
  }

  private applyLocalTransmitState(forceSilentEvent = false) {
    const allowed = !this.muted && (!this.pushToTalk || this.pttPressed);

    if (this.outboundStream) {
      this.outboundStream.getAudioTracks().forEach((track) => {
        track.enabled = true;
      });
    }

    this.applyGate(allowed && this.speakingState);

    if (forceSilentEvent && this.channelId) {
      getSocket().emit("voice:speaking", {
        channelId: this.channelId,
        speaking: false,
      });
      getSocket().emit("voice:mute", {
        channelId: this.channelId,
        muted: this.muted,
      });
      this.speakingState = false;
    }
  }

  private async handleUserJoined(socketId: string) {
    if (this.offeringPeers.has(socketId)) return;

    const existing = this.peers.get(socketId);
    if (existing && existing.pc.signalingState !== "stable") return;

    const peer = await this.ensurePeer(socketId);
    if (!peer) return;

    this.offeringPeers.add(socketId);

    try {
      const offer = await peer.pc.createOffer({ offerToReceiveAudio: true });
      await peer.pc.setLocalDescription(offer);
      getSocket().emit("voice:offer", { to: socketId, sdp: offer });
    } catch (err) {
      console.warn("[voice] create/send offer failed", socketId, err);
      this.offeringPeers.delete(socketId);
    }
  }

  private handleUserLeft(socketId: string) {
    const p = this.peers.get(socketId);
    if (!p) return;

    p.pc.close();
    p.stream.getTracks().forEach((t) => t.stop());
    p.audio.pause();
    p.audio.srcObject = null;

    this.peers.delete(socketId);
    this.offeringPeers.delete(socketId);
    this.processingOffers.delete(socketId);
    this.processingAnswers.delete(socketId);

    this.onChange();
  }

  private async ensurePeer(socketId: string): Promise<PeerInfo | null> {
    if (!this.audioCtx) return null;
    if (this.peers.has(socketId)) return this.peers.get(socketId)!;

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    if (this.outboundStream) {
      this.outboundStream.getAudioTracks().forEach((track) => {
        pc.addTrack(track, this.outboundStream!);
      });
    }

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        getSocket().emit("voice:candidate", {
          to: socketId,
          candidate: e.candidate,
        });
      }
    };

    const remoteStream = new MediaStream();

    const audio = new Audio();
    audio.autoplay = true;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (audio as any).playsInline = true;
    audio.muted = false;
    audio.volume = 0.8;
    audio.srcObject = remoteStream;

    pc.ontrack = async (e) => {
      const incoming = e.streams[0];
      if (incoming) {
        incoming.getAudioTracks().forEach((t) => {
          const exists = remoteStream.getTracks().some((rt) => rt.id === t.id);
          if (!exists) remoteStream.addTrack(t);
        });
      } else {
        const t = e.track;
        const exists = remoteStream.getTracks().some((rt) => rt.id === t.id);
        if (!exists) remoteStream.addTrack(t);
      }

      try {
        await audio.play();
      } catch (err) {
        console.warn("[voice] audio.play failed", socketId, err);
      }
    };

    const info: PeerInfo = {
      pc,
      stream: remoteStream,
      audio,
      volume: 1,
    };

    this.peers.set(socketId, info);
    this.onChange();
    return info;
  }

  private isTypingTarget(target: EventTarget | null): boolean {
    const el = target as HTMLElement | null;
    if (!el) return false;
    const tag = el.tagName?.toLowerCase();
    return tag === "input" || tag === "textarea" || el.isContentEditable;
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (!this.pushToTalk) return;
    if (this.isTypingTarget(e.target)) return;
    if (e.key.toLowerCase() !== this.pttKey) return;
    if (e.repeat) return;

    this.pttPressed = true;
    this.onChange();
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    if (!this.pushToTalk) return;
    if (e.key.toLowerCase() !== this.pttKey) return;

    this.pttPressed = false;
    if (this.channelId) {
      getSocket().emit("voice:speaking", {
        channelId: this.channelId,
        speaking: false,
      });
    }
    this.speakingState = false;
    this.applyGate(false);
    this.onChange();
  };

  private handleWindowBlur = () => {
    if (!this.pushToTalk) return;
    this.pttPressed = false;
    if (this.channelId) {
      getSocket().emit("voice:speaking", {
        channelId: this.channelId,
        speaking: false,
      });
    }
    this.speakingState = false;
    this.applyGate(false);
    this.onChange();
  };
}
