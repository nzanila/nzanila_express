import { useEffect, useRef, useState } from 'react';
import { Link } from 'wouter';
import { ArrowUp, ArrowUpRight, BadgeCheck, Check, ChevronDown, ClipboardList, Copy, Download, Globe2, Info, Loader2, MessageSquare, PanelLeft, Plus, ShoppingCart, Sparkles, Square, Star, Truck, UserRound, X } from 'lucide-react';
import { type Product } from '@workspace/api-client-react';
import { useAuth } from '@/lib/auth-context';
import { useLocale } from '@/lib/i18n/locale-context';
import { locales, type Locale } from '@/lib/i18n/translations';
import { AppShell, Logo } from '@/components/marketplace-shell';
import './ai-research-page.css';

type AiResult = { summary: string; products: Product[]; insight: string; analysis: string[]; steps: string[]; followUps: string[] };
type ChatMessage = { id: string; role: 'user' | 'assistant'; text: string; greeting?: boolean; result?: AiResult; failed?: boolean; retryQuery?: string };
type Conversation = { id: string; title: string; messages: ChatMessage[] };
const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000' : 'https://nzanila-api-server.nzanilaexpress.workers.dev');
const greeting = "Hello! I'm Nzanila AI, your sourcing assistant.\n\nI'm here to help with your procurement needs on Nzanila.com, including:\n• Finding products and suppliers for your requirements.\n• Comparing prices and minimum order quantities.\n• Reviewing supplier details and verification signals.\n• Planning sourcing questions and delivery requirements.\n\nHow can I assist you with your sourcing today?";
const newConversation = (): Conversation => ({ id: crypto.randomUUID(), title: 'Greeting', messages: [] });
const quickPrompts = ['Find best MOQ deals under $50', 'Which suppliers are verified?', 'Shipping agent to Burundi', 'Wireless earphones wholesale'];
const cleanAssistantSummary = (value: string): string => {
  const cleaned = value.split(/\n\s*(?:summary|analysis|productids|steps|followups|considerations)\s*:/i)[0].trim();
  return cleaned || value.trim();
};

const money = (value: number) => `${Math.round(value).toLocaleString('en-US')} BIF`;

function Greeting() {
  return <div className="research-prose">
    <p>Hello! I'm your <strong>Nzanila AI</strong> sourcing assistant.</p>
    <p>I'm here to help with your procurement needs on Nzanila.com, including:</p>
    <ul>
      <li><strong>Finding products and suppliers</strong> for your specific requirements.</li>
      <li><strong>Comparing prices and minimum order quantities</strong> to fit your budget.</li>
      <li><strong>Reviewing supplier details and verification signals</strong> before you connect.</li>
      <li><strong>Planning sourcing questions and delivery requirements</strong> for your orders.</li>
    </ul>
    <p>How can I assist you with your sourcing today?</p>
  </div>;
}

