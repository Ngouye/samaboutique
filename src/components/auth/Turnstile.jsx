import React, { useEffect, useRef } from 'react';

// Captcha Cloudflare Turnstile (gratuit, souvent invisible). Actif seulement si
// VITE_TURNSTILE_SITE_KEY est défini ET si le captcha est activé dans Supabase (Authentication → Attack Protection).
const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;
let scriptPromise = null;

function loadScript() {
  if (window.turnstile) return Promise.resolve();
  scriptPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.onload = resolve;
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error('Captcha indisponible'));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

// `resetKey` : à changer après chaque tentative (un jeton ne sert qu'une fois).
export default function Turnstile({ onToken, resetKey = 0 }) {
  const containerRef = useRef(null);
  const callbackRef = useRef(onToken);
  useEffect(() => {
    callbackRef.current = onToken;
  }, [onToken]);

  useEffect(() => {
    if (!SITE_KEY) return undefined;
    let widgetId = null;
    let cancelled = false;
    callbackRef.current('');
    loadScript()
      .then(() => {
        if (cancelled || !containerRef.current) return;
        widgetId = window.turnstile.render(containerRef.current, {
          sitekey: SITE_KEY,
          language: 'fr',
          theme: 'light',
          size: 'flexible',
          callback: (token) => callbackRef.current(token),
          'expired-callback': () => callbackRef.current(''),
          'error-callback': () => callbackRef.current(''),
        });
      })
      .catch(() => callbackRef.current(''));
    return () => {
      cancelled = true;
      if (widgetId !== null && window.turnstile) window.turnstile.remove(widgetId);
    };
  }, [resetKey]);

  if (!SITE_KEY) return null;
  return <div ref={containerRef} className="min-h-[65px]" />;
}

export const captchaRequired = Boolean(SITE_KEY);
