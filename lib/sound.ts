export const playClickSound = (): void => {
    // Impede que o Next.js tente rodar isso no servidor durante o build/SSR
    if (typeof window === 'undefined') return;

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx: AudioContext = new AudioContextClass();
    const osc: OscillatorNode = ctx.createOscillator();
    const gain: GainNode = ctx.createGain();

    // Configurações do clique plástico rápido
    osc.frequency.setValueAtTime(1500, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.05);

    gain.gain.setValueAtTime(0.6, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.05);
};