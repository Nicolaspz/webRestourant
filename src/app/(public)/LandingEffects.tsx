'use client';

import { useEffect, useRef } from 'react';

export default function LandingEffects() {
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
    let dispose = () => {};
    const setup = () => {
      dispose();
      if (reduced.matches) return;
      const cards = Array.from(document.querySelectorAll<HTMLElement>('.sf-feature-grid > article'));
      // Animate only when observed: content remains readable without JavaScript.
      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          const card = entry.target as HTMLElement;
          const index = cards.indexOf(card);
          const animation = card.animate([
            { opacity: 0, transform: `translateY(55px) rotate(${index % 2 ? 4 : -4}deg) scale(.94)` },
            { opacity: 1, transform: 'translateY(0) rotate(0deg) scale(1)' },
          ], { duration: 800, delay: (index % 3) * 130, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards' });
          animations.push(animation);
          observer.unobserve(card);
        });
      }, { threshold: .12 });
      const animations: Animation[] = [];
      cards.forEach(card => observer.observe(card));

      let frame = 0;
      let x = 0, y = 0, rx = 0, ry = 0;
      let visible = false;
      const hide = () => {
        visible = false;
        cancelAnimationFrame(frame);
        frame = 0;
        dot.current?.classList.remove('is-visible');
        ring.current?.classList.remove('is-visible');
      };
      const tick = () => {
        rx += (x - rx) * .16;
        ry += (y - ry) * .16;
        if (ring.current) ring.current.style.transform = `translate3d(${rx}px,${ry}px,0)`;
        if (visible && (Math.abs(x - rx) + Math.abs(y - ry) > .1)) frame = requestAnimationFrame(tick);
        else frame = 0;
      };
      const move = (event: PointerEvent) => {
        if (event.pointerType !== 'mouse') { hide(); return; }
        x = event.clientX; y = event.clientY;
        if (!visible) {
          rx = x; ry = y; visible = true;
          dot.current?.classList.add('is-visible');
          ring.current?.classList.add('is-visible');
        }
        if (dot.current) dot.current.style.transform = `translate3d(${x}px,${y}px,0)`;
        ring.current?.classList.toggle('is-link', !!(event.target as Element).closest('a,button,input,select,textarea'));
        if (!frame) frame = requestAnimationFrame(tick);
      };
      const visibility = () => { if (document.hidden) hide(); };
      if (fine.matches) {
        document.addEventListener('pointermove', move);
        document.documentElement.addEventListener('pointerleave', hide);
        window.addEventListener('blur', hide);
        document.addEventListener('visibilitychange', visibility);
      }
      dispose = () => {
        observer.disconnect();
        animations.forEach(animation => animation.cancel());
        hide();
        document.removeEventListener('pointermove', move);
        document.documentElement.removeEventListener('pointerleave', hide);
        window.removeEventListener('blur', hide);
        document.removeEventListener('visibilitychange', visibility);
      };
    };
    setup();
    reduced.addEventListener('change', setup);
    fine.addEventListener('change', setup);
    return () => { dispose(); reduced.removeEventListener('change', setup); fine.removeEventListener('change', setup); };
  }, []);

  return <><div ref={dot} className="sf-cursor-dot" aria-hidden="true" /><div ref={ring} className="sf-cursor-ring" aria-hidden="true" /></>;
}
