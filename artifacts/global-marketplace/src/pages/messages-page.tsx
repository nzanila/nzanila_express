import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Search, Send, CheckCheck, Check, Image, Paperclip, MoreVertical } from 'lucide-react';
import { Link } from 'wouter';
import { AppShell } from '@/components/marketplace-shell';

type Conversation = {
  id: number;
  supplier: string;
  avatar: string;
  lastMessage: string;
  time: string;
  unread: number;
  online: boolean;
};

type ChatMessage = {
  id: number;
  from: 'me' | 'them';
  text: string;
  time: string;
  read: boolean;
};

const conversations: Conversation[] = [
  { id: 1, supplier: 'Nova Living Co.', avatar: 'NL', lastMessage: 'Sure, we can do 500 units at $3.20 each. Want me to send the sample?', time: '2m ago', unread: 2, online: true },
  { id: 2, supplier: 'Kivu Craft Collective', avatar: 'KC', lastMessage: 'The basket shipment cleared customs yesterday.', time: '1h ago', unread: 0, online: true },
  { id: 3, supplier: 'Orion Tech Manufacturing', avatar: 'OT', lastMessage: 'Here are the updated specs for the solar charger.', time: '3h ago', unread: 1, online: false },
  { id: 4, supplier: 'Safi Essentials', avatar: 'SE', lastMessage: 'Payment received. Shipping within 48 hours.', time: '5h ago', unread: 0, online: true },
  { id: 5, supplier: 'EastBridge Trading', avatar: 'EB', lastMessage: 'Can you confirm the color options for the tote bags?', time: '1d ago', unread: 0, online: false },
  { id: 6, supplier: 'Pacific Logistics Hub', avatar: 'PL', lastMessage: 'Tracking number: PLB-2026-88431', time: '2d ago', unread: 0, online: false },
];

const chatMessages: Record<number, ChatMessage[]> = {
  1: [
    { id: 1, from: 'them', text: 'Hi! Thanks for your interest in our ceramic dinner sets. How many units are you looking for?', time: '10:30 AM', read: true },
    { id: 2, from: 'me', text: 'We need about 500 pieces for our Bujumbura store. What\'s the best price?', time: '10:32 AM', read: true },
    { id: 3, from: 'them', text: 'For 500 units we can offer $3.50 per piece. That includes the standard packaging.', time: '10:35 AM', read: true },
    { id: 4, from: 'me', text: 'That\'s a bit high. We were hoping for around $3.20. Can you work with that?', time: '10:38 AM', read: true },
    { id: 5, from: 'them', text: 'Sure, we can do 500 units at $3.20 each. Want me to send the sample?', time: '10:40 AM', read: false },
    { id: 6, from: 'them', text: 'I can also include free shipping if you order within this week.', time: '10:41 AM', read: false },
  ],
  2: [
    { id: 1, from: 'me', text: 'Any update on the woven basket order #4521?', time: 'Yesterday', read: true },
    { id: 2, from: 'them', text: 'Yes! The shipment cleared customs yesterday. Expected delivery in Bujumbura is Friday.', time: 'Yesterday', read: true },
    { id: 3, from: 'me', text: 'Great news. Can you share the tracking link?', time: 'Yesterday', read: true },
    { id: 4, from: 'them', text: 'Here it is: track.nzanila.bi/4521 — you can follow it in real time.', time: '1h ago', read: true },
  ],
  3: [
    { id: 1, from: 'them', text: 'Hello! We\'ve updated the solar charger specs based on your feedback.', time: '3h ago', read: false },
    { id: 2, from: 'them', text: 'New capacity: 20000mAh, dual USB-C output, IP65 waterproof rating.', time: '3h ago', read: false },
    { id: 3, from: 'them', text: 'MOQ is 200 units at $12.50 each. Let me know if you want to proceed.', time: '3h ago', read: false },
  ],
  4: [
    { id: 1, from: 'me', text: 'Just sent the payment for order #4498. Please confirm.', time: 'Yesterday', read: true },
    { id: 2, from: 'them', text: 'Payment received! Shipping within 48 hours. You\'ll get a tracking number soon.', time: '5h ago', read: true },
  ],
  5: [
    { id: 1, from: 'them', text: 'Can you confirm the color options for the tote bags? We have navy, olive, and natural.', time: '1d ago', read: true },
    { id: 2, from: 'me', text: 'We\'ll take 200 navy and 100 olive. Thanks!', time: '1d ago', read: true },
  ],
  6: [
    { id: 1, from: 'them', text: 'Your order has been shipped! Tracking number: PLB-2026-88431', time: '2d ago', read: true },
    { id: 2, from: 'me', text: 'Received, thanks for the fast turnaround.', time: '2d ago', read: true },
  ],
};

