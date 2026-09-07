import { useState, useEffect } from 'react';
import { useParams, Link } from 'wouter';
import { 
  ArrowLeft, 
  Phone, 
  MessageSquare, 
  MapPin, 
  Package, 
  Check, 
  X, 
  Clock,
  AlertTriangle,
  Truck,
  ShoppingBag,
  ExternalLink
} from 'lucide-react';
import { SellerWorkspace } from '@/components/seller-workspace';
import { useAuth } from '@/lib/auth-context';
import { formatPhone } from '@/lib/phone';
import { useLocale } from '@/lib/i18n/locale-context';

const API = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000' : 'https://nzanila-api-server.nzanilaexpress.workers.dev');

interface OrderDetail {
  id: number;
  orderNumber: string;
  buyerName: string;
  buyerPhone?: string;
  buyerEmail?: string;
  status: 'new' | 'confirmed' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled' | 'disputed';
  total: number;
  deliveryMethod?: 'seller_delivery' | 'buyer_pickup' | 'pending';
  deliveryLocation?: string;
  pickupPoint?: string;
  landmark?: string;
  buyerDirections?: string;
  deliveryPhoto?: string;
  exactLocation?: {
    latitude: number;
    longitude: number;
  };
  createdAt: string;
  items: OrderItem[];
}

interface OrderItem {
  id: number;
  productName: string;
  quantity: number;
  price: number;
  unit: string;
}

