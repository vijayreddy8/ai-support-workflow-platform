import React, { useEffect, useId, useRef, useState } from 'react';

/* Presentation-only helpers. No data, API or business logic lives here. */

const prefersReduced = () =>
  typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Smoothly counts a number up/down whenever `target` changes. */
export function useCountUp(target, duration = 1100) {
  const to = Number.isFinite(Number(target)) ? Number(target) : 0;
  const [val, setVal] = useState(prefersReduced() ? to : 0);
  const from = useRef(prefersReduced() ? to : 0);
  useEffect(() => {
    if (prefersReduced()) {
      from.current = to;
      setVal(to);
      return undefined;
    }
    let raf = 0;
    let start = null;
    const a = from.current;
    const tick = (t) => {
      if (start === null) start = t;
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 4);
      const v = a + (to - a) * eased;
      from.current = v;
      setVal(v);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, duration]);
  return Math.round(val);
}

export function Count({ value, suffix = '' }) {
  const v = useCountUp(value);
  return (
    <>
      {v}
      {suffix}
    </>
  );
}

/** Re-renders the caller every `ms` so time-based visuals (SLA) stay live. */
export function useNow(ms = 30000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

/** Card with a cursor-following spotlight + glowing border. */
export function Spot({ as: Tag = 'div', className = '', children, ...rest }) {
  const onMove = (e) => {
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${e.clientX - r.left}px`);
    el.style.setProperty('--my', `${e.clientY - r.top}px`);
  };
  return (
    <Tag {...rest} onMouseMove={onMove} className={`spot ${className}`}>
      {children}
    </Tag>
  );
}

/** Animated radial gauge. `children` render in the centre. */
export function Ring({ value, max = 100, size = 120, stroke = 10, colors, children, className = '' }) {
  const id = `rg${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const pct = Math.max(0, Math.min(1, (Number(value) || 0) / max));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const cx = size / 2;
  const style = {};
  if (colors) {
    style['--rg1'] = colors[0];
    style['--rg2'] = colors[1];
  }
  return (
    <div className={`ring ${className}`} style={{ width: size, height: size, ...style }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" style={{ stopColor: 'var(--rg1, var(--g1))' }} />
            <stop offset="100%" style={{ stopColor: 'var(--rg2, var(--g2))' }} />
          </linearGradient>
        </defs>
        <circle className="ring-track" cx={cx} cy={cx} r={r} strokeWidth={stroke} fill="none" />
        <circle
          key={Math.round(pct * 100)}
          className="ring-fill"
          cx={cx}
          cy={cx}
          r={r}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          transform={`rotate(-90 ${cx} ${cx})`}
          style={{ '--c': c }}
        />
      </svg>
      <div className="ring-center">{children}</div>
    </div>
  );
}

/** Animated aurora / grid / cursor-glow backdrop. Sits behind the whole app. */
export function Backdrop() {
  useEffect(() => {
    if (prefersReduced()) return undefined;
    let raf = 0;
    const root = document.documentElement;
    const move = (e) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        root.style.setProperty('--gx', `${e.clientX}px`);
        root.style.setProperty('--gy', `${e.clientY}px`);
      });
    };
    window.addEventListener('pointermove', move, { passive: true });
    return () => {
      window.removeEventListener('pointermove', move);
      cancelAnimationFrame(raf);
    };
  }, []);
  return (
    <div className="backdrop" aria-hidden="true">
      <i className="blob b1" />
      <i className="blob b2" />
      <i className="blob b3" />
      <i className="grid-lines" />
      <i className="cursor-glow" />
      <i className="grain" />
    </div>
  );
}

/** Short branded intro that fades away on first load. */
export function Splash({ icon, title, subtitle }) {
  const [gone, setGone] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setGone(true), prefersReduced() ? 0 : 2700);
    return () => clearTimeout(t);
  }, []);
  if (gone) return null;
  return (
    <div className="splash" aria-hidden="true">
      <div className="splash-core">
        <div className="splash-mark">{icon}</div>
        <div className="splash-title">{title}</div>
        <div className="splash-sub">{subtitle}</div>
        <div className="splash-bar">
          <i />
        </div>
      </div>
    </div>
  );
}

/** Stagger helper: style={stagger(i)} */
export const stagger = (i, step = 60, base = 0) => ({ '--d': `${base + Math.min(i, 14) * step}ms` });

export const initialsOf = (name = '') =>
  String(name)
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?';
