import { useEffect, useState } from 'react';
import { Star, Loader2 } from 'lucide-react';
import { useLocale } from '@/lib/i18n/locale-context';
import { useAuth } from '@/lib/auth-context';

const API_BASE = (import.meta as any).env?.VITE_API_URL || 'https://nzanila-api-server.nzanilaexpress.workers.dev';

type Review = {
  id: number;
  rating: number;
  body: string;
  authorName: string;
  authorAvatar: string;
  createdAt: string;
};

function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} / 5`}>
      {[1, 2, 3, 4, 5].map(n => (
        <Star
          key={n}
          size={size}
          className={n <= Math.round(value) ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}
        />
      ))}
    </span>
  );
}

/**
 * Buyer reviews for one product.
 *
 * Writing is gated server-side on a delivered order containing this product, so the form is
 * only worth showing to a signed-in buyer, and a 403 back from the API is an expected answer
 * ("you have not received this yet") rather than an error to shout about.
 */
export function ProductReviews({ productId }: { productId: number }) {
  const { tr } = useLocale();
  const { isAuthenticated } = useAuth();
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [average, setAverage] = useState(0);
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');

  const load = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/products/${productId}/reviews`);
      if (!response.ok) throw new Error(String(response.status));
      const data = await response.json() as { reviews: Review[]; average: number };
      setReviews(Array.isArray(data.reviews) ? data.reviews : []);
      setAverage(Number(data.average) || 0);
    } catch {
      setReviews([]);
    }
  };

  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [productId]);

  const submit = async () => {
    if (!rating) { setNotice(tr('reviews.pickRating')); return; }
    setSaving(true); setNotice('');
    try {
      // Same shape App.tsx's setAuthTokenGetter reads. Reading the wrong field sends an
      // empty Bearer, which the API answers with 401 and the app treats as an expired
      // session — signing the buyer out mid-review.
      let accessToken = '';
      try {
        const stored = localStorage.getItem('nz_auth');
        if (stored) accessToken = JSON.parse(stored)?.session?.accessToken || '';
      } catch {}
      const response = await fetch(`${API_BASE}/api/products/${productId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ rating, body }),
      });
      if (response.status === 403) { setNotice(tr('reviews.mustPurchase')); return; }
      if (response.status === 401) { setNotice(tr('reviews.signInFirst')); return; }
      if (!response.ok) { setNotice(tr('reviews.saveFailed')); return; }
      setBody(''); setRating(0); setNotice(tr('reviews.thanks'));
      await load();
    } catch {
      setNotice(tr('reviews.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mt-8 border-t border-border pt-6">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-bold text-foreground">{tr('reviews.heading')}</h2>
        {reviews && reviews.length > 0 && (
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <Stars value={average} /> {average.toFixed(1)} · {reviews.length}
          </span>
        )}
      </div>

      {reviews === null ? (
        <p className="text-sm text-muted-foreground">{tr('reviews.loading')}</p>
      ) : reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground">{tr('reviews.none')}</p>
      ) : (
        <ul className="space-y-4">
          {reviews.map(review => (
            <li key={review.id} className="rounded-lg border border-border p-4">
              <div className="flex items-center gap-2">
                <Stars value={review.rating} size={12} />
                <span className="text-sm font-semibold text-foreground">{review.authorName}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(review.createdAt).toLocaleDateString()}
                </span>
              </div>
              {review.body && <p className="mt-2 text-sm leading-6 text-muted-foreground">{review.body}</p>}
            </li>
          ))}
        </ul>
      )}

      {isAuthenticated && (
        <div className="mt-6 rounded-lg border border-border p-4">
          <p className="text-sm font-semibold text-foreground">{tr('reviews.writeHeading')}</p>
          <p className="mt-1 text-xs text-muted-foreground">{tr('reviews.verifiedOnly')}</p>
          <div className="mt-3 flex items-center gap-1">
            {[1, 2, 3, 4, 5].map(n => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                aria-label={`${n} / 5`}
                className="p-0.5"
              >
                <Star size={20} className={n <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300 hover:text-amber-300'} />
              </button>
            ))}
          </div>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            maxLength={2000}
            rows={3}
            placeholder={tr('reviews.placeholder')}
            className="mt-3 w-full rounded-lg border border-border p-3 text-sm outline-none focus:border-primary"
          />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void submit()}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {tr('reviews.submit')}
            </button>
            {notice && <span className="text-xs text-muted-foreground">{notice}</span>}
          </div>
        </div>
      )}
    </section>
  );
}