export function AiResearchPage() {
  const [conversations, setConversations] = useState<Conversation[]>(() => [newConversation()]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [thinking, setThinking] = useState(false);
  const [progress, setProgress] = useState<string[]>([]);
  const [sidebarClosed, setSidebarClosed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [promptsOpen, setPromptsOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<AbortController | null>(null);
  const initialSearchRan = useRef(false);
  const { user, isAuthenticated } = useAuth();
  const { locale, setLocale } = useLocale();
  const active = conversations.find(chat => chat.id === activeId) || conversations[0];
  const accountHref = isAuthenticated ? (user?.role === 'seller' ? '/seller/profile' : '/buyer/dashboard') : '/auth';

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
  }, [active.id, active.messages.length, thinking]);

  useEffect(() => () => requestRef.current?.abort(), []);

  const appendMessage = (chatId: string, message: ChatMessage) => {
    setConversations(current => current.map(chat => chat.id === chatId ? { ...chat, messages: [...chat.messages, message] } : chat));
  };

  const stopResearch = () => {
    requestRef.current?.abort();
    requestRef.current = null;
    setThinking(false);
  };

  const dismissKeyboard = () => {
    inputRef.current?.blur();
    document.documentElement.classList.remove('nzanila-keyboard-open');
  };

  const runResearch = async (text: string) => {
    const cleanQuery = text.trim();
    if (!cleanQuery || requestRef.current) return;
    const chatId = active.id;
    dismissKeyboard();
    setQuery('');
    setPromptsOpen(false);
    setNotice('');
    appendMessage(chatId, { id: crypto.randomUUID(), role: 'user', text: cleanQuery });
    setConversations(current => current.map(chat => chat.id === chatId && !chat.messages.some(message => message.role === 'assistant') ? { ...chat, title: /^(hi|hello|hey)[!. ]*$/i.test(cleanQuery) ? 'Greeting' : cleanQuery.slice(0, 60) } : chat));
    const controller = new AbortController();
    requestRef.current = controller;
    setThinking(true);
    setProgress([]);
    const timeout = window.setTimeout(() => controller.abort(), 60_000);
    try {
      const response = await fetch(`${API_BASE}/api/ai/research`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
        body: JSON.stringify({ query: cleanQuery, stream: true, messages: active.messages.filter(message => !message.failed).slice(-16).map(message => ({
          role: message.role,
          content: message.text + (message.result?.products.length ? `\nDiscussed listings: ${message.result.products.map(product => `${product.name}, ID ${product.id}, ${money(product.price)}, MOQ ${product.moq}`).join('; ')}` : ''),
        })) }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(typeof data?.error === 'string' ? data.error : 'Nzanila AI is temporarily unavailable. Please try again.');
      }
      const reader = response.body?.getReader();
      if (!reader) throw new Error('The connection was interrupted. Please try again.');
      const decoder = new TextDecoder();
      let buffer = '';
      let receivedReply = false;
      const stringList = (value: unknown): string[] => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
      const receive = (line: string) => {
        if (!line.trim()) return;
        const event = JSON.parse(line);
        if (event.type === 'error') throw new Error(event.message || 'Research failed. Please try again.');
        if (event.type === 'status' && typeof event.message === 'string') setProgress(current => [...current, event.message]);
        if (event.type === 'result' && typeof event.summary === 'string') {
          const result: AiResult = { summary: cleanAssistantSummary(event.summary), products: Array.isArray(event.products) ? event.products : [], insight: stringList(event.considerations).join(' '), analysis: stringList(event.analysis), steps: stringList(event.steps), followUps: stringList(event.followUps) };
          appendMessage(chatId, { id: crypto.randomUUID(), role: 'assistant', text: result.summary, result });
          receivedReply = true;
        }
      };
      try {
        while (true) {
          const { value, done } = await reader.read();
          controller.signal.throwIfAborted();
          if (done) { buffer += decoder.decode(); break; }
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          lines.forEach(receive);
        }
        receive(buffer);
        if (!receivedReply) throw new Error('The reply was interrupted. Please try again.');
      } finally { await reader.cancel().catch(() => {}); }
    } catch (error) {
      if (requestRef.current === controller) {
        appendMessage(chatId, { id: crypto.randomUUID(), role: 'assistant', text: controller.signal.aborted ? 'This request took too long. Please try again.' : error instanceof Error ? error.message : 'Nzanila AI is temporarily unavailable. Please try again.', failed: true, retryQuery: cleanQuery });
      }
    } finally {
      window.clearTimeout(timeout);
      if (requestRef.current === controller) {
        requestRef.current = null;
        setThinking(false);
        inputRef.current?.focus();
      }
    }
  };

  useEffect(() => {
    const initialQuery = new URLSearchParams(window.location.search).get('q');
    if (initialQuery && !initialSearchRan.current) {
      initialSearchRan.current = true;
      void runResearch(initialQuery);
    }
  }, []);

  const startChat = () => {
    stopResearch();
    const chat = newConversation();
    setConversations(current => [chat, ...current.filter(item => item.messages.length)]);
    setActiveId(chat.id);
    setQuery('');
    setMobileOpen(false);
    setPromptsOpen(false);
    setNotice('');
    inputRef.current?.focus();
  };

  const copyMessage = async (message: ChatMessage) => {
    try {
      await navigator.clipboard.writeText(message.text + (message.result ? `\n\n${message.result.insight}\n${message.result.steps?.join('\n') || ''}` : ''));
      setCopiedId(message.id);
      setNotice('Reply copied.');
    } catch { setNotice('Copy is unavailable in this browser. You can select the reply text to copy it.'); }
  };

  const exportChat = () => {
    const text = active.messages.length ? active.messages.map(message => `${message.role === 'user' ? 'You' : 'Nzanila AI'}: ${message.text}${message.result ? `\n${message.result.insight}\n${message.result.steps?.join('\n') || ''}\n${message.result.products.map(product => `${product.name} — ${money(product.price)} — MOQ ${product.moq}`).join('\n')}` : ''}`).join('\n\n') : greeting;
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'nzanila-research-chat.txt';
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const displayedMessages: ChatMessage[] = active.messages.length ? active.messages : [{ id: 'welcome', role: 'assistant', text: greeting, greeting: true }];

  return (
    <AppShell hideSearch hideSidebar hideFooter activeTab="ai">
    <div className="research-app">
      <header className="research-topbar">
        <div className="research-welcome"><span>Welcome to Nzanila.com</span><nav><Link href="/">About Nzanila.com</Link><Link href="/">Help Center</Link><Link href="/ai-research">AI Sourcing</Link><Link href="/supplier">Sell on Nzanila.com</Link></nav></div>
        <div className="research-topbar-inner">
          <Logo />
          <nav className="research-nav" aria-label="Marketplace navigation">
            <Link href="/ai-research" aria-current="page">AI Mode</Link>
            <Link href="/products">Products</Link>
            <Link href="/categories">Manufacturers</Link>
          </nav>
          <div className="research-account-nav"><Link href={isAuthenticated ? "/buyer/profile" : "/auth"} className="research-delivery"><small>Deliver to:</small><span>Choose location</span></Link>
            <label className="research-language"><Globe2 size={20} /><select aria-label="Language" value={locale} onChange={event => setLocale(event.target.value as Locale)}>{locales.map(item => <option key={item.code} value={item.code}>{item.label}</option>)}</select></label>
            <Link href="/messages" className="research-icon" aria-label="Messages"><MessageSquare size={20} /></Link>
            <Link href="/orders" className="research-orders-link" aria-label="Orders"><Truck size={17} /><span>Orders</span></Link>
            <Link href="/orders" className="research-icon research-orders-mobile" aria-label="Orders"><ClipboardList size={20} /></Link>
            <Link href="/orders" className="research-icon research-order-list" aria-label="Order list"><ClipboardList size={20} /></Link>
            <Link href="/cart" className="research-icon" aria-label="Cart"><ShoppingCart size={21} /></Link>
            <Link href={accountHref} className="research-icon" aria-label="Account"><UserRound size={21} /></Link>
          </div>
        </div>
      </header>
      <div className="research-workspace">
        {mobileOpen && <button className="research-backdrop" aria-label="Close chat history" onClick={() => setMobileOpen(false)} />}
        <aside id="research-history" className={`research-sidebar ${sidebarClosed ? 'is-collapsed' : ''} ${mobileOpen ? 'is-mobile-open' : ''}`} aria-label="Chat history">
          <div className="research-sidebar-title"><span><Sparkles size={22} /> Nzanila AI</span><button className="research-icon" aria-label="Close sidebar" onClick={() => { setSidebarClosed(true); setMobileOpen(false); }}><PanelLeft size={17} /></button></div>
          <button className="research-new-chat" onClick={startChat}><Plus size={21} />New chat</button>
          <p className="research-history-label">History</p>
          <nav className="research-history-list" aria-label="Conversations">{conversations.map(chat => <button key={chat.id} className={chat.id === active.id ? 'is-active' : ''} aria-current={chat.id === active.id ? 'page' : undefined} onClick={() => { stopResearch(); setActiveId(chat.id); setQuery(''); setMobileOpen(false); setNotice(''); }}>{chat.title}</button>)}</nav>
          <Link href="/products" className="research-sidebar-footer"><span><strong>Source with Nzanila</strong><small>Discover products and suppliers</small></span><ArrowUpRight size={19} /></Link>
        </aside>
        <main className="research-main">
          <div className="research-chat-heading"><div><button className={`research-icon research-open-sidebar ${sidebarClosed ? 'is-visible' : ''}`} aria-label="Open chat history" aria-controls="research-history" onClick={() => { setSidebarClosed(false); setMobileOpen(true); }}><PanelLeft size={17} /></button><h1>{active.title}</h1></div><div><span className="research-ai-label"><Info size={13} /> Generated by Nzanila AI</span><button className="research-icon" aria-label="Download conversation" onClick={exportChat}><Download size={16} /></button></div></div>
          <div className="research-transcript" role="log" aria-label="Conversation" aria-live="polite" aria-relevant="additions">
            <div className="research-message-column">
              {displayedMessages.map(message => message.role === 'user' ? <div key={message.id} className="research-user-row"><div className="research-user-message">{message.text}</div></div> : <article key={message.id} className="research-assistant-message">
                <div className="research-assistant-name"><Sparkles size={24} /><strong>Nzanila AI</strong></div>
                {message.greeting ? <Greeting /> : <div className="research-prose"><p>{message.text}</p>{message.result && <>
                  {!!message.result.analysis.length && <details className="research-analysis"><summary><Sparkles size={15} /> How I reached this recommendation <ChevronDown size={14} /></summary><ul>{message.result.analysis.map((reason, index) => <li key={index}>{reason}</li>)}</ul></details>}
                  {message.result.insight && <p>{message.result.insight}</p>}
                  {!!message.result.products.length && <div className="research-products">{Array.from(new Map(message.result.products.map(product => [`${product.name}-${product.price}`, product])).values()).map(product => <Link key={product.id} href={`/products/${product.id}`} className="research-product">{product.image && <img src={product.image} alt={product.name} loading="lazy" />}<div><h2>{product.name}</h2><strong>{money(product.price)}</strong><span><Star size={12} />{product.rating.toFixed(1)} · MOQ {product.moq}</span>{product.verified && <span className="research-verified"><BadgeCheck size={13} />Verified</span>}</div></Link>)}</div>}
                  {!!message.result.steps?.length && <><strong>Suggested next steps</strong><ol>{message.result.steps.map((step, index) => <li key={index}>{step}</li>)}</ol></>}
                  {!!message.result.followUps.length && <div className="research-followups">{message.result.followUps.map((prompt, index) => <button key={index} disabled={thinking} onClick={() => void runResearch(prompt)}>{prompt}<ArrowUpRight size={14} /></button>)}</div>}
                </>}{message.failed && <button className="research-retry" disabled={thinking} onClick={() => void runResearch(message.retryQuery || '')}>Try again</button>}</div>}
                <div className="research-message-actions"><button className="research-icon" aria-label="Copy reply" onClick={() => void copyMessage(message)}>{copiedId === message.id ? <Check size={14} /> : <Copy size={14} />}</button></div>
              </article>)}
              {thinking && <div className="research-progress" role="status"><div className="research-assistant-name"><Sparkles size={24} /><strong>Nzanila AI</strong></div><div className="research-thinking"><Loader2 size={16} className="animate-spin" />{progress.at(-1) || 'Connecting to Nzanila AI…'}</div>{progress.length > 1 && <details><summary>Research activity</summary><ul>{progress.slice(0, -1).map((step, index) => <li key={index}><Check size={13} />{step}</li>)}</ul></details>}</div>}
              <div ref={bottomRef} />
            </div>
          </div>
          <div className="research-composer-area">
            {notice && <p className="research-notice" role="status">{notice}</p>}
            <form className="research-composer" onSubmit={event => { event.preventDefault(); void runResearch(query); }}>
              {promptsOpen && <div className="research-prompts"><div><strong>Try a sourcing question</strong><button type="button" className="research-icon" aria-label="Close suggestions" onClick={() => setPromptsOpen(false)}><X size={16} /></button></div>{quickPrompts.map(prompt => <button type="button" key={prompt} onClick={() => { setQuery(prompt); setPromptsOpen(false); inputRef.current?.focus(); }}>{prompt}<ArrowUpRight size={14} /></button>)}</div>}
              <textarea ref={inputRef} value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void runResearch(query); } }} placeholder="Describe your needs..." aria-label="Message Nzanila AI" maxLength={4000} rows={2} data-testid="input-ai-research" />
              <div className="research-composer-tools"><div><button type="button" className="research-add" aria-label="Sourcing suggestions" aria-expanded={promptsOpen} onClick={() => setPromptsOpen(open => !open)}><Plus size={20} /></button><button type="button" className="research-keyboard-dismiss" aria-label="Hide keyboard" onClick={dismissKeyboard}>⌄</button></div><div><span className="research-mode"><Sparkles size={14} /> Nzanila AI</span>{thinking ? <button type="button" className="research-send" aria-label="Stop research" onClick={stopResearch}><Square size={14} fill="currentColor" /></button> : <button type="submit" className="research-send" disabled={!query.trim()} aria-label="Send message" data-testid="button-ai-research"><ArrowUp size={20} /></button>}</div></div>
            </form>
          </div>
        </main>
      </div>
    </div>
    </AppShell>
  );
}
