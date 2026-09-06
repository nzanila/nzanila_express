import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useLocation } from 'wouter';
import { BadgeCheck, CheckCircle2, ChevronDown, Filter, Sparkles, Star } from 'lucide-react';
import { useListProducts, type Product } from '@workspace/api-client-react';
import { AppShell } from '@/components/marketplace-shell';

const apiBase = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000' : 'https://nzanila-api-server.nzanilaexpress.workers.dev');
const money = (value: number) => `${Number(value || 0).toLocaleString('en-US')} BIF`;

export function AiSearchPage() {
  const [, setLocation] = useLocation();
  const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const initialQuery = params.get('q') || params.get('search') || '';
  const [query, setQuery] = useState(initialQuery);
  const [submitted, setSubmitted] = useState(initialQuery);
  const [reasoning, setReasoning] = useState('Understanding your requirements');
  const [aiSummary, setAiSummary] = useState('');
  const [activeFilter, setActiveFilter] = useState('All products');
  const { data: products, isLoading } = useListProducts({ search: submitted || undefined, sort: 'featured' });

  useEffect(() => {
    if (!submitted) return;
    let cancelled = false;
    setReasoning('Understanding your requirements');
    setAiSummary('');
    const timer = window.setTimeout(async () => {
      setReasoning('Reasoning for search strategy');
      try {
        const response = await fetch(`${apiBase}/api/ai/research`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: submitted, messages: [], stream: false }) });
        if (!response.ok) throw new Error('AI search unavailable');
        const result = await response.json() as { summary?: string };
        if (!cancelled) { setAiSummary(result.summary || `Matching products and search keywords for “${submitted}”.`); setReasoning('Matching products and search keywords'); }
      } catch {
        if (!cancelled) setLocation(`/products?search=${encodeURIComponent(submitted)}`);
      }
    }, 180);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [submitted]);

  const visibleProducts = useMemo(() => {
    const list = (products || []) as Product[];
    if (activeFilter === 'Verified suppliers') return list.filter(product => product.verified);
    if (activeFilter === 'In stock') return list.filter(product => product.stock > 0);
    return list;
  }, [products, activeFilter]);

  const submit = (event: FormEvent) => { event.preventDefault(); if (query.trim()) { setSubmitted(query.trim()); setLocation(`/ai-search?q=${encodeURIComponent(query.trim())}`); } };
  const filters = ['All products', 'Verified suppliers', 'In stock', 'MOQ ≤ 5', 'Top rated'];

  return <AppShell activeTab="ai">
    <main className="mx-auto max-w-[1440px] px-4 py-6 lg:px-8">
      <form onSubmit={submit} className="mb-5 flex h-11 max-w-3xl overflow-hidden rounded-full border-2 border-[#ff6a00] bg-white shadow-sm">
        <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search products with Nzanila AI…" className="min-w-0 flex-1 px-4 text-sm outline-none" aria-label="AI product search" />
        <button className="flex items-center gap-2 bg-[#ff6a00] px-6 text-sm font-bold text-white"><Sparkles size={15} /> AI Search</button>
      </form>

      <div className="mb-4 flex items-center gap-7 border-b border-gray-200 text-sm font-semibold text-gray-500">
        {['AI Mode', 'All', 'Suppliers', 'Worldwide'].map((tab, index) => <button key={tab} className={`border-b-2 px-1 pb-3 ${index === 1 ? 'border-gray-900 text-gray-900' : 'border-transparent'}`}>{tab}</button>)}
      </div>

      {submitted && <section className="mb-4 rounded-lg border border-[#ff6a00] bg-white p-4">
        <div className="mb-3 flex items-center gap-2 text-lg font-bold text-[#ff5a00]"><Sparkles size={19} /> Deep Search results <span className="text-xs font-normal text-gray-500">AI reasoning</span></div>
        <div className="space-y-3 text-sm">
          <div className="flex gap-2"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-[#ff5a00]" /><div><p className="font-semibold">Understanding your requirements</p><p className="mt-1 border-l border-gray-200 pl-3 text-gray-500">You’re looking for <b>{submitted}</b>.</p></div></div>
          <div className="flex gap-2"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-[#ff5a00]" /><div><p className="font-semibold">Reasoning for search strategy</p><p className="mt-1 border-l border-gray-200 pl-3 text-gray-500">{aiSummary || 'I am analyzing product listings, descriptions, specifications, and supplier credentials.'}</p></div></div>
          <div className="flex gap-2"><span className="mt-0.5 h-4 w-4 animate-pulse rounded-full border-2 border-dotted border-[#ff5a00]" /><p className="font-semibold">{reasoning}</p></div>
        </div>
      </section>}

      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm"><span className="mr-1 font-bold">Attributes:</span>{['Small Size', 'Large Size', 'Lightweight', 'Heavyweight', 'Waterproof', 'Wireless', 'USB Powered', 'Rechargeable'].map(item => <button key={item} className="rounded-full border border-gray-200 bg-white px-3 py-1.5 hover:border-[#ff6a00]">{item}</button>)}</div>
      <div className="mb-5 flex flex-wrap items-center gap-2 text-sm"><span className="mr-1 font-bold">Select by:</span>{filters.map(item => <button key={item} onClick={() => setActiveFilter(item)} className={`rounded-full border px-3 py-1.5 ${activeFilter === item ? 'border-[#ff6a00] bg-orange-50 text-[#e85d00]' : 'border-gray-200 bg-white'}`}>{item}</button>)}<button className="ml-auto flex items-center gap-1 rounded-full border border-gray-300 px-4 py-1.5 font-semibold"><Filter size={14} /> More filters</button></div>

      {isLoading ? <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">{Array.from({ length: 10 }).map((_, index) => <div key={index} className="h-72 animate-pulse rounded-lg bg-gray-100" />)}</div> : visibleProducts.length ? <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">{visibleProducts.map(product => <article key={product.id} className="group min-w-0"><Link href={`/products/${product.id}`} className="block overflow-hidden rounded-lg bg-gray-100"><img src={product.image} alt={product.name} className="aspect-square w-full object-cover transition-transform group-hover:scale-105" /></Link><Link href={`/products/${product.id}`} className="mt-2 block line-clamp-2 text-sm text-gray-700 hover:text-[#ff6a00]">{product.name}</Link><p className="mt-1 text-lg font-bold">{money(product.price)}</p><p className="text-xs text-gray-500">Min. order: {product.moq || 1} {product.unit || 'piece'}</p><p className="mt-1 flex items-center gap-1 truncate text-xs text-gray-500"><Star size={12} className="fill-amber-400 text-amber-400" /> {product.rating?.toFixed(1) || '5.0'} · {product.supplierName}</p><p className={`mt-1 flex items-center gap-1 text-xs ${product.verified ? 'text-emerald-600' : 'text-gray-500'}`}>{product.verified ? <><BadgeCheck size={13} /> Verified supplier</> : <><ChevronDown size={13} /> Supplier</>}</p></article>)}</div> : <div className="rounded-lg border border-dashed p-12 text-center text-sm text-gray-500">No matching products yet. Try a broader search.</div>}
    </main>
  </AppShell>;
}
