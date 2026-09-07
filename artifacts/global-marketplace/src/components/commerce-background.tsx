import { useState, useEffect } from 'react';

// Full-bleed video background for the auth, signup and onboarding screens.
//
// One market clip fills the screen, a scrim over it keeps the form readable, and a few
// 3D commerce objects drift on top. The clip is self-hosted in `public/clips/` — the
// free video CDNs block hotlinking, which would leave a dead black screen.

const CLIPS_AVAILABLE = true;
const HERO_VIDEO = '/clips/market-hero.mp4';
// Shown while the video loads, and instead of it on a metered connection. It is a frame
// from the same clip, self-hosted, so the still and the video are the same scene and the
// screen never depends on an outside image host.
const HERO_STILL = '/clips/market-hero.jpg';

// A few MB of autoplaying video is real money on a metered Burundian mobile plan.
// Respect an explicit data-saver setting and skip video on slow connections — those
// users get the still. An unknown connection is treated as fine.
function videoSuitsThisConnection(): boolean {
  if (typeof navigator === 'undefined') return false;
  const conn = (navigator as unknown as { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  if (!conn) return true;
  if (conn.saveData) return false;
  return !['slow-2g', '2g', '3g'].includes(conn.effectiveType || '');
}

// A missing clip is not a 404 on Cloudflare Pages: the SPA fallback answers 200 with
// index.html, and <video> would be handed a web page and fail oddly. Confirm the URL is
// really a video first — one 1-byte range request, cached for the session.
let videoProbe: Promise<boolean> | null = null;
function isRealVideo(url: string): Promise<boolean> {
  if (!videoProbe) {
    videoProbe = fetch(url, { headers: { Range: 'bytes=0-0' } })
      .then(r => r.ok && /^video\//i.test(r.headers.get('content-type') || ''))
      .catch(() => false);
  }
  return videoProbe;
}

const STYLES = `
  @keyframes cb-spin-y { from { transform: rotateX(-18deg) rotateY(0deg); } to { transform: rotateX(-18deg) rotateY(360deg); } }
  @keyframes cb-spin-tilt { from { transform: rotateX(14deg) rotateY(0deg) rotateZ(6deg); } to { transform: rotateX(14deg) rotateY(-360deg) rotateZ(6deg); } }
  @keyframes cb-bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-24px); } }
  @keyframes cb-rise { 0% { transform: translateY(18px); opacity: 0; } 12%,88% { opacity: .45; } 100% { transform: translateY(-120px); opacity: 0; } }
  @keyframes cb-fade { from { opacity: 0; } to { opacity: 1; } }
  /* Respect a reduced-motion preference: keep the scene, drop the movement. */
  @media (prefers-reduced-motion: reduce) {
    .cb-scene *, .cb-scene *::before, .cb-scene *::after { animation: none !important; }
    .cb-scene video { display: none; }
  }
`;

// One face of a CSS cube.
function Face({ transform, background, children }: { transform: string; background: string; children?: React.ReactNode }) {
  return (
    <div
      className="absolute inset-0 grid place-items-center rounded-[6px]"
      style={{ transform, background, backfaceVisibility: 'hidden', boxShadow: 'inset 0 0 24px rgba(0,0,0,.15)' }}
    >
      {children}
    </div>
  );
}

// A rotating cube. `size` drives the half-depth so the faces meet correctly.
function Cube({ size, faces, glyph }: { size: number; faces: [string, string]; glyph?: string }) {
  const d = size / 2;
  const [light, dark] = faces;
  return (
    <div style={{ width: size, height: size, transformStyle: 'preserve-3d', animation: 'cb-spin-y 18s linear infinite' }}>
      <Face transform={`translateZ(${d}px)`} background={light}>{glyph && <span style={{ fontSize: size * 0.42 }}>{glyph}</span>}</Face>
      <Face transform={`rotateY(180deg) translateZ(${d}px)`} background={dark} />
      <Face transform={`rotateY(90deg) translateZ(${d}px)`} background={dark} />
      <Face transform={`rotateY(-90deg) translateZ(${d}px)`} background={light} />
      <Face transform={`rotateX(90deg) translateZ(${d}px)`} background={light} />
      <Face transform={`rotateX(-90deg) translateZ(${d}px)`} background={dark} />
    </div>
  );
}

// A spinning coin, for the "money coming in" note.
function Coin({ size }: { size: number }) {
  return (
    <div style={{ width: size, height: size, transformStyle: 'preserve-3d', animation: 'cb-spin-tilt 9s linear infinite' }}>
      <div
        className="absolute inset-0 grid place-items-center rounded-full"
        style={{ background: 'linear-gradient(145deg,#ffd469,#f0a125)', boxShadow: 'inset 0 0 18px rgba(140,80,0,.45)', fontSize: size * 0.36, fontWeight: 800, color: '#8a5200' }}
      >
        BIF
      </div>
      <div className="absolute inset-0 rounded-full" style={{ transform: 'translateZ(-6px)', background: 'linear-gradient(145deg,#d98f14,#b06f08)' }} />
    </div>
  );
}

// Kept sparse so they read as accents over the footage rather than clutter.
const OBJECTS = [
  { kind: 'parcel', size: 84, left: '6%', top: '18%', delay: 0 },
  { kind: 'coin', size: 64, left: '84%', top: '24%', delay: -3 },
  { kind: 'tag', size: 68, left: '12%', top: '70%', delay: -6 },
  { kind: 'coin', size: 52, left: '78%', top: '74%', delay: -2 },
] as const;

export function CommerceBackground({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  const [allowVideo] = useState(videoSuitsThisConnection);
  const [videoReady, setVideoReady] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);

  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (CLIPS_AVAILABLE && allowVideo) isRealVideo(HERO_VIDEO).then(ok => { if (!cancelled) setVideoReady(ok); });
    return () => { cancelled = true; };
  }, [allowVideo]);

  // `autoplay` alone is not reliable: some browsers defer a muted autoplay until the
  // page is interacted with, or until the element is nudged. Ask directly on mount, and
  // again on the first interaction, so the background is moving rather than a frozen
  // frame. A rejection is fine — the poster still fills the screen.
  useEffect(() => {
    if (!videoEl) return;
    const tryPlay = () => { void videoEl.play().catch(() => { /* autoplay refused; poster stands in */ }); };
    tryPlay();
    const events: (keyof WindowEventMap)[] = ['pointerdown', 'keydown', 'touchstart'];
    events.forEach(e => window.addEventListener(e, tryPlay, { once: true, passive: true }));
    return () => events.forEach(e => window.removeEventListener(e, tryPlay));
  }, [videoEl]);

  const showVideo = CLIPS_AVAILABLE && allowVideo && videoReady && !videoFailed;

  // Text sits directly over moving footage now, so the scrim does more work than it did
  // behind static tiles — without it the form is unreadable whenever the clip brightens.
  // Enough contrast for the text that sits directly on the footage, but light enough
  // that the market is still clearly the background rather than a flat wash.
  // Tuned by eye against the live clip: heavier than this and the market reads as a flat
  // wash, lighter and the heading over the footage loses contrast. The form itself sits
  // on its own opaque card, so only the heading text depends on this.
  const scrim = tone === 'dark'
    ? 'linear-gradient(rgba(16,24,36,.60), rgba(16,24,36,.48))'
    : 'linear-gradient(rgba(255,255,255,.66), rgba(255,255,255,.56))';

  return (
    <div className="cb-scene pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
      <style>{STYLES}</style>

      {/* Layer 1 — the footage, filling the screen. The still stands in until the video
          is confirmed and decoded, so there is never a blank frame. */}
      <img src={HERO_STILL} alt="" className="absolute inset-0 h-full w-full object-cover" />
      {showVideo && (
        <video
          src={HERO_VIDEO}
          poster={HERO_STILL}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          ref={setVideoEl}
          onError={() => setVideoFailed(true)}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ animation: 'cb-fade 1.2s ease-out both' }}
        />
      )}

      {/* Layer 2 — scrim for legibility. */}
      <div className="absolute inset-0" style={{ background: scrim }} />

      {/* Layer 3 — 3D commerce objects drifting over the scene. */}
      <div className="absolute inset-0" style={{ perspective: '1100px', perspectiveOrigin: '50% 45%' }}>
        {OBJECTS.map((obj, i) => (
          <div
            key={`${obj.kind}-${i}`}
            className="absolute"
            style={{
              left: obj.left,
              top: obj.top,
              opacity: tone === 'dark' ? 0.7 : 0.5,
              transformStyle: 'preserve-3d',
              animation: `cb-bob ${9 + i * 1.6}s ease-in-out infinite`,
              animationDelay: `${obj.delay}s`,
            }}
          >
            {obj.kind === 'coin' ? (
              <Coin size={obj.size} />
            ) : obj.kind === 'parcel' ? (
              <Cube size={obj.size} faces={['linear-gradient(145deg,#e8b27a,#c98a4b)', 'linear-gradient(145deg,#c98a4b,#a86f38)']} glyph="📦" />
            ) : (
              <Cube size={obj.size} faces={['linear-gradient(145deg,#ffb066,#ff8a2b)', 'linear-gradient(145deg,#ef7d1c,#d96a10)']} glyph="🏷️" />
            )}
          </div>
        ))}

        {/* Layer 4 — receipts drifting upward, for a sense of orders flowing in. */}
        {Array.from({ length: 6 }).map((_, i) => (
          <span
            key={`spark-${i}`}
            className="absolute rounded-full"
            style={{
              left: `${(i * 16 + 9) % 92}%`,
              top: `${66 + (i % 3) * 9}%`,
              width: 6,
              height: 6,
              background: i % 2 ? '#ff9900' : '#1a5f4a',
              opacity: 0,
              animation: `cb-rise ${11 + i * 2}s linear infinite`,
              animationDelay: `${i * -2.4}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
