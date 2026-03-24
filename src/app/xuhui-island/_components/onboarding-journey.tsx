'use client';

import { useEffect, useState } from 'react';
import { playAudioFile } from '@/lib/sound';

type OnboardingField = 'taste' | 'vibe' | 'mood';

export interface FirstDayAnswers {
  taste: string;
  vibe: string;
  mood: string;
}

interface ChoiceGroup {
  key: OnboardingField;
  title: string;
  subtitle: string;
  options: string[];
}

interface FirstDayReport {
  shopName: string;
  openingLine: string;
  summaryLine: string;
  closingLine: string;
  shopImage?: string;
}

interface OnboardingJourneyProps {
  phase: 'opening' | 'intro' | 'questions' | 'report' | 'hidden';
  answers: FirstDayAnswers;
  choiceGroups: ChoiceGroup[];
  report: FirstDayReport | null;
  onAnswer: (field: OnboardingField, value: string) => void;
  onContinueIntro: () => void;
  onActivate: () => void;
  onCloseReport: () => void;
  onShareStory?: () => void;
  isSharingStory?: boolean;
  leadVariant?: string;
}

function playDefaultTap() {
  playAudioFile('/usual.mp3', 0.5);
}

function getChoiceOptionEmoji(label: string) {
  if (label.includes('海鲜')) return '🦐';
  if (label.includes('主食')) return '🍚';
  if (label.includes('甜')) return '🍰';
  if (label.includes('热闹')) return '🎉';
  if (label.includes('安静')) return '🌙';
  if (label.includes('慢慢')) return '🌊';
  if (label.includes('照顾')) return '🤍';
  if (label.includes('惊喜')) return '✨';
  if (label.includes('散散心')) return '🍃';
  return '🪄';
}

function getChoiceGroupGlow(key: OnboardingField) {
  if (key === 'taste') {
    return 'radial-gradient(circle at 16% 18%, rgba(255,194,114,0.24) 0%, transparent 34%)';
  }

  if (key === 'vibe') {
    return 'radial-gradient(circle at 16% 18%, rgba(138,196,255,0.22) 0%, transparent 34%)';
  }

  return 'radial-gradient(circle at 16% 18%, rgba(255,198,154,0.22) 0%, transparent 34%)';
}

