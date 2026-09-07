import { useEffect, useState } from 'react';
import { Link, useParams } from 'wouter';
import { ArrowLeft, Check, Clock, MapPin, Package, X } from 'lucide-react';
import { BuyerWorkspace } from '@/components/buyer-workspace';
import { useAuth } from '@/lib/auth-context';

const API = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000' : 'https://nzanila-api-server.nzanilaexpress.workers.dev');

export function BuyerOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { session } = useAuth();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [fulfillmentMethod, setFulfillmentMethod] = useState<'seller_delivery' | 'buyer_pickup'>('seller_delivery');
  const [deliveryAddress, setDeliveryAddress] = useState('');

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const response = await fetch(`${API}/api/orders/${id}`, { headers: { Authorization: `Bearer ${session?.accessToken || ''}` } });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Order not found');
      setOrder(payload);
      setFulfillmentMethod(payload.fulfillment_method === 'buyer_pickup' ? 'buyer_pickup' : 'seller_delivery');
      setDeliveryAddress(payload.destination && payload.destination !== 'Fulfillment not selected' ? payload.destination : '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load this order');
    } finally { setLoading(false); }
  };

  const saveFulfillment = async () => {
    if (!id || saving || (fulfillmentMethod === 'seller_delivery' && !deliveryAddress.trim())) return;
    setSaving(true); setError('');
    try {
      const response = await fetch(`${API}/api/orders/${id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.accessToken || ''}` }, body: JSON.stringify({ fulfillmentMethod, deliveryAddress: deliveryAddress.trim() }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Could not save fulfillment');
      setOrder(payload);
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not save fulfillment'); }
    finally { setSaving(false); }
  };

  useEffect(() => { load(); }, [id, session?.accessToken]);

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
    if (!id || saving || !window.confirm('Cancel this order?')) return;
    setSaving(true);
    try {
      const response = await fetch(`${API}/api/orders/${id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.accessToken || ''}` }, body: JSON.stringify({ status: 'cancelled' }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Could not cancel order');
      setOrder(payload);
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not cancel order'); }
    finally { setSaving(false); }
  };

  if (loading) return <BuyerWorkspace active="orders"><div className="mx-auto max-w-4xl px-4 py-16 text-center"><div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div></BuyerWorkspace>;
  if (!order || error) return <BuyerWorkspace active="orders"><div className="mx-auto max-w-4xl px-4 py-12"><Link href="/orders" className="inline-flex items-center gap-2 text-sm text-muted-foreground"><ArrowLeft size={16} /> Back to orders</Link><div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">{error || 'Order not found'}</div></div></BuyerWorkspace>;

  const pendingFulfillment = !order.fulfillment_method || order.fulfillment_method === 'pending';
  const pickup = order.fulfillment_method === 'buyer_pickup' || order.fulfillmentMethod === 'buyer_pickup';
  const status = String(order.status || 'processing');
  const shippingFee = Number(order.shipping_fee ?? order.shippingFee ?? 0);
  const subtotal = Math.max(0, Number(order.total || 0) - shippingFee);
  const canConfirm = status === 'shipped' || status === 'out_for_delivery' || (pickup && status === 'ready');
  const steps = pickup ? ['processing', 'ready', 'delivered'] : ['processing', 'shipped', 'delivered'];
  const currentStep = status === 'out_for_delivery' ? 1 : steps.indexOf(status);

  return <BuyerWorkspace active="orders">
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-10">
      <Link href="/orders" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft size={16} /> Back to orders</Link>
      <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Order #{String(order.id).padStart(5, '0')}</p><h1 className="mt-1 text-2xl font-bold text-foreground">Order details</h1><p className="mt-1 text-sm text-muted-foreground">{new Date(order.date).toLocaleString()}</p></div>
        <span className="rounded-full bg-primary/10 px-3 py-1.5 text-xs font-bold uppercase text-primary">{status.replaceAll('_', ' ')}</span>
      </div>

      <section className="mt-5 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3"><h2 className="text-base font-bold">Order progress</h2><span className="text-xs text-muted-foreground">{pickup ? 'Buyer pickup' : 'Seller delivery'}</span></div>
        <div className="mt-6 flex items-start">{steps.map((step: string, index: number) => <div key={step} className="flex flex-1 items-start last:flex-none"><div className="flex flex-col items-center"><div className={`grid h-8 w-8 place-items-center rounded-full ${currentStep >= index ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>{currentStep >= index ? <Check size={15} /> : <Clock size={15} />}</div><span className="mt-2 max-w-20 text-center text-[10px] font-semibold capitalize text-muted-foreground">{step.replaceAll('_', ' ')}</span></div>{index < steps.length - 1 && <div className={`mt-4 h-1 flex-1 ${currentStep > index ? 'bg-primary' : 'bg-secondary'}`} />}</div>)}</div>
        <div className="mt-6 flex flex-wrap gap-2">{canConfirm && <button onClick={confirmReceived} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50"><Check size={14} />{saving ? 'Saving…' : pickup ? 'Confirm pickup received' : 'Confirm delivery received'}</button>}{['processing', 'confirmed', 'preparing', 'ready'].includes(status) && <button onClick={cancelOrder} disabled={saving} className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-bold text-red-700 disabled:opacity-50"><X size={14} />{saving ? 'Saving…' : 'Cancel order'}</button>}</div>
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_300px]">
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm"><h2 className="text-base font-bold">Items</h2><div className="mt-4 divide-y divide-border">{(order.items || []).map((item: any) => <div key={item.id} className="flex items-center justify-between gap-4 py-3"><div className="flex min-w-0 items-center gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary"><Package size={17} className="text-muted-foreground" /></div><div className="min-w-0"><p className="truncate text-sm font-semibold">{item.productName}</p><p className="text-xs text-muted-foreground">Qty {item.quantity} · {Number(item.unitPrice).toLocaleString()} BIF each</p></div></div><p className="shrink-0 text-sm font-bold">{(Number(item.unitPrice) * Number(item.quantity)).toLocaleString()} BIF</p></div>)}</div></section>
        <div className="space-y-5"><section className="rounded-2xl border border-border bg-card p-5 shadow-sm"><div className="flex items-center gap-2"><MapPin size={17} className="text-primary" /><h2 className="text-base font-bold">Fulfillment</h2></div>{pendingFulfillment ? <><p className="mt-2 text-xs text-muted-foreground">Choose how you want to receive this order. You can update it while the order is still being prepared.</p><div className="mt-4 space-y-2"><label className={`flex cursor-pointer gap-3 rounded-xl border p-3 text-sm ${fulfillmentMethod === 'seller_delivery' ? 'border-primary bg-primary/5' : 'border-border'}`}><input type="radio" checked={fulfillmentMethod === 'seller_delivery'} onChange={() => setFulfillmentMethod('seller_delivery')} /> <span><strong>Seller delivery</strong><span className="mt-1 block text-xs text-muted-foreground">Provide your delivery address.</span></span></label><label className={`flex cursor-pointer gap-3 rounded-xl border p-3 text-sm ${fulfillmentMethod === 'buyer_pickup' ? 'border-primary bg-primary/5' : 'border-border'}`}><input type="radio" checked={fulfillmentMethod === 'buyer_pickup'} onChange={() => setFulfillmentMethod('buyer_pickup')} /> <span><strong>Store pickup</strong><span className="mt-1 block text-xs text-muted-foreground">Collect it from the seller.</span></span></label></div>{fulfillmentMethod === 'seller_delivery' && <input value={deliveryAddress} onChange={event => setDeliveryAddress(event.target.value)} placeholder="Delivery address" className="mt-3 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm" /> }<button type="button" onClick={() => void saveFulfillment()} disabled={saving || (fulfillmentMethod === 'seller_delivery' && !deliveryAddress.trim())} className="mt-4 w-full rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground disabled:opacity-50">{saving ? 'Saving…' : 'Save fulfillment choice'}</button></> : <><p className="mt-3 text-sm font-semibold">{pickup ? 'Pick up from the seller' : 'Seller delivery'}</p><p className="mt-1 text-xs text-muted-foreground">{order.destination}</p></>}<div className="mt-4 space-y-2 border-t border-border pt-3 text-sm"><div className="flex justify-between"><span>Subtotal</span><span>{subtotal.toLocaleString()} BIF</span></div><div className="flex justify-between"><span>Shipping fee</span><span>{shippingFee.toLocaleString()} BIF</span></div><div className="flex justify-between pt-2 text-base font-bold"><span>Total</span><strong>{Number(order.total).toLocaleString()} BIF</strong></div></div></section></div>
      </div>
    </div>
  </BuyerWorkspace>;
}
