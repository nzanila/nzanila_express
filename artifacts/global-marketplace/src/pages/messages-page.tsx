import { AppShell } from '@/components/marketplace-shell';
import { BuyerMessages } from '@/components/buyer-communications';
import { useLocale } from '@/lib/i18n/locale-context';

export function MessagesPage() {
  const { tr } = useLocale();
  return <AppShell hideSearch hideSidebar hideFooter>
    <div className="mx-auto max-w-7xl px-3 py-5 sm:px-6">
      <div className="mb-4"><h1 className="text-2xl font-bold text-gray-900">{tr('ui.messages')}</h1><p className="mt-1 text-sm text-gray-500">{tr('ui.yourSupplierConversationsAllInOne')}</p></div>
      <div className="buyer-messenger-frame overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"><BuyerMessages /></div>
    </div>
  </AppShell>;
}
