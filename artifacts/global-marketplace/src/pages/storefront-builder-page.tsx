import { useEffect, useState } from 'react';
import { Redirect, useParams } from 'wouter';
import { StorefrontBuilder } from '@/components/storefront-builder';
import { useAuth } from '@/lib/auth-context';
import { useLocale } from '@/lib/i18n/locale-context';

const API = import.meta.env.VITE_API_URL || 'https://nzanila-api-server.nzanilaexpress.workers.dev';

// A storefront belongs to ONE store, so the builder is addressed by store id — the same
// key `/api/storefront/:storeId` and the public store page use.
export function StorefrontBuilderPage() {
  const params = useParams();
  const storeId = Number(params?.storeId);

  // No silent default. This used to fall back to id 1, so a bad link opened somebody
  // else's storefront in an editor that would happily save over it.
  if (!Number.isInteger(storeId) || storeId <= 0) return <Redirect to="/supplier/stores" />;

  return (
    <div className="h-screen">
      <StorefrontBuilder storeId={storeId} />
    </div>
  );
}

// The old /seller/:id/storefront route, kept so existing links and bookmarks still land
// somewhere sensible.
//
// It was fed a seller id by the profile page and a store id by the store list, and the
// builder treated both as a seller id — which is how a seller's second store could load
// and then overwrite the first one's design. The path says "seller", so resolve it as a
// seller id and hand the builder a real store id.
export function SellerStorefrontRedirect() {
  const { tr } = useLocale();
  const params = useParams();
  const sellerId = Number(params?.id);
  const { user } = useAuth();
  const token = user?.session?.accessToken;
  const [storeId, setStoreId] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!Number.isInteger(sellerId) || sellerId <= 0) { setFailed(true); return; }
    let cancelled = false;
    // The lookup is seller-authenticated, which is right: only the owner may edit.
    fetch(`${API}/api/stores/seller/${sellerId}`, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined)
      .then(response => (response.ok ? response.json() : Promise.reject(new Error('No store'))))
      .then(data => { if (!cancelled) setStoreId(Number(data?.store?.id) || null); })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [sellerId, token]);

  if (storeId) return <Redirect to={`/supplier/stores/${storeId}/storefront`} />;
  if (failed) return <Redirect to="/supplier/stores" />;
  return <div className="flex h-screen items-center justify-center text-sm text-gray-500">{tr('ui.openingYourStorefront')}</div>;
}
