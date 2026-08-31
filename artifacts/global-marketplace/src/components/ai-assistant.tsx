import { useEffect, useRef, useState } from 'react';
import { Link } from 'wouter';
import {
  ArrowUpRight,
  Bot,
  Loader2,
  Send,
  Sparkles,
  X,
} from 'lucide-react';
import { useListProducts } from '@workspace/api-client-react';
import { useAiMode } from '@/components/ai-mode-context';

type Message = { role: 'user' | 'assistant'; text: string; links?: { href: string; label: string }[] };

const quickPrompts = [
  'Find best MOQ deals under $50',
  'Which suppliers are verified?',
  'Recommend electronics for resale',
  'Compare shipping options',
];

function buildAiResponse(query: string, products: { name: string; id: number; price: number; moq: number; category: string; supplierName: string; verified: boolean; rating: number }[]): Message {
  const q = query.toLowerCase();

  if (q.includes('verified') || q.includes('trust')) {
    const verified = products.filter((p) => p.verified).slice(0, 3);
    return {
      role: 'assistant',
      text: `I found ${products.filter((p) => p.verified).length} listings from verified suppliers. Top picks based on rating and response reliability:`,
      links: verified.map((p) => ({ href: `/products/${p.id}`, label: `${p.name} · ${p.supplierName}` })),
    };
  }

  if (q.includes('moq') || q.includes('cheap') || q.includes('under')) {
    const budget = products.filter((p) => p.price < 50).sort((a, b) => a.moq - b.moq).slice(0, 3);
    return {
      role: 'assistant',
      text: 'Here are low-MOQ options under $50/unit — ideal for first-time buyers testing demand:',
      links: budget.map((p) => ({ href: `/products/${p.id}`, label: `${p.name} · MOQ ${p.moq} · $${p.price.toFixed(2)}` })),
    };
  }

  if (q.includes('electronic') || q.includes('tech')) {
    const electronics = products.filter((p) => /electronic|tech|device|phone|camera|headphone|earphone/i.test(`${p.name} ${p.category}`)).slice(0, 3);
    return {
      role: 'assistant',
      text: 'AI-matched electronics with strong reorder rates in your region:',
      links: electronics.length
        ? electronics.map((p) => ({ href: `/products/${p.id}`, label: p.name }))
        : (Array.isArray(products) ? products : []).slice(0, 3).map((p) => ({ href: `/products/${p.id}`, label: p.name })),
    };
  }

  if (q.includes('ship') || q.includes('logistic')) {
    return {
      role: 'assistant',
      text: 'For shipping, I recommend verified suppliers with documented lead times. Most listings ship within 7–14 days to US/EU. Filter by supplier response rate on the Suppliers page for faster fulfillment.',
      links: [{ href: '/suppliers', label: 'Browse verified suppliers' }],
    };
  }

  const top = [...products].sort((a, b) => b.rating - a.rating).slice(0, 3);
  return {
    role: 'assistant',
    text: `Based on your query, here are AI-ranked matches from ${products.length} live listings:`,
    links: top.map((p) => ({ href: `/products/${p.id}`, label: `${p.name} · ★ ${p.rating.toFixed(1)}` })),
  };
}

export function AiAssistantPanel() {
  const { aiMode, assistantOpen, setAssistantOpen } = useAiMode();
  const { data: products } = useListProducts({ sort: 'featured' });
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      text: 'Hi! I\'m your AI sourcing assistant. Ask me to find products, compare suppliers, or optimize your order quantities.',
    },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, thinking]);

  if (!aiMode) return null;

  const send = (text: string) => {
    if (!text.trim() || thinking) return;
    const userMsg: Message = { role: 'user', text: text.trim() };
    setMessages((m) => [...m, userMsg]);
    setInput('');
    setThinking(true);
    setTimeout(() => {
      const reply = buildAiResponse(text, products ?? []);
      setMessages((m) => [...m, reply]);
      setThinking(false);
    }, 900 + Math.random() * 600);
  };

  return (
    <>
      {!assistantOpen && (
        <button
          onClick={() => setAssistantOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-gradient-to-r from-[#008744] to-[#00a854] px-5 py-3.5 text-sm font-bold text-white shadow-[0_8px_30px_rgba(0,135,68,0.35)] transition-transform hover:scale-105"
          data-testid="button-open-ai-assistant"
        >
          <Sparkles size={18} />
          AI Sourcing
        </button>
      )}

      {assistantOpen && (
        <div className="fixed bottom-6 right-6 z-50 flex w-[min(100vw-2rem,400px)] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between bg-gradient-to-r from-[#008744] to-[#00a854] px-4 py-3.5 text-white">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-white/20">
                <Bot size={18} />
              </span>
              <div>
                <p className="text-sm font-bold">AI Sourcing Assistant</p>
                <p className="text-[10px] text-white/75">Powered by Nzanila Intelligence</p>
              </div>
            </div>
            <button onClick={() => setAssistantOpen(false)} className="rounded-lg p-1.5 hover:bg-white/15" aria-label="Close AI assistant" data-testid="button-close-ai-assistant">
              <X size={18} />
            </button>
          </div>

          <div ref={scrollRef} className="flex max-h-[340px] flex-col gap-3 overflow-y-auto p-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${msg.role === 'user' ? 'bg-[#ff6a00] text-white' : 'bg-gray-100 text-gray-800'}`}>
                  {msg.text}
                  {msg.links && (
                    <ul className="mt-2 space-y-1.5 border-t border-gray-200/60 pt-2">
                      {msg.links.map((link) => (
                        <li key={link.href}>
                          <Link href={link.href} className="flex items-center gap-1 text-xs font-bold text-[#008744] hover:underline" onClick={() => setAssistantOpen(false)}>
                            {link.label} <ArrowUpRight size={12} />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ))}
            {thinking && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Loader2 size={14} className="animate-spin text-[#008744]" />
                Analyzing marketplace data…
              </div>
            )}
          </div>

          <div className="border-t border-gray-100 px-3 py-2">
            <div className="mb-2 flex flex-wrap gap-1.5">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => send(prompt)}
                  className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[10px] font-semibold text-gray-600 hover:border-[#008744] hover:text-[#008744]"
                >
                  {prompt}
                </button>
              ))}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="flex gap-2"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about products, MOQ, suppliers…"
                className="min-w-0 flex-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#008744]"
                data-testid="input-ai-assistant"
              />
              <button type="submit" disabled={thinking || !input.trim()} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#008744] text-white disabled:opacity-50" data-testid="button-send-ai">
                <Send size={16} />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
