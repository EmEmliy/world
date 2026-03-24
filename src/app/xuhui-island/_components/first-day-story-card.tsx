import type { CSSProperties } from 'react';

export interface FirstDayStoryCardProps {
  taste: string;
  mood: string;
  vibe: string;
  firstLine: string;
  firstStop: string;
  reportLine: string;
  timeLabel: string;
  leadName?: string;
  title?: string;
  leadVariant?: string;
  shopImage?: string;
}

const shellStyle: CSSProperties = {
  width: 'min(100%, 720px)',
  borderRadius: 32,
  overflow: 'hidden',
  background:
    'linear-gradient(180deg, rgba(10,28,45,0.96) 0%, rgba(9,34,52,0.96) 42%, rgba(7,22,36,0.98) 100%)',
  border: '1px solid rgba(126, 238, 224, 0.18)',
  boxShadow:
    '0 28px 70px rgba(0, 20, 40, 0.45), inset 0 1px 0 rgba(255,255,255,0.06)',
  color: '#e4faf5',
  position: 'relative',
};

const glowStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  background:
    'radial-gradient(circle at 18% 18%, rgba(126,238,224,0.18) 0%, transparent 32%), radial-gradient(circle at 82% 16%, rgba(255,183,100,0.16) 0%, transparent 28%), radial-gradient(circle at 50% 92%, rgba(72,169,255,0.12) 0%, transparent 38%)',
  pointerEvents: 'none',
};

const headerLineStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '8px 12px',
  borderRadius: 999,
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.08)',
  color: 'rgba(228,250,245,0.92)',
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
};

const sectionLabelStyle: CSSProperties = {
  fontSize: 11,
  fontWeight: 900,
  letterSpacing: '0.2em',
  color: 'rgba(150, 245, 232, 0.6)',
  textTransform: 'uppercase',
};

const valueStyle: CSSProperties = {
  marginTop: 6,
  fontSize: 18,
  fontWeight: 900,
  lineHeight: 1.35,
  color: '#f5fffd',
};

export function FirstDayStoryCard({
  taste,
  mood,
  vibe,
  firstLine,
  firstStop,
  reportLine,
  timeLabel,
  leadName = '旺财',
  title = '旺财的第一天',
  leadVariant,
  shopImage,
}: FirstDayStoryCardProps) {
  return (
    <article
      data-story-card="first-day"
      aria-label={`${leadName}的第一天故事卡`}
      style={shellStyle}
    >
      <div style={glowStyle} />

      <div style={{ position: 'relative', padding: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={headerLineStyle}>
            <span>🦞</span>
            <span>{leadName}</span>
          </div>
          <div style={headerLineStyle}>{timeLabel}</div>
        </div>

        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 14, fontWeight: 900, color: 'rgba(126,238,224,0.82)', letterSpacing: '0.12em' }}>
            {title}
          </div>
          <h2
            style={{
              margin: '10px 0 0',
              fontSize: 'clamp(28px, 4vw, 42px)',
              lineHeight: 1.02,
              color: '#ffffff',
              textShadow: '0 12px 30px rgba(0,0,0,0.22)',
            }}
          >
            {firstLine}
          </h2>
          <p
            style={{
              margin: '12px 0 0',
              maxWidth: 560,
              fontSize: 15,
              lineHeight: 1.8,
              color: 'rgba(220,248,243,0.78)',
            }}
          >
            {reportLine}
          </p>
        </div>

        <div
          style={{
            marginTop: 24,
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.15fr) minmax(220px, 0.85fr)',
            gap: 14,
          }}
        >
          <section
            style={{
              position: 'relative',
              minHeight: 280,
              padding: 18,
              borderRadius: 28,
              background:
                'linear-gradient(180deg, rgba(10,45,64,0.96) 0%, rgba(8,26,40,0.98) 100%)',
              border: '1px solid rgba(255,255,255,0.08)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background:
                  'radial-gradient(circle at 18% 18%, rgba(126,238,224,0.18) 0%, transparent 32%), radial-gradient(circle at 82% 18%, rgba(255,183,100,0.16) 0%, transparent 28%)',
              }}
            />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={sectionLabelStyle}>今天的第一站</div>
              <div style={{ ...valueStyle, maxWidth: 320 }}>{firstStop}</div>
              <div
                style={{
                  marginTop: 16,
                  maxWidth: 320,
                  padding: '16px 18px',
                  borderRadius: 22,
                  background: 'rgba(255,250,242,0.94)',
                  color: '#5d4330',
                  fontSize: 15,
                  lineHeight: 1.6,
                  fontWeight: 800,
                  boxShadow: '0 18px 38px rgba(0,0,0,0.18)',
                }}
              >
                {firstLine}
              </div>
              <div
                style={{
                  marginTop: 18,
                  display: 'flex',
                  gap: 8,
                  flexWrap: 'wrap',
                }}
              >
                {[taste, vibe, mood].map((tag) => (
                  <span
                    key={tag}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '8px 12px',
                      borderRadius: 999,
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      color: '#f0fdf9',
                      fontSize: 12,
                      fontWeight: 800,
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            {shopImage ? (
              <img
                src={shopImage}
                alt={firstStop}
                draggable={false}
                style={{
                  position: 'absolute',
                  right: 8,
                  bottom: 2,
                  width: 176,
                  height: 176,
                  objectFit: 'contain',
                  filter: 'drop-shadow(0 22px 36px rgba(0,0,0,0.26))',
                }}
              />
            ) : null}
          </section>

          <section
            style={{
              position: 'relative',
              minHeight: 280,
              padding: 18,
              borderRadius: 28,
              background:
                'linear-gradient(180deg, rgba(17,31,42,0.92) 0%, rgba(9,18,26,0.96) 100%)',
              border: '1px solid rgba(255,255,255,0.08)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background:
                  'radial-gradient(circle at 50% 12%, rgba(255,232,168,0.18) 0%, transparent 22%), linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(0,0,0,0.12) 100%)',
              }}
            />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={sectionLabelStyle}>{leadName}带回来的话</div>
              <div
                style={{
                  marginTop: 14,
                  padding: '14px 16px',
                  borderRadius: 20,
                  background: 'rgba(6,24,36,0.84)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  fontSize: 14,
                  lineHeight: 1.68,
                  color: '#f8fffd',
                }}
              >
                {reportLine}
              </div>
            </div>
            <div
              style={{
                position: 'absolute',
                left: '50%',
                bottom: 18,
                width: 120,
                height: 26,
                transform: 'translateX(-50%)',
                borderRadius: 999,
                background: 'rgba(0,0,0,0.28)',
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
                  bottom: 18,
                  width: 170,
                  height: 170,
                  transform: 'translateX(-50%)',
                  objectFit: 'contain',
                  filter: 'drop-shadow(0 20px 30px rgba(0,0,0,0.32))',
                }}
              />
            ) : null}
          </section>
        </div>

        <div
          style={{
            marginTop: 16,
            display: 'flex',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
            fontSize: 12,
            color: 'rgba(220,248,243,0.62)',
          }}
        >
          <span>这是你们的第一天。</span>
          <span>你离开后，它还会继续运转。</span>
        </div>
      </div>
    </article>
  );
}
