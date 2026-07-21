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
