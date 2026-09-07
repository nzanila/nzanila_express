import { Link } from 'wouter';
import { ClipboardList } from 'lucide-react';
import { useListOrders } from '@workspace/api-client-react';
import { useLocale } from '@/lib/i18n/locale-context';

/** Orders icon with a badge for orders still in flight (not delivered or cancelled). */
export function BuyerOrdersLink({ href }: { href: string }) {
  const { tr } = useLocale();
  const { data: orders } = useListOrders({ query: { refetchInterval: 30000 } });
  const active = (orders || []).filter(order => !['delivered', 'cancelled'].includes(order.status)).length;
  return <Link href={href} title={tr('ui.orders')} aria-label={active > 0 ? `Orders, ${active} in progress` : 'Orders'} className="relative flex rounded-lg p-2.5 text-gray-700 hover:bg-gray-100">
    <ClipboardList size={19} className="text-gray-700" />
    {active > 0 && <span className="absolute -right-0.5 -top-0.5 grid min-w-[16px] place-items-center rounded-full bg-[#ff6a00] px-1 text-[10px] font-bold text-white">{active > 9 ? '9+' : active}</span>}
  </Link>;
}
