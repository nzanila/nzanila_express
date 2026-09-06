import { AppShell } from '@/components/marketplace-shell';
import { BuyerMessages } from '@/components/buyer-communications';

export function MessagesPage() {
  return <AppShell hideSearch hideSidebar hideFooter>
    <div className="mx-auto max-w-7xl px-3 py-5 sm:px-6">
      <div className="mb-4"><h1 className="text-2xl font-bold text-gray-900">Messages</h1><p className="mt-1 text-sm text-gray-500">Your supplier conversations, all in one place.</p></div>
      <div className="buyer-messenger-frame overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"><BuyerMessages /></div>
    </div>
  </AppShell>;
}
