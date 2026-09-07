import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { MessageSquare } from 'lucide-react';
import { API, authHeaders } from '@/components/buyer-communications';
import { useLocale } from '@/lib/i18n/locale-context';

function useUnreadMessages() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let cancelled = false;
    const load = async () => { try { const response = await fetch(`${API}/api/conversations`, { headers: authHeaders() }); const data = response.ok ? await response.json() : []; const items = Array.isArray(data) ? data : []; if (!cancelled) setCount(items.reduce((sum: number, item: any) => sum + Number(item.unreadCount || 0), 0)); } catch {} };
    void load();
    const timer = window.setInterval(() => void load(), 10000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, []);
  return count;
}

export function BuyerMessagesLink() {
  const { tr } = useLocale();
  const unread = useUnreadMessages();
  return <Link href="/messages" title={tr('ui.messages')} aria-label={tr('ui.messages')} className="relative hidden rounded-lg p-2.5 text-gray-700 hover:bg-gray-100 sm:flex">
    <MessageSquare size={19} className="text-gray-700" />
    {unread > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">{unread > 9 ? '9+' : unread}</span>}
  </Link>;
}
