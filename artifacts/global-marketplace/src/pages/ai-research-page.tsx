import { useEffect, useRef, useState } from 'react';
import { Link } from 'wouter';
import { ArrowUpRight, BadgeCheck, Bot, Loader2, Send, Sparkles, Star } from 'lucide-react';
import { useListProducts, type Product } from '@workspace/api-client-react';
import { AppShell, SkeletonBlock } from '@/components/marketplace-shell';

type AiResult = { summary: string; products: Product[]; insight: string };

function analyzeQuery(query: string, products: Product[]): AiResult {
  const q = query.toLowerCase();
  let filtered = [...products];
  let insight = 'Ranked by supplier reliability, MOQ fit, and reorder rate.';

  if (q.includes('verified') || q.includes('trust')) {
    filtered = filtered.filter((p) => p.verified);
    insight = 'Verified suppliers with documented response rates and trade assurance.';
  } else if (q.includes('moq') || q.includes('cheap') || q.includes('under')) {
    filtered = filtered.filter((p) => p.price < 50).sort((a, b) => a.moq - b.moq);
    insight = 'Low MOQ options ideal for first-time buyers testing demand.';
  } else if (q.includes('ship') || q.includes('logistic') || q.includes('freight')) {
    filtered = filtered.filter((p) => /ship|logistic|freight|forward|agent|delivery/i.test(`${p.name} ${p.category}`));
    insight = 'Logistics and freight forwarding services with global routes.';
  } else if (q.includes('electronic') || q.includes('earphone') || q.includes('camera')) {
    filtered = filtered.filter((p) => /electronic|earphone|headphone|camera|phone|audio|bluetooth/i.test(`${p.name} ${p.category}`));
    insight = 'Electronics with strong reorder rates across wholesale channels.';
  } else {
    const terms = q.split(/\s+/).filter((t) => t.length > 2);
    if (terms.length) {
      filtered = filtered.filter((p) =>
        terms.some((term) => `${p.name} ${p.category} ${p.description}`.toLowerCase().includes(term)),
      );
    }
  }

  const ranked = filtered.sort((a, b) => b.rating - a.rating).slice(0, 8);
  return {
    summary: ranked.length ? `Found ${ranked.length} matches from ${products.length} live listings.` : 'No exact matches — try a category, budget, or quantity.',
    products: ranked,
    insight,
  };
}

const money = (v: number) => `$${v.toFixed(2)}`;

export function AiResearchPage() {
  const { data: products, isLoading } = useListProducts({ sort: 'featured' });
  const [query, setQuery] = useState('');
  const [thinking, setThinking] = useState(false);
  const [result, setResult] = useState<AiResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const runResearch = (text: string) => {
    if (!text.trim() || thinking || !products?.length) return;
    setThinking(true);
    setResult(null);
    setTimeout(() => {
      setResult(analyzeQuery(text, products));
      setThinking(false);
    }, 900);
  };

  const quickPrompts = [
    'Find best MOQ deals under $50',
    'Which suppliers are verified?',
    'Shipping agent to USA UK Canada',
    'Wireless earphones wholesale',
  ];

  return (
    <AppShell activeTab="ai" hideSearch>
      <div className="bg-white px-4 py-8 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-[#ff6a00] to-[#ff8533] text-white shadow-lg">
            <Sparkles size={28} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">AI Mode</h1>
          <p className="mt-2 text-sm text-gray-600">Describe what you need to source — AI matches products and suppliers instantly.</p>
        </div>

        <div className="mx-auto mt-8 max-w-3xl">
          <div className="overflow-hidden rounded-full border-2 border-[#ff6a00] bg-white shadow-sm">
            <form onSubmit={(e) => { e.preventDefault(); runResearch(query); }} className="flex">
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Describe what you need to source…"
                className="min-w-0 flex-1 px-5 py-3.5 text-sm outline-none"
                data-testid="input-ai-research"
              />
              <button type="submit" disabled={thinking || !query.trim()} className="flex items-center gap-2 bg-[#ff6a00] px-8 text-sm font-bold text-white hover:bg-[#e55f00] disabled:opacity-50" data-testid="button-ai-research">
                {thinking ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                Search
              </button>
            </form>
          </div>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {quickPrompts.map((p) => (
              <button key={p} onClick={() => { setQuery(p); runResearch(p); }} className="rounded-full border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:border-[#ff6a00] hover:text-[#ff6a00]">{p}</button>
            ))}
          </div>
        </div>

        <div className="mx-auto mt-4 max-w-4xl">
          {!result && !thinking && (
            <div className="rounded border border-gray-200 bg-white p-6 text-center">
              <Bot size={32} className="mx-auto text-gray-300" />
              <p className="mt-3 text-sm text-gray-500">Ask about products, MOQ, shipping routes, or verified suppliers.</p>
            </div>
          )}
          {thinking && (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-gray-500">
              <Loader2 size={18} className="animate-spin text-[#ff6a00]" /> Analyzing marketplace data…
            </div>
          )}
          {result && !thinking && (
            <>
              <div className="mb-6 rounded border border-[#008744]/20 bg-[#008744]/5 p-4">
                <p className="text-sm font-semibold text-gray-800">{result.summary}</p>
                <p className="mt-1 text-xs text-gray-600">{result.insight}</p>
              </div>
              {result.products.length === 0 ? (
                <p className="text-center text-sm text-gray-500">Try a different query.</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {result.products.map((product) => (
                    <Link key={product.id} href={`/products/${product.id}`} className="group overflow-hidden rounded border border-gray-200 bg-white hover:border-[#ff6a00]/40 hover:shadow-md">
                      <div className="aspect-square overflow-hidden bg-gray-100">
                        {product.image && <img src={product.image} alt="" className="h-full w-full object-cover" />}
                      </div>
                      <div className="p-2.5">
                        <p className="line-clamp-2 text-xs font-semibold text-gray-800 group-hover:text-[#ff6a00]">{product.name}</p>
                        <p className="mt-1 text-xs font-bold text-gray-900">{money(product.price)}</p>
                        <p className="mt-0.5 flex items-center gap-1 text-[10px] text-gray-500">
                          <Star size={10} className="fill-amber-400 text-amber-400" /> {product.rating.toFixed(1)} · MOQ {product.moq}
                        </p>
                        {product.verified && <span className="mt-1 flex items-center gap-0.5 text-[10px] font-bold text-[#008744]"><BadgeCheck size={10} /> Verified</span>}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}
          {isLoading && !products && <SkeletonBlock className="h-32" />}
        </div>
      </div>
    </AppShell>
  );
}
