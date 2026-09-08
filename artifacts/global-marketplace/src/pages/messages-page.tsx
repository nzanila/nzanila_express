import { AppShell } from '@/components/marketplace-shell';
import { BuyerMessages } from '@/components/buyer-communications';

/**
 * The messenger owns the viewport. No page heading, no card, no footer, no bottom nav:
 * the header stays, the conversation list and thread fill everything under it, and the
 * message history is the only scroller — so the composer never disappears under the
 * keyboard or the site footer.
 */
export function MessagesPage() {
  return <AppShell hideSearch hideSidebar hideFooter hideTopBar fullBleed chromeless>
    <div className="bc-messenger-page"><BuyerMessages /></div>
  </AppShell>;
}