export function SellerOrderDetailPage() {
  const { tr } = useLocale();
  const { id } = useParams<{ id: string }>();
  const { session } = useAuth();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showExactLocation, setShowExactLocation] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`${API}/api/orders/${id}`, {
      headers: { 'Authorization': `Bearer ${session?.accessToken || ''}` },
    })
      .then(r => r.json())
      .then(data => {
        setOrder({
          ...data,
          orderNumber: data.orderNumber || data.id,
          createdAt: data.createdAt || data.date,
          deliveryMethod: data.deliveryMethod || data.fulfillment_method || data.fulfillmentMethod,
          deliveryLocation: data.deliveryLocation || data.destination,
          items: (data.items || []).map((item: any) => ({ ...item, price: item.price ?? item.unitPrice, unit: item.unit || 'unit' })),
        });
        setLoading(false);
      })
      .catch(() => { setError('Failed to load order'); setLoading(false); });
  }, [id, session]);

  const updateStatus = async (newStatus: string) => {
    try {
      await fetch(`${API}/api/supplier/orders/${id}/status`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.accessToken || ''}` 
        },
        body: JSON.stringify({ status: newStatus }),
      });
      setOrder(prev => prev ? { ...prev, status: newStatus as any } : null);
    } catch (err) {
      setError('Failed to update order status');
    }
  };

  if (loading) {
    return (
      <SellerWorkspace title={tr('ui.orderDetails')}>
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </SellerWorkspace>
    );
  }

  if (error || !order) {
    return (
      <SellerWorkspace title={tr('ui.orderDetails')}>
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <AlertTriangle className="mx-auto text-red-600 mb-2" size={24} />
          <p className="text-red-800">{error || 'Order not found'}</p>
          <Link href="/supplier/orders" className="mt-4 inline-block text-sm text-red-600 hover:underline">
            Back to orders
          </Link>
        </div>
      </SellerWorkspace>
    );
  }

  const statusColors = {
    new: 'bg-blue-100 text-blue-700',
    confirmed: 'bg-emerald-100 text-emerald-700',
    preparing: 'bg-yellow-100 text-yellow-700',
    ready: 'bg-purple-100 text-purple-700',
    out_for_delivery: 'bg-orange-100 text-orange-700',
    delivered: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
    disputed: 'bg-red-100 text-red-700',
  };

  const canShowExactLocation = order.status !== 'new' && order.status !== 'cancelled';
  const shippingFee = Number((order as any).shipping_fee ?? (order as any).shippingFee ?? 0);
  const subtotal = Math.max(0, Number(order.total || 0) - shippingFee);
  const mapTarget = order.exactLocation ? `${order.exactLocation.latitude},${order.exactLocation.longitude}` : (order as any).delivery_latitude && (order as any).delivery_longitude ? `${(order as any).delivery_latitude},${(order as any).delivery_longitude}` : order.deliveryLocation || '';
  const googleMapsUrl = mapTarget ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapTarget)}` : '';

  return (
    <SellerWorkspace title={`Order #${order.orderNumber}`}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Back Button */}
        <Link href="/supplier/orders" className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900">
          <ArrowLeft size={16} /> Back to orders
        </Link>

        {/* Status Banner */}
        <div className={`rounded-xl px-4 py-3 ${statusColors[order.status]}`}>
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold uppercase">{order.status.replace('_', ' ')}</span>
            <span className="text-xs">{new Date(order.createdAt).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Buyer Information */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-bold text-gray-900 mb-4">BUYER</h2>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-lg font-bold text-gray-900">{order.buyerName}</p>
              {order.buyerPhone && (
                <a href={`tel:${order.buyerPhone}`} className="mt-2 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
                  <Phone size={14} /> {formatPhone(order.buyerPhone)}
                </a>
              )}
            </div>
            <div className="flex gap-2">
              {order.buyerPhone && (
                <a href={`tel:${order.buyerPhone}`} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50">
                  <Phone size={14} /> Call buyer
                </a>
              )}
              <Link href="/messages" className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50">
                <MessageSquare size={14} /> Message buyer
              </Link>
            </div>
          </div>
        </div>

        {/* Order Summary */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-bold text-gray-900 mb-4">ORDER SUMMARY</h2>
          <div className="space-y-3">
            {order.items.map(item => (
              <div key={item.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                    <Package size={18} className="text-gray-500" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{item.productName}</p>
                    <p className="text-xs text-gray-500">{item.quantity} × {item.price.toLocaleString()} BIF/{item.unit}</p>
                  </div>
                </div>
                <p className="font-bold text-gray-900">{(item.quantity * item.price).toLocaleString()} BIF</p>
              </div>
            ))}
          </div>
          
          <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">{tr('ui.subtotal')}</span>
              <span className="font-medium">{subtotal.toLocaleString()} BIF</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">{tr('ui.shippingFee')}</span>
              <span className="font-medium">{shippingFee.toLocaleString()} BIF</span>
            </div>
            <div className="flex justify-between text-lg font-bold">
              <span>{tr('ui.total')}</span>
              <span>{order.total.toLocaleString()} BIF</span>
            </div>
          </div>
        </div>

        {/* Delivery Information */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-bold text-gray-900 mb-4">DELIVERY</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium text-gray-700">{tr('ui.method')}</span>
              <span className="text-gray-900">
                {order.deliveryMethod === 'seller_delivery' ? 'Seller delivery' : order.deliveryMethod === 'buyer_pickup' ? 'Buyer pickup' : 'Waiting for buyer choice'}
              </span>
            </div>
            
            {order.deliveryMethod === 'pending' ? <p className="rounded-lg bg-blue-50 p-3 text-xs text-blue-800">{tr('ui.theBuyerWillChooseDeliveryOr')}</p> : order.deliveryMethod === 'seller_delivery' ? (
              <>
                <div className="flex items-start gap-2 text-sm">
                  <MapPin size={16} className="text-gray-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">{order.deliveryLocation}</p>
                    {order.landmark && <p className="text-gray-600">Near {order.landmark}</p>}
                    {googleMapsUrl && <a href={googleMapsUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#ff6a00] px-3 py-2 text-xs font-bold text-white hover:bg-orange-600"><MapPin size={14} /> {tr('ui.openInGoogleMaps')} <ExternalLink size={13} /></a>}
                  </div>
                </div>
                
                {canShowExactLocation && order.exactLocation && (
                  <button
                    onClick={() => setShowExactLocation(!showExactLocation)}
                    className="flex items-center gap-2 text-sm text-[#ff6a00] hover:underline"
                  >
                    <MapPin size={14} />
                    {showExactLocation ? 'Hide exact location' : 'Show exact location'}
                  </button>
                )}
                
                {showExactLocation && canShowExactLocation && order.exactLocation && (
                  <div className="rounded-lg bg-gray-50 p-3 text-sm">
                    <p className="font-mono text-xs text-gray-600">
                      Coordinates: {order.exactLocation.latitude.toFixed(6)}, {order.exactLocation.longitude.toFixed(6)}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-start gap-2 text-sm">
                <ShoppingBag size={16} className="text-gray-500 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">{tr('ui.pickupPointSelected')}</p>
                  <p className="text-gray-600">{order.pickupPoint}</p>
                </div>
              </div>
            )}
            
                {order.buyerDirections && (
              <div className="mt-3 rounded-lg bg-blue-50 p-3 text-sm">
                <p className="font-medium text-blue-900 mb-1">{tr('ui.buyerDirections')}</p>
                <p className="text-blue-800">{order.buyerDirections}</p>
              </div>
                )}
                {order.deliveryPhoto && (
                  <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <p className="mb-2 text-xs font-bold text-gray-700">{tr('ui.buyerLocationPhoto')}</p>
                    <img src={order.deliveryPhoto} alt={tr('ui.buyerDeliveryLocation')} className="max-h-56 w-full rounded-lg object-cover" />
                    <p className="mt-2 text-[11px] text-gray-500">{tr('ui.useThisPhotoToConfirmThe')}</p>
                  </div>
                )}
          </div>
        </div>

        {/* Order Actions */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-bold text-gray-900 mb-4">ORDER ACTIONS</h2>
          <div className="flex flex-wrap gap-3">
            {order.status === 'new' && (
              <>
                <button
                  onClick={() => updateStatus('confirmed')}
                  className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-700"
                >
                  <Check size={14} /> Accept order
                </button>
                <button
                  onClick={() => updateStatus('cancelled')}
                  className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-bold text-red-700 hover:bg-red-100"
                >
                  <X size={14} /> Reject order
                </button>
              </>
            )}
            
            {order.status === 'confirmed' && (
              <button
                onClick={() => updateStatus('preparing')}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-bold text-white hover:bg-primary/90"
              >
                <Package size={14} /> Mark preparing
              </button>
            )}
            
            {order.status === 'preparing' && (
              <button
                onClick={() => updateStatus('ready')}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-bold text-white hover:bg-primary/90"
              >
                <Check size={14} /> Mark ready
              </button>
            )}
            
            {order.status === 'ready' && order.deliveryMethod !== 'buyer_pickup' && (
              <button
                onClick={() => updateStatus('out_for_delivery')}
                className="flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-orange-700"
              >
                <Truck size={14} /> Mark out for delivery
              </button>
            )}
            
            {order.status === 'ready' && order.deliveryMethod === 'buyer_pickup' && (
              <button
                onClick={() => updateStatus('delivered')}
                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-700"
              >
                <Check size={14} /> Confirm pickup handed over
              </button>
            )}

            {order.status === 'out_for_delivery' && (
              <button
                onClick={() => updateStatus('delivered')}
                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-700"
              >
                <Check size={14} /> Mark delivered
              </button>
            )}
            
            {(order.status !== 'new' && order.status !== 'cancelled') && (
              <button
                onClick={() => updateStatus('disputed')}
                className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-bold text-red-700 hover:bg-red-100"
              >
                <AlertTriangle size={14} /> Report a problem
              </button>
            )}
          </div>
        </div>
      </div>
    </SellerWorkspace>
  );
}
