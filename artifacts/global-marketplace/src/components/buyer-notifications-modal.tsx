import { Bell } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { BuyerNotifications } from '@/components/buyer-communications';

export function BuyerNotificationsModal() {
  return <Sheet>
    <SheetTrigger asChild><button type="button" title="Notifications" aria-label="Open notifications" className="rounded-lg p-2.5 text-gray-700 hover:bg-gray-100"><Bell size={20} /></button></SheetTrigger>
    <SheetContent side="right" className="buyer-notifications-dialog w-full overflow-y-auto bg-[#f8fafb] p-0 pt-8 sm:max-w-[440px]">
      <SheetTitle className="sr-only">Notifications</SheetTitle>
      <SheetDescription className="sr-only">Order, delivery, message, and account updates.</SheetDescription>
      <BuyerNotifications />
    </SheetContent>
  </Sheet>;
}
