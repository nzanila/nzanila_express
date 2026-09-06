import { type ReactNode } from 'react';
import { Link } from 'wouter';
import { ShoppingCart, ClipboardList, UserRound, ArrowLeft } from 'lucide-react';
import { AppShell } from '@/components/marketplace-shell';

export function BuyerWorkspace({ children, active }: { children: ReactNode; active: 'cart' | 'orders' | 'account' }) {
  return <AppShell hideSearch hideSidebar>
    <div className="mx-auto max-w-6xl px-4 pb-8 pt-5 sm:px-6 sm:pt-8">
      <div className="mb-5 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-gray-900">My Nzanila</p>
        <Link href="/products" className="inline-flex min-h-11 items-center gap-2 text-xs font-semibold text-gray-600 hover:text-primary"><ArrowLeft size={14} /> Continue shopping</Link>
      </div>
      <nav aria-label="Buyer workspace" className="mb-6 grid grid-cols-3 gap-1 rounded-2xl border border-border bg-white p-1.5">
        {([{ id: 'cart', href: '/cart', label: 'Cart', icon: ShoppingCart }, { id: 'orders', href: '/orders', label: 'Orders', icon: ClipboardList }, { id: 'account', href: '/buyer/profile', label: 'Account', icon: UserRound }] as const).map(({id, href, label, icon: Icon}) => <Link key={id} href={href} aria-current={active === id ? 'page' : undefined} className={`flex min-h-12 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-colors ${active === id ? 'bg-orange-50 text-orange-600' : 'text-gray-600 hover:bg-gray-50'}`}><Icon size={18} />{label}</Link>)}
      </nav>
      {children}
    </div>
  </AppShell>;
}
