let audioContext: AudioContext | null = null;

/** 获取（或懒创建）共享的 AudioContext，避免重复实例化 */
function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!audioContext || audioContext.state === 'closed') {
      audioContext = new AudioContext();
    }
    // Safari 等浏览器需要 resume（用户交互后）
    if (audioContext.state === 'suspended') {
      void audioContext.resume();
    }
    return audioContext;
  } catch {
    return null;
  }
}

export function playSound(type: 'click' | 'success' | 'notification') {
  if (typeof window === 'undefined') return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    const frequencies: Record<typeof type, number> = {
      click: 800,
      success: 1000,
      notification: 600,
    };

    oscillator.frequency.value = frequencies[type];
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.1);

    // 音频结束后自动断开，防止内存泄漏
    oscillator.onended = () => {
      oscillator.disconnect();
      gainNode.disconnect();
    };
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
    // 播放完毕后释放引用，避免内存泄漏
    audio.onended = () => {
      audio.src = '';
    };
    const p = audio.play();
    if (p !== undefined) {
      p.catch((e) => {
        // 浏览器策略阻止自动播放时，静默忽略
        if (e instanceof Error && e.name !== 'NotAllowedError') {
          console.warn('Audio play error:', e);
        }
      });
    }
  } catch {
    /* ignore */
  }
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

/** 显式释放共享 AudioContext（页面卸载时调用） */
export function disposeAudioContext() {
  if (audioContext && audioContext.state !== 'closed') {
    void audioContext.close();
    audioContext = null;
  }
}

/** Web Audio 传送音效：咻的一声，从高频扫到低频 + 低频 boom */
export function playPortalSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // 主音：从高频扫到低频（"咻"）
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1600, now);
    osc1.frequency.exponentialRampToValueAtTime(220, now + 0.35);
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.28, now + 0.04);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc1.start(now);
    osc1.stop(now + 0.5);
    osc1.onended = () => { osc1.disconnect(); gain1.disconnect(); };

    // 次音：共鸣泡泡感
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(880, now + 0.05);
    osc2.frequency.exponentialRampToValueAtTime(440, now + 0.4);
    gain2.gain.setValueAtTime(0, now + 0.05);
    gain2.gain.linearRampToValueAtTime(0.12, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc2.start(now + 0.05);
    osc2.stop(now + 0.5);
    osc2.onended = () => { osc2.disconnect(); gain2.disconnect(); };

    // 出现感：低频 boom
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.connect(gain3);
    gain3.connect(ctx.destination);
    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(120, now);
    osc3.frequency.exponentialRampToValueAtTime(60, now + 0.18);
    gain3.gain.setValueAtTime(0.22, now);
    gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc3.start(now);
    osc3.stop(now + 0.25);
    osc3.onended = () => { osc3.disconnect(); gain3.disconnect(); };

    // 复用共享 AudioContext，统一由页面卸载时释放
  } catch { /* ignore */ }
}