export function MessagesPage() {
  const [selected, setSelected] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [newMsg, setNewMsg] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [kbHeight, setKbHeight] = useState(0);

  useEffect(() => {
    const vp = window.visualViewport;
    if (!vp) return;
    const onResize = () => {
      const h = window.innerHeight - vp.height;
      setKbHeight(h > 100 ? h : 0);
    };
    vp.addEventListener('resize', onResize);
    vp.addEventListener('scroll', onResize);
    return () => { vp.removeEventListener('resize', onResize); vp.removeEventListener('scroll', onResize); };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selected, kbHeight]);

  const filtered = conversations.filter(
    (c) => c.supplier.toLowerCase().includes(search.toLowerCase()) || c.lastMessage.toLowerCase().includes(search.toLowerCase())
  );

  const activeConvo = conversations.find((c) => c.id === selected);
  const activeMessages = selected ? chatMessages[selected] ?? [] : [];

  const sendMessage = () => {
    if (!newMsg.trim() || !selected) return;
    setNewMsg('');
  };

  // ── Chat view ──
  if (selected && activeConvo) {
    return (
      <AppShell activeTab="messages" hideSearch>
        <div
          className="flex flex-col bg-background"
          style={{ height: `calc(dvh - 56px${kbHeight ? ` - ${kbHeight}px` : ''})`, height: `calc(100dvh - 56px${kbHeight ? ` - ${kbHeight}px` : ''})` }}
        >
          {/* Chat header */}
          <div className="flex items-center gap-3 border-b border-border bg-card px-3 py-3 sm:px-4">
            <button onClick={() => setSelected(null)} className="rounded-lg p-1.5 hover:bg-muted">
              <ArrowLeft size={20} className="text-foreground" />
            </button>
            <div className="relative h-9 w-9 flex-shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
              {activeConvo.avatar}
              {activeConvo.online && <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-card bg-emerald-500" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-foreground">{activeConvo.supplier}</p>
              <p className="text-[10px] text-muted-foreground">{activeConvo.online ? 'Online' : 'Offline'}</p>
            </div>
            <button className="rounded-lg p-2 hover:bg-muted"><MoreVertical size={18} className="text-muted-foreground" /></button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-4 space-y-3 sm:px-4">
            {activeMessages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.from === 'me' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] sm:max-w-[70%] rounded-2xl px-3.5 py-2.5 ${
                  msg.from === 'me'
                    ? 'bg-primary text-primary-foreground rounded-br-md'
                    : 'bg-card border border-border text-foreground rounded-bl-md'
                }`}>
                  <p className="text-[13px] leading-relaxed">{msg.text}</p>
                  <div className={`mt-1 flex items-center gap-1 text-[10px] ${msg.from === 'me' ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                    <span>{msg.time}</span>
                    {msg.from === 'me' && (
                      msg.read ? <CheckCheck size={12} /> : <Check size={12} />
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-border bg-card px-3 py-2.5 sm:px-4" style={{ paddingBottom: `max(0.625rem, ${kbHeight}px)` }}>
            <div className="flex items-end gap-2">
              <button className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground flex-shrink-0">
                <Paperclip size={18} />
              </button>
              <button className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground flex-shrink-0">
                <Image size={18} />
              </button>
              <div className="flex flex-1 items-end rounded-xl border border-border bg-background focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20">
                <textarea
                  value={newMsg}
                  onChange={(e) => { setNewMsg(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 96) + 'px'; }}
                  onFocus={() => { setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 300); }}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); e.target.style.height = 'auto'; } }}
                  placeholder="Type a message…"
                  rows={1}
                  className="min-h-[36px] max-h-24 flex-1 resize-none bg-transparent px-3 py-2 text-sm outline-none"
                />
              </div>
              <button
                onClick={sendMessage}
                disabled={!newMsg.trim()}
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  // ── Conversation list ──
  return (
    <AppShell activeTab="messages" hideSearch>
      <div className="bg-background px-4 py-4 sm:px-5 sm:py-6">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-lg font-bold text-foreground sm:text-xl">Messages</h1>
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold text-primary">
            {conversations.reduce((s, c) => s + c.unread, 0)} unread
          </span>
        </div>

        {/* Search */}
        <div className="mb-4 flex h-10 items-center rounded-lg border border-border bg-card px-3 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
          <Search size={16} className="mr-2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations…"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
        </div>

        {/* List */}
        <div className="divide-y divide-border rounded-xl border border-border bg-card overflow-hidden">
          {filtered.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">No conversations found.</div>
          )}
          {filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelected(c.id)}
              className="flex w-full items-center gap-3 px-3.5 py-3 text-left hover:bg-muted/50 transition-colors sm:px-4"
            >
              <div className="relative h-11 w-11 flex-shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                {c.avatar}
                {c.online && <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-card bg-emerald-500" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-bold text-foreground">{c.supplier}</p>
                  <span className="flex-shrink-0 text-[10px] text-muted-foreground">{c.time}</span>
                </div>
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <p className="truncate text-xs text-muted-foreground">{c.lastMessage}</p>
                  {c.unread > 0 && (
                    <span className="flex h-4 min-w-[16px] flex-shrink-0 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                      {c.unread}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
