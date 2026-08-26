import { useEffect, useState } from 'react';

const STORAGE_KEY = 'mf_cookie_consent';

type ConsentValue = 'accepted' | 'rejected';

function getStoredConsent(): ConsentValue | null {
  try {
    return localStorage.getItem(STORAGE_KEY) as ConsentValue | null;
  } catch {
    // localStorage can throw in private browsing / disabled-storage contexts
    return null;
  }
}

function storeConsent(value: ConsentValue) {
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // Best-effort — if storage is unavailable we just re-prompt next visit
  }
}

/**
 * GDPR-friendly cookie/tracking consent banner. Controls whether the website
 * tracking script (apps/tracking) is allowed to set its visitor cookie —
 * see ENABLE_COOKIELESS_TRACKING in .env for the server-side default when
 * a visitor hasn't answered yet.
 */
export default function CookieConsent() {
  const [consent, setConsent] = useState<ConsentValue | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setConsent(getStoredConsent());
    setHydrated(true);
  }, []);

  const handleChoice = (value: ConsentValue) => {
    storeConsent(value);
    setConsent(value);
    window.dispatchEvent(new CustomEvent('mf:cookie-consent', { detail: value }));
  };

  if (!hydrated || consent !== null) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-gray-200 bg-white p-4 shadow-lg sm:p-6"
    >
      <div className="mx-auto flex max-w-4xl flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-gray-600">
          We use cookies to understand site usage and improve your experience. You can accept
          all cookies or continue with only the essential ones required for the site to function.
          See our{' '}
          <a href="/privacy" className="font-medium text-purple-600 hover:underline">
            Privacy Policy
          </a>{' '}
          for details.
        </p>
        <div className="flex shrink-0 gap-3">
          <button
            type="button"
            onClick={() => handleChoice('rejected')}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            Essential only
          </button>
          <button
            type="button"
            onClick={() => handleChoice('accepted')}
            className="rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:from-purple-700 hover:to-indigo-700"
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
}
