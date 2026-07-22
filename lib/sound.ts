// AudioContext compartilhado: criar um novo a cada clique é caro e pode gerar
// artefatos de DC offset. Mantemos uma única instância por aba.
let sharedCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
    // Impede que o Next.js tente rodar isso no servidor durante o build/SSR
    if (typeof window === 'undefined') return null;

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return null;

    if (!sharedCtx) {
        sharedCtx = new AudioContextClass();
    }
    // Navegadores com autoplay policy iniciam o contexto suspenso até a
    // primeira interação do usuário; tentamos retomar aqui.
    if (sharedCtx.state === 'suspended') {
        void sharedCtx.resume();
    }
    return sharedCtx;
}

// Pré-gera um buffer curto de ruído branco para reutilizar entre cliques.
// Gerar Math.random() a cada amostra em cada clique é desnecessário.
let noiseBuffer: AudioBuffer | null = null;

function getNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (noiseBuffer && noiseBuffer.sampleRate === ctx.sampleRate) {
        return noiseBuffer;
    }
    const length = Math.floor(0.2 * ctx.sampleRate); // 200ms é mais que suficiente
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
        data[i] = Math.random() * 2 - 1;
    }
    noiseBuffer = buffer;
    return buffer;
}

export const playClickSound = (): void => {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Fonte: trecho curto de ruído branco (o "corpo" de um clique mecânico).
    const noise = ctx.createBufferSource();
    noise.buffer = getNoiseBuffer(ctx);
    noise.loop = false;

    // Bandpass em ~2.8kHz com Q moderado: dá o caráter do clique sem virar tom.
    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.value = 2800;
    bandpass.Q.value = 1.4;

    // Highpass leve remove componente "bummy" e destaca a crista aguda do tick.
    const highpass = ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 700;

    // Envelope: ataque praticamente instantâneo e decaimento exponencial curto.
    // exponentialRamp não aceita 0, por isso partimos de 0.0001.
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.3, now + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

    noise.connect(highpass);
    highpass.connect(bandpass);
    bandpass.connect(gain);
    gain.connect(ctx.destination);

    noise.start(now);
    noise.stop(now + 0.07);
};

// Helper para sons tonais (oscilador + envelope exponencial curto).
// Diferente do click, que é ruído filtrado, estes sons são notas puras —
// o contraste tímbrico é o que diferencia as situações para o usuário.
type ToneOptions = {
    frequency: number;
    type?: OscillatorType;
    startTime: number;
    duration: number;
    volume: number;
};

function playTone(ctx: AudioContext, opts: ToneOptions): void {
    const { frequency, type = 'sine', startTime, duration, volume } = opts;

    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = frequency;

    // Mesmo padrão de envelope do click: ataque quase instantâneo e
    // decaimento exponencial (exponentialRamp não aceita 0).
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(volume, startTime + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
}

// Erro: "bonk" grave e descendente — duas notas triangle caindo.
// Grave + descendente é universalmente associado a falha, sem ser estridente.
export const playErrorSound = (): void => {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    playTone(ctx, { frequency: 220, type: 'triangle', startTime: now, duration: 0.12, volume: 0.2 });
    playTone(ctx, { frequency: 165, type: 'triangle', startTime: now + 0.11, duration: 0.18, volume: 0.2 });
};

// Término de tarefa: duas notas sine ascendentes (E5 -> A5), o "ding-ding"
// clássico de conclusão com sucesso.
export const playTaskEndSound = (): void => {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    playTone(ctx, { frequency: 659, startTime: now, duration: 0.09, volume: 0.15 });
    playTone(ctx, { frequency: 880, startTime: now + 0.09, duration: 0.14, volume: 0.15 });
};

// Início de tarefa: nota sine única e suave (A4), apenas sinaliza "começou".
export const playTaskStartSound = (): void => {
    const ctx = getAudioContext();
    if (!ctx) return;

    playTone(ctx, { frequency: 440, startTime: ctx.currentTime, duration: 0.15, volume: 0.12 });
};

// Notificação/aviso: dois "blips" curtos e agudos (B5) — neutro, distinto
// tanto do erro (grave/descendente) quanto do sucesso (ascendente).
export const playNotifySound = (): void => {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    playTone(ctx, { frequency: 987, startTime: now, duration: 0.06, volume: 0.12 });
    playTone(ctx, { frequency: 987, startTime: now + 0.09, duration: 0.06, volume: 0.12 });
};

/**
 * Alias de playClickSound com nome distinto: semântica "filtro convergiu num único prompt".
 * A implementação resolvel para o mesmo som de click para evitar duplicar código de áudio.
 */
export const playConvergeSound = (): void => {
    playClickSound();
};
