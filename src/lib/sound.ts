let audioContext: AudioContext | null = null;

export function playSound(type: 'click' | 'success' | 'notification') {
  if (typeof window === 'undefined') return;
  
  try {
    if (!audioContext) {
      audioContext = new AudioContext();
    }
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    const frequencies = {
      click: 800,
      success: 1000,
      notification: 600,
    };
    
    oscillator.frequency.value = frequencies[type];
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
  } catch (e) {
    console.error('Audio play error:', e);
  }
}

/** 播放 public/ 下的音频文件，路径如 '/longpaopao.mp3' */
export function playAudioFile(src: string, volume = 0.8) {
  if (typeof window === 'undefined') return;
  try {
    const audio = new Audio(src);
    audio.volume = volume;
    void audio.play();
  } catch { /* ignore */ }
}

export function toggleSound(enabled: boolean) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('soundEnabled', String(enabled));
  }
}

export function isSoundEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem('soundEnabled') !== 'false';
}
