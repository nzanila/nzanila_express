import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { API, authHeaders, BuyerNotifications } from '@/components/buyer-communications';
import { useLocale } from '@/lib/i18n/locale-context';

function useUnreadNotifications() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let cancelled = false;
    const load = async () => { try { const response = await fetch(`${API}/api/notifications`, { headers: authHeaders() }); const data = response.ok ? await response.json() : { notifications: [] }; const items = Array.isArray(data?.notifications) ? data.notifications : []; if (!cancelled) setCount(items.filter((item: any) => !item.readAt).length); } catch {} };
    void load();
    const timer = window.setInterval(() => void load(), 10000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, []);
  return count;
}

export function BuyerNotificationsModal() {
  const { tr } = useLocale();
  const unread = useUnreadNotifications();
  const [open, setOpen] = useState(false);
  return <Sheet open={open} onOpenChange={setOpen}>
    <SheetTrigger asChild><button type="button" title={tr('ui.notifications')} aria-label={tr('ui.openNotifications')} className="relative rounded-lg p-2.5 text-gray-700 hover:bg-gray-100"><Bell size={20} />{unread > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">{unread > 9 ? '9+' : unread}</span>}</button></SheetTrigger>
    <SheetContent side="right" className="buyer-notifications-dialog inset-y-3 right-3 flex h-[calc(100%-1.5rem)] w-[calc(100%-1.5rem)] flex-col overflow-hidden rounded-2xl bg-[#f8fafb] p-0 sm:max-w-[440px]">
      <div className="flex shrink-0 items-center border-b border-gray-100 px-5 py-4 pr-14">
        <SheetTitle className="text-base font-bold text-gray-900">{tr('ui.notifications')}</SheetTitle>
      </div>
      <SheetDescription className="sr-only">{tr('ui.orderDeliveryMessageAndAccountUpdates')}</SheetDescription>
      <div className="panel-embedded min-h-0 flex-1 overflow-y-auto"><BuyerNotifications onNavigate={() => setOpen(false)} /></div>
    </SheetContent>
  </Sheet>;
}
