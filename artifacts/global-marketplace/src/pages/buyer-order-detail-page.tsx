import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'wouter';
import { ArrowLeft, Check, Clock, ExternalLink, MapPin, Package, Pencil, Store, Truck, X } from 'lucide-react';
import { BuyerWorkspace } from '@/components/buyer-workspace';
import { useAuth } from '@/lib/auth-context';
import { LocationSearchPicker, type LocationData } from '@/components/location-search-picker';
import { ConfirmDialog, type ConfirmSpec } from '@/components/confirm-dialog';
import { useLocale } from '@/lib/i18n/locale-context';

const API = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000' : 'https://nzanila-api-server.nzanilaexpress.workers.dev');

export function BuyerOrderDetailPage() {
  const { tr } = useLocale();
  const { id } = useParams<{ id: string }>();
  const { session, user } = useAuth();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [fulfillmentMethod, setFulfillmentMethod] = useState<'seller_delivery' | 'buyer_pickup'>('seller_delivery');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryLatitude, setDeliveryLatitude] = useState<number | undefined>();
  const [deliveryLongitude, setDeliveryLongitude] = useState<number | undefined>();
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmSpec | null>(null);
  const [showManualAddress, setShowManualAddress] = useState(false);

  // The buyer's saved/default delivery address (profile + any address saved from the profile page), offered as a one-tap choice.
  const savedAddress = useMemo(() => {
    let fromStorage: any = null;
    if (typeof window !== 'undefined' && user?.id) {
      try {
        const saved = JSON.parse(localStorage.getItem(`nzanila_buyer_addresses_${user.id}`) || '[]');
        fromStorage = Array.isArray(saved) ? (saved.find((item: any) => item?.isDefault) || saved[0]) : null;
      } catch { /* Fall back to the server profile when local storage is unavailable. */ }
    }
    const approximateAddress = fromStorage?.approximateAddress || user?.approximateAddress || [user?.zone, user?.city, user?.province].filter(Boolean).join(', ');
    const landmark = fromStorage?.landmark ?? user?.landmark;
    const directions = fromStorage?.detailedDirections ?? user?.directions;
    const text = [approximateAddress, landmark, directions].filter(Boolean).join(' · ');
    if (!text) return null;
    return {
      text,
      latitude: (fromStorage?.latitude ?? user?.latitude) || undefined,
      longitude: (fromStorage?.longitude ?? user?.longitude) || undefined,
    };
  }, [user]);

  const load = async (opts?: { silent?: boolean }) => {
    if (!id) return;
    if (!opts?.silent) setLoading(true);
    try {
      const response = await fetch(`${API}/api/orders/${id}`, { headers: { Authorization: `Bearer ${session?.accessToken || ''}` } });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Order not found');
      setOrder(payload);
      // Only seed the fulfillment form from the server on the initial load — a silent
      // background refresh must not clobber a choice the buyer is still editing.
      if (!opts?.silent) {
        setFulfillmentMethod(payload.fulfillment_method === 'buyer_pickup' ? 'buyer_pickup' : 'seller_delivery');
        setDeliveryAddress(payload.destination && payload.destination !== 'Fulfillment not selected' ? payload.destination : '');
        setDeliveryLatitude(typeof payload.delivery_latitude === 'number' ? payload.delivery_latitude : undefined);
        setDeliveryLongitude(typeof payload.delivery_longitude === 'number' ? payload.delivery_longitude : undefined);
      }
    } catch (err) {
      if (!opts?.silent) setError(err instanceof Error ? err.message : 'Could not load this order');
    } finally { if (!opts?.silent) setLoading(false); }
  };

  const saveFulfillment = async () => {
    if (!id || saving || (fulfillmentMethod === 'seller_delivery' && !deliveryAddress.trim())) return;
    setSaving(true); setError('');
    try {
      const response = await fetch(`${API}/api/orders/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.accessToken || ''}` },
        body: JSON.stringify({ fulfillmentMethod, deliveryAddress: deliveryAddress.trim(), deliveryLatitude, deliveryLongitude }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Could not save fulfillment');
      setOrder(payload);
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not save fulfillment'); }
    finally { setSaving(false); }
  };

  useEffect(() => {
    load();
    const timer = window.setInterval(() => load({ silent: true }), 10000);
    return () => window.clearInterval(timer);
  }, [id, session?.accessToken]);

  const useSavedAddress = () => {
    if (!savedAddress) return;
    setDeliveryAddress(savedAddress.text);
    setDeliveryLatitude(savedAddress.latitude);
    setDeliveryLongitude(savedAddress.longitude);
    setShowManualAddress(false);
  };

  const pickOnMap = (data: LocationData) => {
    const formatted = [data.approximateAddress || [data.zone, data.commune, data.province].filter(Boolean).join(', '), data.landmark, data.directions].filter(Boolean).join(' · ');
    setDeliveryAddress(formatted);
    setDeliveryLatitude(data.latitude);
    setDeliveryLongitude(data.longitude);
    setShowLocationPicker(false);
  };

  const confirmReceived = async () => {
    if (!id) return;
    setSaving(true);
    try {
      const response = await fetch(`${API}/api/orders/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.accessToken || ''}` },
        body: JSON.stringify({ status: 'delivered' }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Could not confirm receipt');
      setOrder(payload);
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not confirm receipt'); }
    finally { setSaving(false); }
  };

  const cancelOrder = async () => {
    if (!id || saving) return;
    setSaving(true);
    try {
      const response = await fetch(`${API}/api/orders/${id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.accessToken || ''}` }, body: JSON.stringify({ status: 'cancelled' }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Could not cancel order');
      setOrder(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not cancel order');
      throw err;
    }
    finally { setSaving(false); }
  };

  const askCancelOrder = () => setConfirm({
    title: 'Cancel this order?',
    description: 'The seller is told straight away. This cannot be undone.',
    confirmLabel: 'Cancel order',
    tone: 'danger',
    onConfirm: cancelOrder,
  });

  if (loading) return <BuyerWorkspace active="orders"><div className="mx-auto max-w-4xl px-4 py-16 text-center"><div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div></BuyerWorkspace>;
  if (!order || error) return <BuyerWorkspace active="orders"><div className="mx-auto max-w-4xl px-4 py-12"><Link href="/orders" className="inline-flex items-center gap-2 text-sm text-muted-foreground"><ArrowLeft size={16} /> {tr('ui.backToOrders')}</Link><div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">{error || 'Order not found'}</div></div></BuyerWorkspace>;

  const pendingFulfillment = !order.fulfillment_method || order.fulfillment_method === 'pending';
  const pickup = order.fulfillment_method === 'buyer_pickup' || order.fulfillmentMethod === 'buyer_pickup';
  const status = String(order.status || 'processing');
  const shippingFee = Number(order.shipping_fee ?? order.shippingFee ?? 0);
  const subtotal = Math.max(0, Number(order.total || 0) - shippingFee);
  // Once the seller has done their part the buyer can close the order out. 'ready' counts
  // for delivery orders too, not just pickup: the buyer can change the fulfillment method
  // after the seller marked the order ready, and gating 'ready' on `pickup` stranded those
  // orders — no confirm button here, and the status no longer matching the seller's
  // delivery flow either, so the order stayed "in progress" for good.
  const canConfirm = ['ready', 'out_for_delivery', 'shipped'].includes(status);
  const steps = pickup ? ['processing', 'ready', 'delivered'] : ['processing', 'shipped', 'delivered'];
  const currentStep = status === 'out_for_delivery' ? 1 : steps.indexOf(status);
  const savedAddressSelected = Boolean(savedAddress && deliveryAddress.trim() === savedAddress.text.trim());

  return <BuyerWorkspace active="orders">
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-10">
      <Link href="/orders" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft size={16} /> {tr('ui.backToOrders')}</Link>
      <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Order #{String(order.id).padStart(5, '0')}</p><h1 className="mt-1 text-2xl font-bold text-foreground">{tr('ui.orderDetails2')}</h1><p className="mt-1 text-sm text-muted-foreground">{new Date(order.date).toLocaleString()}</p></div>
        <span className="rounded-full bg-primary/10 px-3 py-1.5 text-xs font-bold uppercase text-primary">{status.replaceAll('_', ' ')}</span>
      </div>

      <section className="mt-5 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3"><h2 className="text-base font-bold">{tr('ui.orderProgress')}</h2><span className="text-xs text-muted-foreground">{pickup ? 'Buyer pickup' : 'Seller delivery'}</span></div>
        <div className="mt-6 flex items-start">{steps.map((step: string, index: number) => <div key={step} className="flex flex-1 items-start last:flex-none"><div className="flex flex-col items-center"><div className={`grid h-8 w-8 place-items-center rounded-full ${currentStep >= index ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>{currentStep >= index ? <Check size={15} /> : <Clock size={15} />}</div><span className="mt-2 max-w-20 text-center text-[10px] font-semibold capitalize text-muted-foreground">{step.replaceAll('_', ' ')}</span></div>{index < steps.length - 1 && <div className={`mt-4 h-1 flex-1 ${currentStep > index ? 'bg-primary' : 'bg-secondary'}`} />}</div>)}</div>
        <div className="mt-6 flex flex-wrap gap-2">{canConfirm && <button onClick={confirmReceived} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50"><Check size={14} />{saving ? 'Saving…' : pickup ? 'Confirm pickup received' : 'Confirm delivery received'}</button>}{['processing', 'confirmed', 'preparing', 'ready'].includes(status) && <button onClick={askCancelOrder} disabled={saving} className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-bold text-red-700 disabled:opacity-50"><X size={14} />{saving ? 'Saving…' : 'Cancel order'}</button>}</div>
      </section>

      {pendingFulfillment && (
        <section className="mt-5 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-2"><MapPin size={19} className="text-primary" /><h2 className="text-lg font-bold">{tr('ui.chooseFulfillment')}</h2></div>
          <p className="mt-2 text-sm text-muted-foreground">Choose how you want to receive this order. You can update it while it's still being prepared.</p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <label className={`flex cursor-pointer items-start gap-3 rounded-2xl border-2 p-4 transition-colors ${fulfillmentMethod === 'seller_delivery' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}>
              <input type="radio" className="mt-1" checked={fulfillmentMethod === 'seller_delivery'} onChange={() => setFulfillmentMethod('seller_delivery')} />
              <span className="flex items-start gap-3">
                <Truck size={20} className="mt-0.5 text-primary" />
                <span><strong className="text-sm">{tr('ui.sellerDelivery')}</strong><span className="mt-1 block text-xs text-muted-foreground">{tr('ui.chooseYourDeliveryLocationOnThe')}</span></span>
              </span>
            </label>
            <label className={`flex cursor-pointer items-start gap-3 rounded-2xl border-2 p-4 transition-colors ${fulfillmentMethod === 'buyer_pickup' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}>
              <input type="radio" className="mt-1" checked={fulfillmentMethod === 'buyer_pickup'} onChange={() => setFulfillmentMethod('buyer_pickup')} />
              <span className="flex items-start gap-3">
                <Store size={20} className="mt-0.5 text-primary" />
                <span><strong className="text-sm">{tr('ui.storePickup')}</strong><span className="mt-1 block text-xs text-muted-foreground">{tr('ui.collectItFromTheSeller')}</span></span>
              </span>
            </label>
          </div>

          {fulfillmentMethod === 'seller_delivery' && (
            <div className="mt-5 space-y-3">
              <p className="text-sm font-bold text-foreground">{tr('ui.deliveryLocation2')}</p>

              {deliveryAddress.trim() ? (
                <div className="flex items-start gap-3 rounded-2xl border-2 border-primary/30 bg-primary/5 p-4">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground"><MapPin size={18} /></div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-foreground">{savedAddressSelected ? 'Saved address' : 'Selected location'}</p>
                    <p className="mt-0.5 break-words text-sm text-muted-foreground">{deliveryAddress}</p>
                    {deliveryLatitude != null && deliveryLongitude != null && (
                      <a href={`https://www.google.com/maps?q=${deliveryLatitude},${deliveryLongitude}`} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">
                        View on Google Maps <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                  <button type="button" onClick={() => setDeliveryAddress('')} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold text-foreground hover:bg-secondary">
                    <Pencil size={13} /> Change
                  </button>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {savedAddress && (
                    <button type="button" onClick={useSavedAddress} className="flex items-start gap-3 rounded-2xl border-2 border-dashed border-border p-4 text-left hover:border-primary/50 hover:bg-primary/5">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-secondary"><MapPin size={18} className="text-muted-foreground" /></div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-foreground">{tr('ui.useMySavedAddress')}</p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">{savedAddress.text}</p>
                      </div>
                    </button>
                  )}
                  <button type="button" onClick={() => setShowLocationPicker(true)} className="flex items-start gap-3 rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 p-4 text-left hover:border-primary hover:bg-primary/10">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground"><MapPin size={18} /></div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-foreground">{tr('ui.chooseLocationOnMap')}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{tr('ui.searchOrDropAPinFor')}</p>
                    </div>
                  </button>
                </div>
              )}

              {!deliveryAddress.trim() && (
                showManualAddress ? (
                  <input autoFocus value={deliveryAddress} onChange={event => setDeliveryAddress(event.target.value)} placeholder={tr('ui.typeYourDeliveryAddress')} className="h-12 w-full rounded-xl border border-border bg-background px-4 text-sm" />
                ) : (
                  <button type="button" onClick={() => setShowManualAddress(true)} className="text-xs font-semibold text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
                    Or type an address manually
                  </button>
                )
              )}
            </div>
          )}

          <button type="button" onClick={() => void saveFulfillment()} disabled={saving || (fulfillmentMethod === 'seller_delivery' && !deliveryAddress.trim())} className="mt-5 w-full rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground disabled:opacity-50 sm:w-auto sm:px-8">
            {saving ? 'Saving…' : 'Save fulfillment choice'}
          </button>
          {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
        </section>
      )}

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_320px]">
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm"><h2 className="text-base font-bold">{tr('ui.items')}</h2><div className="mt-4 divide-y divide-border">{(order.items || []).map((item: any) => <div key={item.id} className="flex items-center justify-between gap-4 py-3"><div className="flex min-w-0 items-center gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary"><Package size={17} className="text-muted-foreground" /></div><div className="min-w-0"><p className="truncate text-sm font-semibold">{item.productName}</p><p className="text-xs text-muted-foreground">Qty {item.quantity} · {Number(item.unitPrice).toLocaleString()} BIF each</p></div></div><p className="shrink-0 text-sm font-bold">{(Number(item.unitPrice) * Number(item.quantity)).toLocaleString()} BIF</p></div>)}</div></section>
        <div className="space-y-5">
          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-2"><MapPin size={17} className="text-primary" /><h2 className="text-base font-bold">{tr('ui.fulfillment')}</h2></div>
            {pendingFulfillment ? (
              <p className="mt-3 text-xs text-muted-foreground">{tr('ui.chooseYourFulfillmentOptionAbove')}</p>
            ) : (
              <div className="mt-3">
                <p className="text-sm font-semibold">{pickup ? 'Pick up from the seller' : 'Seller delivery'}</p>
                <p className="mt-1 break-words text-xs text-muted-foreground">{order.destination}</p>
                {!pickup && order.delivery_latitude != null && order.delivery_longitude != null && (
                  <a href={`https://www.google.com/maps?q=${order.delivery_latitude},${order.delivery_longitude}`} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">
                    View on Google Maps <ExternalLink size={12} />
                  </a>
                )}
              </div>
            )}
            <div className="mt-4 space-y-2 border-t border-border pt-3 text-sm">
              <div className="flex justify-between"><span>{tr('ui.subtotal')}</span><span>{subtotal.toLocaleString()} BIF</span></div>
              <div className="flex justify-between"><span>{tr('ui.shippingFee')}</span><span>{shippingFee.toLocaleString()} BIF</span></div>
              <div className="flex justify-between pt-2 text-base font-bold"><span>{tr('ui.total')}</span><strong>{Number(order.total).toLocaleString()} BIF</strong></div>
            </div>
          </section>
        </div>
      </div>
    </div>

    {showLocationPicker && <LocationSearchPicker
      mode="buyer"
      initialLat={deliveryLatitude || savedAddress?.latitude || user?.latitude || -3.3731}
      initialLng={deliveryLongitude || savedAddress?.longitude || user?.longitude || 29.3644}
      onCancel={() => setShowLocationPicker(false)}
      onConfirm={pickOnMap}
    />}

    <ConfirmDialog spec={confirm} onClose={() => setConfirm(null)} />
  </BuyerWorkspace>;
}