export function OnboardingJourney({
  phase,
  answers,
  choiceGroups,
  report,
  onAnswer,
  onContinueIntro,
  onActivate,
  onCloseReport,
  onShareStory,
  isSharingStory = false,
  leadVariant,
}: OnboardingJourneyProps) {
  const [questionIndex, setQuestionIndex] = useState(0);

  useEffect(() => {
    if (phase !== 'questions') return;
    const firstUnansweredIndex = choiceGroups.findIndex((group) => !answers[group.key]);
    setQuestionIndex(firstUnansweredIndex === -1 ? Math.max(choiceGroups.length - 1, 0) : firstUnansweredIndex);
  }, [phase, choiceGroups]);

  if (phase === 'hidden') return null;

  const canActivate = choiceGroups.every((group) => Boolean(answers[group.key]));
  const currentChoiceGroup = choiceGroups[questionIndex] ?? choiceGroups[0];
  const currentAnswer = currentChoiceGroup ? answers[currentChoiceGroup.key] : '';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 18,
        background:
          phase === 'opening'
            ? 'radial-gradient(circle at 50% 30%, rgba(220,245,255,0.42) 0%, rgba(20,55,80,0.92) 48%, rgba(6,18,30,0.98) 100%)'
            : 'rgba(3, 14, 24, 0.72)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
      }}
    >
      {phase === 'opening' ? (
        <div
          style={{
            textAlign: 'center',
            color: '#ebfbff',
            animation: 'first-day-opening 2.2s ease-out forwards',
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 900, letterSpacing: '0.32em', color: 'rgba(210,244,255,0.72)' }}>
            WANGCAI IS COMING
          </div>
          <div style={{ marginTop: 18, fontSize: 'clamp(32px, 6vw, 60px)', fontWeight: 900 }}>
            云层正在散开，
            <br />
            你要落进这座岛了。
          </div>
        </div>
      ) : null}

      {phase === 'intro' ? (
        <div
          style={{
            position: 'relative',
            width: 720,
            maxWidth: '100%',
            minHeight: 560,
            padding: '22px 22px 20px',
            borderRadius: 32,
            background: 'linear-gradient(180deg, rgba(10,38,54,0.95) 0%, rgba(12,27,39,0.96) 100%)',
            border: '1px solid rgba(110,220,205,0.28)',
            color: '#e2fbf6',
            boxShadow: '0 24px 80px rgba(0,16,28,0.38)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'radial-gradient(circle at 16% 14%, rgba(255,228,165,0.14) 0%, transparent 22%), radial-gradient(circle at 82% 24%, rgba(126,238,224,0.16) 0%, transparent 26%), linear-gradient(180deg, transparent 0%, rgba(2,10,18,0.12) 100%)',
              pointerEvents: 'none',
            }}
          />
          <div
            style={{
              position: 'relative',
              minHeight: 470,
              borderRadius: 28,
              overflow: 'hidden',
              background:
                'radial-gradient(circle at 50% 18%, rgba(255,234,190,0.3) 0%, rgba(255,234,190,0.08) 24%, transparent 42%), linear-gradient(180deg, rgba(13,45,64,0.96) 0%, rgba(6,18,30,0.98) 100%)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background:
                  'radial-gradient(circle at 18% 84%, rgba(90,176,152,0.18) 0%, transparent 22%), radial-gradient(circle at 84% 18%, rgba(255,188,122,0.18) 0%, transparent 20%)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: 76,
                width: 190,
                height: 190,
                transform: 'translateX(-50%)',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(255,231,184,0.82) 0%, rgba(255,231,184,0.22) 42%, transparent 74%)',
                filter: 'blur(4px)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: 24,
                right: 24,
                top: 28,
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 'clamp(42px, 6vw, 70px)', fontWeight: 900, lineHeight: 1.02 }}>
                “你终于来了。”
              </div>
            </div>
            <div
              style={{
                position: 'absolute',
                left: '50%',
                bottom: 20,
                width: 250,
                height: 42,
                transform: 'translateX(-50%)',
                borderRadius: 999,
                background: 'rgba(0,0,0,0.24)',
                filter: 'blur(12px)',
              }}
            />
            {leadVariant ? (
              <img
                src={leadVariant}
                alt=""
                draggable={false}
                style={{
                  position: 'absolute',
                  left: '50%',
                  bottom: 28,
                  zIndex: 1,
                  width: 270,
                  height: 270,
                  transform: 'translateX(-50%)',
                  objectFit: 'contain',
                  filter: 'drop-shadow(0 30px 32px rgba(0,0,0,0.3))',
                }}
              />
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => {
              playDefaultTap();
              onContinueIntro();
            }}
            style={{
              position: 'relative',
              marginTop: 18,
              width: '100%',
              padding: '15px 18px',
              borderRadius: 999,
              border: 0,
              background: 'linear-gradient(135deg, #ffd36e 0%, #ff9a44 100%)',
              color: '#503014',
              fontSize: 15,
              fontWeight: 900,
              cursor: 'pointer',
            }}
          >
            让旺财替我带路
          </button>
        </div>
      ) : null}

      {phase === 'questions' ? (
        <div
          style={{
            position: 'relative',
            width: 760,
            maxWidth: '100%',
            padding: '24px 22px 22px',
            borderRadius: 32,
            background: 'linear-gradient(180deg, rgba(10,38,54,0.95) 0%, rgba(12,27,39,0.96) 100%)',
            border: '1px solid rgba(110,220,205,0.28)',
            color: '#e2fbf6',
            boxShadow: '0 24px 80px rgba(0,16,28,0.38)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'radial-gradient(circle at 18% 16%, rgba(255,231,171,0.12) 0%, transparent 22%), radial-gradient(circle at 84% 22%, rgba(126,238,224,0.14) 0%, transparent 24%)',
              pointerEvents: 'none',
            }}
          />

          <div
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <div>
              <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: '0.22em', color: 'rgba(125,232,215,0.76)' }}>
                QUESTION {questionIndex + 1} / {choiceGroups.length}
              </div>
              <div style={{ marginTop: 10, fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 900, lineHeight: 1.08 }}>
                {currentChoiceGroup?.title}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {choiceGroups.map((group, index) => (
                <span
                  key={group.key}
                  style={{
                    width: index === questionIndex ? 28 : 10,
                    height: 10,
                    borderRadius: 999,
                    background:
                      index === questionIndex
                        ? 'linear-gradient(135deg, #ffd36e 0%, #ff9a44 100%)'
                        : answers[group.key]
                          ? 'rgba(154,247,230,0.62)'
                          : 'rgba(255,255,255,0.12)',
                    transition: 'all 180ms ease',
                  }}
                />
              ))}
            </div>
          </div>

          <div style={{ position: 'relative', marginTop: 10, fontSize: 14, lineHeight: 1.6, color: 'rgba(210,242,236,0.78)' }}>
            {currentChoiceGroup?.subtitle}
          </div>

          <div
            style={{
              position: 'relative',
              marginTop: 22,
              minHeight: 340,
              padding: '22px',
              borderRadius: 28,
              background:
                'linear-gradient(180deg, rgba(12,34,48,0.86) 0%, rgba(8,20,30,0.9) 100%)',
              border: '1px solid rgba(255,255,255,0.08)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: currentChoiceGroup ? getChoiceGroupGlow(currentChoiceGroup.key) : 'none',
                pointerEvents: 'none',
              }}
            />
            <div
              style={{
                position: 'relative',
                display: 'grid',
                gap: 12,
              }}
            >
              {currentChoiceGroup?.options.map((option) => (
                <button
                  key={`${currentChoiceGroup.key}-${option}`}
                  type="button"
                  onClick={() => {
                    playDefaultTap();
                    onAnswer(currentChoiceGroup.key, option);
                    if (questionIndex < choiceGroups.length - 1) {
                      window.setTimeout(() => {
                        setQuestionIndex((current) => Math.min(current + 1, choiceGroups.length - 1));
                      }, 140);
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    padding: '18px 18px',
                    borderRadius: 22,
                    border: `1px solid ${
                      currentAnswer === option
                        ? 'rgba(255,216,146,0.58)'
                        : 'rgba(255,255,255,0.08)'
                    }`,
                    background:
                      currentAnswer === option
                        ? 'linear-gradient(180deg, rgba(255,184,85,0.22) 0%, rgba(255,255,255,0.08) 100%)'
                        : 'rgba(255,255,255,0.04)',
                    color: '#eefbf8',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ fontSize: 34, lineHeight: 1 }}>{getChoiceOptionEmoji(option)}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 18, fontWeight: 900, lineHeight: 1.35 }}>{option}</div>
                    <div
                      style={{
                        marginTop: 6,
                        fontSize: 12,
                        fontWeight: 800,
                        color: currentAnswer === option ? '#ffe3a5' : 'rgba(204,234,228,0.68)',
                      }}
                    >
                      {currentAnswer === option ? '已选中，继续往下走' : '点这里'}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div
            style={{
              marginTop: 18,
              display: 'flex',
              gap: 10,
            }}
          >
            <button
              type="button"
              onClick={() => {
                playDefaultTap();
                setQuestionIndex((current) => Math.max(current - 1, 0));
              }}
              disabled={questionIndex === 0}
              style={{
                flex: '0 0 132px',
                padding: '15px 18px',
                borderRadius: 999,
                border: '1px solid rgba(255,255,255,0.16)',
                background: questionIndex === 0 ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.08)',
                color: questionIndex === 0 ? 'rgba(220,245,238,0.36)' : '#e6fbf7',
                fontSize: 14,
                fontWeight: 900,
                cursor: questionIndex === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              上一问
            </button>
            {questionIndex === choiceGroups.length - 1 ? (
              <button
                type="button"
                disabled={!canActivate}
                onClick={() => {
                  playDefaultTap();
                  onActivate();
                }}
                style={{
                  flex: 1,
                  padding: '15px 18px',
                  borderRadius: 999,
                  border: 0,
                  background: canActivate
                    ? 'linear-gradient(135deg, #ffd36e 0%, #ff9a44 100%)'
                    : 'rgba(255,255,255,0.12)',
                  color: canActivate ? '#503014' : 'rgba(220,245,238,0.42)',
                  fontSize: 15,
                  fontWeight: 900,
                  cursor: canActivate ? 'pointer' : 'not-allowed',
                }}
              >
                让旺财替我出发
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  playDefaultTap();
                  setQuestionIndex((current) => Math.min(current + 1, choiceGroups.length - 1));
                }}
                disabled={!currentAnswer}
                style={{
                  flex: 1,
                  padding: '15px 18px',
                  borderRadius: 999,
                  border: 0,
                  background: currentAnswer
                    ? 'linear-gradient(135deg, #9af7e6 0%, #63d9c2 100%)'
                    : 'rgba(255,255,255,0.12)',
                  color: currentAnswer ? '#0e4036' : 'rgba(220,245,238,0.42)',
                  fontSize: 15,
                  fontWeight: 900,
                  cursor: currentAnswer ? 'pointer' : 'not-allowed',
                }}
              >
                下一问
              </button>
            )}
          </div>
        </div>
      ) : null}

      {phase === 'report' && report ? (
        <div
          style={{
            width: 680,
            maxWidth: '100%',
            padding: '28px 24px',
            borderRadius: 30,
            background: 'linear-gradient(180deg, rgba(11,36,52,0.97) 0%, rgba(15,28,38,0.98) 100%)',
            border: '1px solid rgba(110,220,205,0.28)',
            color: '#e2fbf6',
            boxShadow: '0 24px 80px rgba(0,16,28,0.42)',
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: '0.22em', color: 'rgba(125,232,215,0.76)' }}>
            探店回报
          </div>
          <div style={{ marginTop: 12, fontSize: 28, fontWeight: 900, lineHeight: 1.16 }}>
            旺财回来了，
            <br />
            还替你带回了今天的第一条故事。
          </div>
          <div
            style={{
              marginTop: 18,
              padding: 18,
              borderRadius: 24,
              background:
                'radial-gradient(circle at 15% 18%, rgba(100,220,200,0.18) 0%, transparent 28%), linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.03) 100%)',
              border: '1px solid rgba(255,255,255,0.08)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1.1fr) minmax(200px, 0.9fr)',
                gap: 16,
                alignItems: 'stretch',
              }}
            >
              <div
                style={{
                  position: 'relative',
                  borderRadius: 22,
                  minHeight: 250,
                  padding: 18,
                  background:
                    'linear-gradient(180deg, rgba(12,52,78,0.94) 0%, rgba(5,26,40,0.96) 100%)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background:
                      'radial-gradient(circle at 18% 24%, rgba(126,238,224,0.18) 0%, transparent 30%), radial-gradient(circle at 80% 16%, rgba(255,194,114,0.18) 0%, transparent 28%)',
                    pointerEvents: 'none',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    right: -12,
                    bottom: -10,
                    width: 160,
                    height: 160,
                    borderRadius: 26,
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'linear-gradient(180deg, rgba(4,14,24,0.12) 0%, rgba(4,14,24,0.42) 100%)',
                      zIndex: 1,
                    }}
                  />
                  {report.shopImage ? (
                    <img
                      src={report.shopImage}
                      alt={report.shopName}
                      draggable={false}
                      style={{
                        position: 'relative',
                        zIndex: 0,
                        width: 140,
                        height: 140,
                        objectFit: 'contain',
                        filter: 'drop-shadow(0 18px 24px rgba(0,0,0,0.24))',
                      }}
                    />
                  ) : null}
                </div>
                <div
                  style={{
                    position: 'relative',
                    zIndex: 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 12px',
                    borderRadius: 999,
                    background: 'rgba(255,255,255,0.08)',
                    color: '#ffe39b',
                    fontSize: 12,
                    fontWeight: 900,
                  }}
                >
                  第一站 · {report.shopName}
                </div>
                <div
                  style={{
                    position: 'relative',
                    zIndex: 1,
                    marginTop: 18,
                    maxWidth: 280,
                    padding: '16px 18px',
                    borderRadius: 22,
                    background: 'rgba(255,251,242,0.94)',
                    color: '#5c4330',
                    fontSize: 15,
                    lineHeight: 1.6,
                    fontWeight: 800,
                    boxShadow: '0 18px 40px rgba(0,0,0,0.18)',
                  }}
                >
                  {report.openingLine}
                  <span
                    style={{
                      position: 'absolute',
                      left: 26,
                      bottom: -8,
                      width: 16,
                      height: 16,
                      transform: 'rotate(45deg)',
                      background: 'rgba(255,251,242,0.94)',
                    }}
                  />
                </div>
                <div
                  style={{
                    position: 'relative',
                    zIndex: 1,
                    marginTop: 34,
                    maxWidth: 300,
                    padding: '12px 14px',
                    borderRadius: 18,
                    background: 'linear-gradient(180deg, rgba(6,22,34,0.76) 0%, rgba(6,22,34,0.56) 100%)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    fontSize: 13,
                    lineHeight: 1.7,
                    color: 'rgba(226,247,242,0.82)',
                  }}
                >
                  {report.summaryLine}
                </div>
              </div>

              <div
                style={{
                  position: 'relative',
                  borderRadius: 22,
                  minHeight: 250,
                  padding: 18,
                  background:
                    'linear-gradient(180deg, rgba(17,31,42,0.92) 0%, rgba(9,18,26,0.96) 100%)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'center',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background:
                      'radial-gradient(circle at 50% 16%, rgba(255,231,171,0.16) 0%, transparent 22%), linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(0,0,0,0.12) 100%)',
                    pointerEvents: 'none',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    left: '50%',
                    bottom: 18,
                    width: 94,
                    height: 24,
                    transform: 'translateX(-50%)',
                    borderRadius: 999,
                    background: 'rgba(0,0,0,0.28)',
                    filter: 'blur(10px)',
                  }}
                />
                {leadVariant ? (
                  <img
                    src={leadVariant}
                    alt=""
                    draggable={false}
                    style={{
                      position: 'relative',
                      zIndex: 1,
                      width: 164,
                      height: 164,
                      objectFit: 'contain',
                      filter: 'drop-shadow(0 18px 28px rgba(0,0,0,0.32))',
                    }}
                  />
                ) : null}
                <div
                  style={{
                    position: 'absolute',
                    left: 16,
                    right: 16,
                    top: 16,
                    padding: '14px 16px',
                    borderRadius: 20,
                    background: 'rgba(6, 24, 36, 0.84)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: '#e6fdf7',
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 900, color: '#9af7e6', letterSpacing: '0.14em' }}>
                    旺财带回来的话
                  </div>
                  <div style={{ marginTop: 8, fontSize: 14, lineHeight: 1.65, fontWeight: 800 }}>
                    {report.closingLine}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 18, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {onShareStory ? (
              <button
                type="button"
                onClick={() => {
                  playDefaultTap();
                  onShareStory();
                }}
                disabled={isSharingStory}
                style={{
                  flex: '1 1 220px',
                  padding: '14px 16px',
                  borderRadius: 999,
                  border: 0,
                  background: 'linear-gradient(135deg, #9af7e6 0%, #63d9c2 100%)',
                  color: '#0e4036',
                  fontSize: 14,
                  fontWeight: 900,
                  cursor: isSharingStory ? 'progress' : 'pointer',
                }}
              >
                {isSharingStory ? '正在生成故事卡…' : '下载今天的故事卡'}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => {
                playDefaultTap();
                onCloseReport();
              }}
              style={{
                flex: '1 1 180px',
                padding: '14px 16px',
                borderRadius: 999,
                border: '1px solid rgba(255,255,255,0.16)',
                background: 'rgba(255,255,255,0.08)',
                color: '#e6fbf7',
                fontSize: 14,
                fontWeight: 900,
                cursor: 'pointer',
              }}
            >
              我知道了，明天还来
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
