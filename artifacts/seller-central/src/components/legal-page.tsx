import { ChevronLeft } from 'lucide-react';
import { Link } from 'wouter';
import { useLocale } from '../lib/i18n/locale-context';

const TOS_SECTIONS = ['intro', 'eligibility', 'marketplaceRole', 'sellerResponsibility', 'buyerResponsibility', 'prohibited', 'changes'];
const PRIVACY_SECTIONS = ['collect', 'use', 'sharing', 'rights', 'contact'];

/** Terms of Service + Privacy Policy. One page, two sections, linked from the signup form. */
export function LegalPage() {
  const { tr } = useLocale();

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Link href="/seller-central" className="mb-6 inline-flex items-center gap-1 text-sm font-semibold text-gray-600 hover:text-gray-900">
          <ChevronLeft size={16} /> {tr('legal.backToApp')}
        </Link>

        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">{tr('legal.pageTitle')}</h1>
        <p className="mt-1 text-xs text-gray-500">{tr('legal.lastUpdated')}: 2026-09-08</p>

        <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-8">
          <h2 className="text-xl font-bold text-gray-900">{tr('legal.tos.heading')}</h2>
          <div className="mt-5 space-y-5">
            {TOS_SECTIONS.map(id => (
              <div key={id}>
                <h3 className="text-sm font-bold text-gray-900">{tr(`legal.tos.${id}.title`)}</h3>
                <p className="mt-1.5 text-sm leading-6 text-gray-600">{tr(`legal.tos.${id}.body`)}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-8">
          <h2 className="text-xl font-bold text-gray-900">{tr('legal.privacy.heading')}</h2>
          <div className="mt-5 space-y-5">
            {PRIVACY_SECTIONS.map(id => (
              <div key={id}>
                <h3 className="text-sm font-bold text-gray-900">{tr(`legal.privacy.${id}.title`)}</h3>
                <p className="mt-1.5 text-sm leading-6 text-gray-600">{tr(`legal.privacy.${id}.body`)}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
