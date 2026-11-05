import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";

export default function BrandReveal({ onComplete }) {
  const videoRef = useRef(null);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [soundNeedsGesture, setSoundNeedsGesture] = useState(false);
  const [animationFailed, setAnimationFailed] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;
    let cancelled = false;

    async function playAnimation() {
      try {
        video.muted = false;
        await video.play();
        if (!cancelled) setSoundEnabled(true);
      } catch {
        video.muted = true;
        try {
          await video.play();
          if (!cancelled) setSoundNeedsGesture(true);
        } catch {
          if (!cancelled) {
            setAnimationFailed(true);
            onComplete();
          }
        }
      }
    }

    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      playAnimation();
    } else {
      video.addEventListener("loadeddata", playAnimation, { once: true });
      video.addEventListener("error", onVideoError, { once: true });
    }

    function onVideoError() {
      if (!cancelled) {
        setAnimationFailed(true);
        onComplete();
      }
    }

    return () => {
      cancelled = true;
      video.removeEventListener("loadeddata", playAnimation);
      video.removeEventListener("error", onVideoError);
    };
  }, [onComplete]);

  async function toggleSound() {
    const video = videoRef.current;
    if (!video) return;
    if (soundEnabled) {
      video.muted = true;
      setSoundEnabled(false);
      setSoundNeedsGesture(true);
      return;
    }

    try {
      video.muted = false;
      await video.play();
      setSoundEnabled(true);
      setSoundNeedsGesture(false);
    } catch {
      video.muted = true;
      setSoundEnabled(false);
      setSoundNeedsGesture(true);
    }
  }

  return (
    <main className="brand-reveal fixed inset-0 z-[100] grid place-items-center overflow-hidden" aria-label="FleetFlow brand animation">
      <div aria-hidden="true" className="brand-reveal-glow brand-reveal-glow-top" />
      <div aria-hidden="true" className="brand-reveal-glow brand-reveal-glow-bottom" />

      <section className="brand-reveal-content absolute inset-0 flex h-full w-full max-w-none flex-col items-center justify-end px-5 pb-8 text-center sm:pb-10">
        <div className="brand-reveal-video-wrap absolute inset-0 h-full w-full">
          {!animationFailed ? (
            <video
              ref={videoRef}
              className="brand-reveal-video block"
              playsInline
              preload="auto"
              onEnded={onComplete}
              onError={() => {
                setAnimationFailed(true);
                onComplete();
              }}
            >
              <source src="/brand/loader_animation.webm" type="video/webm" />
              <source src="/brand/loader_animation.mp4" type="video/mp4" />
            </video>
          ) : (
            <img
              src="/brand/fleetflow-symbol.png"
              alt="FleetFlow truck"
              className="mx-auto h-full w-full object-contain"
            />
          )}
        </div>

        <div className="brand-reveal-signature relative z-10 flex flex-col items-center">
          <svg aria-hidden="true" viewBox="0 0 220 16" className="brand-reveal-route mt-5 h-4 w-48 sm:w-56" fill="none">
            <path d="M4 8H216" stroke="#dce5f1" strokeWidth="1.5" strokeLinecap="round" />
            <path className="brand-reveal-route-line" d="M4 8H216" stroke="url(#brand-route-gradient)" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="4" cy="8" r="3" fill="#fff" stroke="#1d5eff" strokeWidth="1.5" />
            <circle cx="216" cy="8" r="3" fill="#fff" stroke="#14b8d4" strokeWidth="1.5" />
            <defs>
              <linearGradient id="brand-route-gradient" x1="4" x2="216" y1="8" y2="8" gradientUnits="userSpaceOnUse">
                <stop stopColor="#1d5eff" />
                <stop offset="1" stopColor="#14b8d4" />
              </linearGradient>
            </defs>
          </svg>
          <p className="mt-3 text-xs font-medium tracking-wide text-slate-500">
            Preparing your workspace<span className="brand-reveal-ellipsis" aria-hidden="true">...</span>
          </p>
        </div>
      </section>

      {soundNeedsGesture && (
        <button
          type="button"
          onClick={toggleSound}
          className="absolute bottom-5 right-5 inline-flex items-center gap-2 rounded-full border border-slate-200/90 bg-white/80 px-3 py-2 text-xs font-medium text-slate-600 shadow-sm backdrop-blur transition hover:bg-white"
          aria-label="Enable animation sound"
        >
          <VolumeX size={14} /> Enable sound
        </button>
      )}
      {soundEnabled && (
        <button
          type="button"
          onClick={toggleSound}
          className="absolute bottom-5 right-5 rounded-full border border-slate-200/90 bg-white/70 p-2.5 text-slate-500 shadow-sm backdrop-blur transition hover:bg-white"
          aria-label="Mute animation sound"
        >
          <Volume2 size={15} />
        </button>
      )}
    </main>
  );
}
