'use client';

/**
 * EATI 人格测评组件 —— 游戏大师联合设计版
 * 高橋幸嗣(动森) × Phil Duncan(胡闹厨房) × Eric Barone(星露谷)
 *
 * 设计哲学：
 *  - 龙虾是向导NPC，贯穿全程
 *  - 选项卡：白底+彩色左边框+弹压动效
 *  - 进度：龙虾脚印格子（12格）
 *  - 转场：「出发动画」2.5s，龙虾背行囊奔向美食
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { EATI_QUESTIONS, EATI_QUIZ_VERSION, calcEatiCode, saveEatiResult, type EatiAnswer } from '@/lib/eati';
import { playAudioFile } from '@/lib/sound';
import { track } from '@/lib/tracker';

function playTap() { playAudioFile('/usual.mp3', 0.5); }

interface EatiQuizProps {
  onComplete: (code: string) => void;
  onClose?: () => void;
  leadVariant?: string;
}

type QuizPhase = 'intro' | 'questions' | 'depart';

const DIMENSION_LABELS: Record<string, string> = {
  A: '重口度', B: '探索欲', C: '精细度', D: '确定性',
};

const DIMENSION_SUB: Record<string, string> = {
  A: 'L清淡 · H重口', B: 'L守旧 · H冒险', C: 'L随意 · H讲究', D: 'L果断 · H纠结',
};

// 维度主题：彩色左边框、选中态、渐变色
const DIM: Record<string, {
  color: string; colorLight: string; colorDeep: string;
  gradFrom: string; gradTo: string;
  emoji: string; selectedBg: string;
}> = {
  A: { color: '#ff5252', colorLight: 'rgba(255,82,82,0.12)', colorDeep: '#c62828',
       gradFrom: '#ff6b6b', gradTo: '#ff4757', emoji: '🌶️',
       selectedBg: 'linear-gradient(120deg, rgba(255,82,82,0.1) 0%, rgba(255,71,87,0.04) 100%)' },
  B: { color: '#00c87a', colorLight: 'rgba(0,200,122,0.12)', colorDeep: '#007a48',
       gradFrom: '#26de81', gradTo: '#20bf6b', emoji: '🗺️',
       selectedBg: 'linear-gradient(120deg, rgba(38,222,129,0.1) 0%, rgba(32,191,107,0.04) 100%)' },
  C: { color: '#ff9800', colorLight: 'rgba(255,152,0,0.12)', colorDeep: '#c66900',
       gradFrom: '#fd9644', gradTo: '#fa8231', emoji: '✨',
       selectedBg: 'linear-gradient(120deg, rgba(253,150,68,0.1) 0%, rgba(250,130,49,0.04) 100%)' },
  D: { color: '#9c27b0', colorLight: 'rgba(156,39,176,0.12)', colorDeep: '#6a1b9a',
       gradFrom: '#a55eea', gradTo: '#8854d0', emoji: '🎯',
       selectedBg: 'linear-gradient(120deg, rgba(165,94,234,0.1) 0%, rgba(136,84,208,0.04) 100%)' },
};

// 选项按键按压动画状态
function OptionCard({
  label, text, chosen, dim, onClick,
}: {
  label: string; text: string; chosen: boolean;
  dim: keyof typeof DIM; onClick: () => void;
}) {
  const [pressing, setPressing] = useState(false);
  const d = DIM[dim];

  return (
    <button
      type="button"
      onMouseDown={() => setPressing(true)}
      onMouseUp={() => { setPressing(false); onClick(); }}
      onMouseLeave={() => setPressing(false)}
      onTouchStart={() => setPressing(true)}
      onTouchEnd={() => { setPressing(false); onClick(); }}
      style={{
        display: 'flex', alignItems: 'center', gap: 0,
        padding: 0, borderRadius: 18, cursor: 'pointer',
        border: `2px solid ${chosen ? d.color : '#e8e8e8'}`,
        background: chosen ? d.selectedBg : '#fff',
        transition: 'all 180ms cubic-bezier(.34,1.56,.64,1)',
        textAlign: 'left', overflow: 'hidden',
        boxShadow: chosen
          ? `0 6px 20px ${d.color}30, 0 0 0 3px ${d.colorLight}`
          : '0 2px 8px rgba(0,0,0,0.06)',
        transform: pressing ? 'scale(0.97)' : chosen ? 'scale(1.01)' : 'scale(1)',
      }}
    >
      {/* 左侧彩色边框条 */}
      <div style={{
        width: 5, alignSelf: 'stretch', flexShrink: 0,
        background: chosen
          ? `linear-gradient(180deg, ${d.gradFrom}, ${d.gradTo})`
          : '#f0f0f0',
        transition: 'background 200ms ease',
      }} />
      {/* 字母圆圈 */}
      <div style={{
        width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14, fontWeight: 900, margin: '16px 14px 16px 16px',
        background: chosen ? `linear-gradient(135deg, ${d.gradFrom}, ${d.gradTo})` : '#f0f0f0',
        color: chosen ? '#fff' : '#aaa',
        boxShadow: chosen ? `0 4px 12px ${d.color}50` : 'none',
        transition: 'all 200ms cubic-bezier(.34,1.56,.64,1)',
        transform: chosen ? 'scale(1.08)' : 'scale(1)',
      }}>{label}</div>
      {/* 文字 */}
      <div style={{ flex: 1, fontSize: 16, fontWeight: 800, lineHeight: 1.45, color: '#1a0a2e', paddingRight: 16 }}>
        {text}
      </div>
      {/* 选中勾 */}
      {chosen && (
        <div style={{
          width: 28, height: 28, borderRadius: '50%', flexShrink: 0, marginRight: 16,
          background: `linear-gradient(135deg, ${d.gradFrom}, ${d.gradTo})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: 15, fontWeight: 900,
          animation: 'eati-pop 200ms cubic-bezier(.34,1.56,.64,1)',
        }}>✓</div>
      )}
    </button>
  );
}

// 龙虾脚印进度条（12格）
function PawProgress({ total, current, answers }: {
  total: number; current: number; answers: (EatiAnswer | null)[];
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
      {Array.from({ length: total }).map((_, i) => {
        const isActive = i === current;
        const isDone = answers[i] !== null;
        return (
          <div key={i} style={{
            width: isActive ? 22 : 14, height: 14, borderRadius: 999,
            transition: 'all 250ms cubic-bezier(.34,1.56,.64,1)',
            background: isActive
              ? 'linear-gradient(90deg, #ff9800, #ff5252)'
              : isDone
                ? '#26de81'
                : '#e8e8e8',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 8,
          }}>
            {isActive ? '🦞' : isDone ? '' : ''}
          </div>
        );
      })}
    </div>
  );
}

// ── 「出发！」动画转场页 ──────────────────────────────────────────
function DepartScene({ leadVariant, onDone }: { leadVariant?: string; onDone: () => void }) {
  const [step, setStep] = useState<'prepare' | 'run' | 'lights'>('prepare');
  const timerRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const onDoneRef = useRef(onDone);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const t1 = setTimeout(() => setStep('run'), 600);
    const t2 = setTimeout(() => setStep('lights'), 1600);
    const t3 = setTimeout(() => onDoneRef.current(), 2800);
    timerRef.current = [t1, t2, t3];
    return () => timerRef.current.forEach(clearTimeout);
  }, []);

  // 餐厅灯光依次亮起的图标
  const restaurants = ['🍜', '🍣', '🍲', '🦞', '🥟', '🍰'];

  return (
    <div style={{
      width: '100%', maxWidth: 600, margin: '0 auto', textAlign: 'center',
    }}>
      {/* 卡片容器 */}
      <div style={{
        position: 'relative',
        padding: '48px 32px 40px',
        borderRadius: 36,
        background: 'linear-gradient(160deg, #FFF9F0 0%, #FFF4E0 50%, #FFF0F5 100%)',
        boxShadow: '0 40px 100px rgba(0,0,0,0.25)',
        overflow: 'hidden',
      }}>
        {/* 顶部彩虹条 */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 5,
          background: 'linear-gradient(90deg, #ff6b6b, #ff9800, #ffd36e, #26de81, #4ecdc4, #a55eea)',
        }} />
        {/* 背景光斑 */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(circle at 20% 30%, rgba(255,152,0,0.12) 0%, transparent 40%), radial-gradient(circle at 80% 70%, rgba(165,94,234,0.1) 0%, transparent 40%)',
        }} />

        <div style={{ position: 'relative' }}>
          {/* 标题 */}
          <div style={{
            fontSize: 11, fontWeight: 900, letterSpacing: '0.3em',
            color: '#ff9800', marginBottom: 16,
          }}>✦ WANGCAI DEPARTS ✦</div>

          {/* 龙虾出发动画 */}
          <div style={{
            position: 'relative', height: 130, marginBottom: 20,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {leadVariant && (
              <div style={{
                position: 'relative',
                transform: step === 'prepare'
                  ? 'scaleY(0.85) translateX(0px)'
                  : step === 'run'
                    ? 'scaleY(1) translateX(60px)'
                    : 'scaleY(1) translateX(200px)',
                transition: step === 'prepare'
                  ? 'transform 400ms ease'
                  : step === 'run'
                    ? 'transform 700ms cubic-bezier(.25,.46,.45,.94)'
                    : 'transform 600ms ease-in',
                opacity: step === 'lights' ? 0 : 1,
              }}>
                {/* 行囊（便当盒） */}
                <div style={{
                  position: 'absolute', right: -8, top: 8,
                  fontSize: 20,
                  animation: step === 'run' ? 'eati-bag-swing 0.4s ease-in-out infinite' : 'none',
                }}>🍱</div>
                <img
                  src={leadVariant}
                  alt="旺财出发"
                  draggable={false}
                  style={{
                    width: 100, height: 100, objectFit: 'contain',
                    filter: 'drop-shadow(0 16px 32px rgba(255,150,60,0.4))',
                    animation: step === 'run' ? 'eati-run 0.35s steps(4) infinite' : 'none',
                  }}
                />
                {/* 地面阴影 */}
                <div style={{
                  width: 70, height: 12, borderRadius: '50%', margin: '-4px auto 0',
                  background: 'rgba(0,0,0,0.1)',
                  transform: step === 'prepare' ? 'scaleX(1.1)' : 'scaleX(0.8)',
                  transition: 'transform 300ms ease',
                }} />
              </div>
            )}
            {/* 出发冲线效果 */}
            {step === 'run' && (
              <div style={{
                position: 'absolute', left: '30%', top: '50%',
                display: 'flex', gap: 6, transform: 'translateY(-50%)',
                animation: 'eati-speed-lines 0.5s ease-in-out infinite',
              }}>
                {['#ff6b6b', '#fd9644', '#ffd36e'].map((c, i) => (
                  <div key={i} style={{
                    width: 18 - i * 4, height: 2, borderRadius: 999,
                    background: c, opacity: 0.6,
                  }} />
                ))}
              </div>
            )}
          </div>

          {/* 文字 */}
          <div style={{
            fontSize: 'clamp(26px, 5vw, 38px)', fontWeight: 900,
            lineHeight: 1.15, color: '#1a0a2e',
          }}>
            旺财出发探店啦！
          </div>
          <div style={{ marginTop: 8, fontSize: 15, color: '#888', fontWeight: 800 }}>
            根据你的口味，去找最适合你的餐厅…
          </div>

          {/* 餐厅依次亮灯 */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 24 }}>
            {restaurants.map((r, i) => (
              <div key={i} style={{
                width: 42, height: 42, borderRadius: 14,
                background: step === 'lights'
                  ? 'linear-gradient(135deg, #FFF4E0, #FFE8C0)'
                  : '#f0f0f0',
                border: step === 'lights'
                  ? '1.5px solid rgba(255,180,60,0.5)'
                  : '1.5px solid #e8e8e8',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20,
                transition: `all 300ms ease ${i * 0.12}s`,
                boxShadow: step === 'lights'
                  ? `0 4px 16px rgba(255,180,60,0.3)`
                  : 'none',
                transform: step === 'lights' ? 'scale(1.1)' : 'scale(1)',
              }}>
                {r}
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes eati-run {
          0% { transform: translateY(0); }
          25% { transform: translateY(-6px) scaleX(1.1); }
          50% { transform: translateY(0); }
          75% { transform: translateY(-3px); }
          100% { transform: translateY(0); }
        }
        @keyframes eati-bag-swing {
          0%, 100% { transform: rotate(-8deg); }
          50% { transform: rotate(8deg); }
        }
        @keyframes eati-speed-lines {
          0% { opacity: 0.8; transform: translateY(-50%) translateX(0); }
          100% { opacity: 0; transform: translateY(-50%) translateX(-20px); }
        }
        @keyframes eati-pop {
          0% { transform: scale(0) rotate(-20deg); }
          70% { transform: scale(1.2) rotate(5deg); }
          100% { transform: scale(1) rotate(0deg); }
        }
      `}</style>
    </div>
  );
}

// ── 主组件 ────────────────────────────────────────────────────────
export function EatiQuiz({ onComplete, onClose, leadVariant }: EatiQuizProps) {
  const [phase, setPhase] = useState<QuizPhase>('intro');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<EatiAnswer[]>(Array(12).fill(null));
  const [reaction, setReaction] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentQuestion = EATI_QUESTIONS[currentIndex];
  const dim = (currentQuestion?.dimension ?? 'A') as keyof typeof DIM;
  const d = DIM[dim];
  const answeredCount = answers.filter((a) => a !== null).length;

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const handleAnswer = useCallback((value: EatiAnswer) => {
    if (!currentQuestion) return;
    playTap();
    const newAnswers = [...answers];
    newAnswers[currentIndex] = value;
    setAnswers(newAnswers);

    const reactionText = value === 'L'
      ? currentQuestion.wangcaiReactionL
      : currentQuestion.wangcaiReactionH;
    setReaction(reactionText);

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setReaction(null);
      if (currentIndex < 11) setCurrentIndex((idx) => idx + 1);
    }, 1400);
  }, [currentQuestion, answers, currentIndex]);

  const handleFinish = useCallback(() => {
    playTap();
    setPhase('depart');
    track('eati_quiz_submit', { answeredCount });
  }, [answeredCount]);

  const handleDepartDone = useCallback(() => {
    const { code, skippedCount } = calcEatiCode(answers);
    saveEatiResult({ code, skippedCount, answeredAt: Date.now(), version: EATI_QUIZ_VERSION });
    track('eati_personality_assigned', { code, skippedCount });
    onComplete(code);
  }, [answers, onComplete]);

  const canFinish = currentIndex === 11 && answers[11] !== null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 70,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
      background: 'rgba(15, 5, 30, 0.78)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
    }}>

      {/* ── 出发动画转场 ── */}
      {phase === 'depart' && (
        <DepartScene leadVariant={leadVariant} onDone={handleDepartDone} />
      )}

      {/* ── intro 引导页 ── */}
      {phase === 'intro' && (
        <div style={{
          position: 'relative', width: 680, maxWidth: '100%',
          padding: '36px 30px 30px', borderRadius: 32,
          background: 'linear-gradient(160deg, #FFF9F0 0%, #FFF4E0 100%)',
          boxShadow: '0 40px 100px rgba(0,0,0,0.25)',
          overflow: 'hidden',
        }}>
          {/* 顶部彩虹条 */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 5,
            background: 'linear-gradient(90deg, #ff6b6b, #ff9800, #ffd36e, #26de81, #4ecdc4, #a55eea)',
          }} />
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: 'radial-gradient(ellipse at 15% 20%, rgba(255,152,0,0.1) 0%, transparent 45%), radial-gradient(ellipse at 85% 80%, rgba(165,94,234,0.08) 0%, transparent 45%)',
          }} />

          <div style={{ position: 'relative' }}>
            {/* 顶部标签 */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '4px 14px', borderRadius: 999, marginBottom: 16,
              background: 'rgba(255,152,0,0.12)', border: '1px solid rgba(255,152,0,0.3)',
              fontSize: 11, fontWeight: 900, letterSpacing: '0.2em', color: '#c66900',
            }}>
              🦞 EATI · 饮食人格测评
            </div>

            {/* 主标题 */}
            <div style={{
              fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 900,
              lineHeight: 1.15, color: '#1a0a2e',
            }}>
              旺财要出发探店了！
              <br />
              <span style={{
                background: 'linear-gradient(135deg, #ff5252, #ff9800)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>先回答 12 个问题</span>
              <br />
              <span style={{ fontSize: 'clamp(16px, 2.5vw, 22px)', color: '#777', fontWeight: 700 }}>
                帮它找到最适合你的餐厅 🏝️
              </span>
            </div>

            {/* 四维度网格 */}
            <div style={{ marginTop: 22, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {Object.entries(DIMENSION_LABELS).map(([key, label]) => {
                const t = DIM[key];
                return (
                  <div key={key} style={{
                    padding: '13px 14px', borderRadius: 18,
                    background: '#fff',
                    border: `1.5px solid ${t.color}22`,
                    display: 'flex', alignItems: 'center', gap: 12,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                  }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: 12, flexShrink: 0,
                      background: `linear-gradient(135deg, ${t.gradFrom}, ${t.gradTo})`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 18, boxShadow: `0 4px 14px ${t.color}40`,
                    }}>{t.emoji}</div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 900, color: '#1a0a2e' }}>{label}</div>
                      <div style={{ fontSize: 10, color: '#999', marginTop: 2 }}>{DIMENSION_SUB[key]}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 旺财对话框 */}
            <div style={{
              marginTop: 18, display: 'flex', alignItems: 'flex-end', gap: 12,
              padding: '14px 16px', borderRadius: 22,
              background: 'rgba(255,152,0,0.08)', border: '1.5px solid rgba(255,152,0,0.2)',
            }}>
              {leadVariant && (
                <img src={leadVariant} alt="旺财" draggable={false}
                  style={{
                    width: 60, height: 60, objectFit: 'contain', flexShrink: 0,
                    animation: 'eati-bob 2s ease-in-out infinite',
                  }} />
              )}
              <div style={{
                flex: 1, padding: '12px 14px', borderRadius: 16,
                background: '#fff', color: '#5c3010',
                fontSize: 14, lineHeight: 1.65, fontWeight: 800,
                boxShadow: '0 3px 12px rgba(0,0,0,0.07)',
              }}>
                汪！我要出去帮你尝遍这条街 🦞<br />
                <span style={{ color: '#aaa', fontWeight: 700 }}>12题 · 2分钟 · 选第一直觉就好</span>
              </div>
            </div>

            {/* 按钮 */}
            <div style={{ marginTop: 22, display: 'flex', gap: 10 }}>
              {onClose && (
                <button type="button" onClick={() => { playTap(); onClose(); }}
                  style={{
                    flex: '0 0 88px', padding: '14px 16px', borderRadius: 999,
                    border: '1.5px solid #ddd', background: '#f8f8f8',
                    color: '#aaa', fontSize: 13, fontWeight: 900, cursor: 'pointer',
                  }}>以后再说</button>
              )}
              <button type="button"
                onClick={() => { playTap(); track('eati_quiz_start', {}); setPhase('questions'); }}
                style={{
                  flex: 1, padding: '16px 20px', borderRadius: 999, border: 0,
                  background: 'linear-gradient(135deg, #ff5252 0%, #ff9800 50%, #ffd36e 100%)',
                  color: '#fff', fontSize: 15, fontWeight: 900, cursor: 'pointer',
                  boxShadow: '0 10px 28px rgba(255,82,82,0.4)',
                  letterSpacing: '0.02em',
                }}>
                出发！让旺财了解我 🦞 →
              </button>
            </div>
          </div>

          <style>{`
            @keyframes eati-bob {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-5px); }
            }
          `}</style>
        </div>
      )}

      {/* ── questions 答题页 ── */}
      {phase === 'questions' && currentQuestion && (
        <div style={{
          position: 'relative', width: 720, maxWidth: '100%',
          borderRadius: 32,
          background: 'linear-gradient(160deg, #FFF9F0 0%, #FFF4E0 100%)',
          boxShadow: '0 40px 100px rgba(0,0,0,0.25)',
          overflow: 'hidden',
        }}>
          {/* 顶部维度色条 */}
          <div style={{
            height: 5,
            background: `linear-gradient(90deg, ${d.gradFrom}, ${d.gradTo})`,
            transition: 'background 400ms ease',
          }} />

          <div style={{ padding: '20px 22px 22px' }}>
            {/* 顶部信息行 */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                {/* 维度标签 */}
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '5px 13px', borderRadius: 999, marginBottom: 10,
                  background: d.colorLight, border: `1.5px solid ${d.color}40`,
                  fontSize: 12, fontWeight: 900, color: d.colorDeep,
                }}>
                  <span>{d.emoji}</span>
                  <span>{DIMENSION_LABELS[dim]}</span>
                  <span style={{ opacity: 0.6 }}>· {currentQuestion.id}/12</span>
                </div>
                {/* 龙虾脚印进度条 */}
                <PawProgress total={12} current={currentIndex} answers={answers} />
              </div>
              {/* 已答数 */}
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 24, fontWeight: 900, color: d.color, lineHeight: 1 }}>
                  {answeredCount}
                </div>
                <div style={{ fontSize: 10, color: '#bbb', fontWeight: 800 }}>/ 12 已答</div>
              </div>
            </div>

            {/* 题目 */}
            <div style={{
              fontSize: 'clamp(19px, 3.2vw, 26px)', fontWeight: 900,
              lineHeight: 1.3, color: '#1a0a2e', minHeight: 56, marginBottom: 12,
            }}>
              {currentQuestion.text}
            </div>

            {/* 旺财反应气泡 */}
            <div style={{ minHeight: 44, marginBottom: 14, transition: 'opacity 200ms ease', opacity: reaction ? 1 : 0 }}>
              {reaction && (
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '7px 16px', borderRadius: 999,
                  background: 'linear-gradient(135deg, rgba(255,211,110,0.3), rgba(255,152,0,0.15))',
                  border: '1.5px solid rgba(255,180,60,0.5)',
                  fontSize: 13, fontWeight: 800, color: '#c06010',
                  animation: 'eati-reaction-in 200ms ease',
                }}>
                  <span>🦞</span>
                  <span>{reaction}</span>
                </div>
              )}
            </div>

            {/* 选项卡 */}
            <div style={{ display: 'grid', gap: 12 }}>
              <OptionCard
                label="A" text={currentQuestion.optionL}
                chosen={answers[currentIndex] === 'L'}
                dim={dim} onClick={() => handleAnswer('L')}
              />
              <OptionCard
                label="B" text={currentQuestion.optionH}
                chosen={answers[currentIndex] === 'H'}
                dim={dim} onClick={() => handleAnswer('H')}
              />
            </div>

            {/* 底部导航 */}
            <div style={{ marginTop: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
              <button type="button" disabled={currentIndex === 0}
                onClick={() => { playTap(); setCurrentIndex((i) => Math.max(i - 1, 0)); }}
                style={{
                  flex: '0 0 76px', padding: '12px 14px', borderRadius: 999,
                  border: '1.5px solid #e0e0e0',
                  background: currentIndex === 0 ? '#f8f8f8' : '#fff',
                  color: currentIndex === 0 ? '#ccc' : '#666',
                  fontSize: 13, fontWeight: 900,
                  cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
                }}>← 上题</button>

              <button type="button"
                onClick={() => { playTap(); if (currentIndex < 11) setCurrentIndex((i) => i + 1); }}
                style={{
                  flex: '0 0 auto', padding: '12px 14px', borderRadius: 999,
                  border: '1.5px solid #ebebeb', background: 'transparent',
                  color: '#ccc', fontSize: 12, fontWeight: 800, cursor: 'pointer',
                }}>跳过</button>

              {currentIndex < 11 ? (
                <button type="button"
                  disabled={answers[currentIndex] === null}
                  onClick={() => { playTap(); setCurrentIndex((i) => Math.min(i + 1, 11)); }}
                  style={{
                    flex: 1, padding: '13px 16px', borderRadius: 999, border: 0,
                    background: answers[currentIndex] !== null
                      ? `linear-gradient(135deg, ${d.gradFrom}, ${d.gradTo})`
                      : '#f0f0f0',
                    color: answers[currentIndex] !== null ? '#fff' : '#ccc',
                    fontSize: 14, fontWeight: 900,
                    cursor: answers[currentIndex] !== null ? 'pointer' : 'not-allowed',
                    boxShadow: answers[currentIndex] !== null ? `0 8px 24px ${d.color}40` : 'none',
                    transition: 'all 200ms ease',
                  }}>下一题 →</button>
              ) : (
                <button type="button"
                  disabled={!canFinish}
                  onClick={handleFinish}
                  style={{
                    flex: 1, padding: '13px 16px', borderRadius: 999, border: 0,
                    background: canFinish
                      ? 'linear-gradient(135deg, #ff5252 0%, #ff9800 50%, #ffd36e 100%)'
                      : '#f0f0f0',
                    color: canFinish ? '#fff' : '#ccc',
                    fontSize: 14, fontWeight: 900,
                    cursor: canFinish ? 'pointer' : 'not-allowed',
                    boxShadow: canFinish ? '0 8px 28px rgba(255,82,82,0.45)' : 'none',
                    transition: 'all 200ms ease',
                    letterSpacing: '0.02em',
                  }}>🦞 出发查看人格 ✦</button>
              )}
            </div>
          </div>

          <style>{`
            @keyframes eati-reaction-in {
              0% { transform: scale(0.85) translateY(4px); opacity: 0; }
              100% { transform: scale(1) translateY(0); opacity: 1; }
            }
            @keyframes eati-pop {
              0% { transform: scale(0) rotate(-20deg); }
              70% { transform: scale(1.2) rotate(5deg); }
              100% { transform: scale(1) rotate(0deg); }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}
