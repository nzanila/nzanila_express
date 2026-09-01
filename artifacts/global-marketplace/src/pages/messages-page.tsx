import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Check,
  CheckCheck,
  Image,
  MoreHorizontal,
  Paperclip,
  Phone,
  Search,
  Send,
  Video,
} from 'lucide-react';
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
  const [selected, setSelected] = useState<number>(conversations[0]?.id ?? 0);
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState('');
  const [mobileView, setMobileView] = useState<'inbox' | 'chat'>('inbox');
  const endRef = useRef<HTMLDivElement | null>(null);

  const filtered = useMemo(
    () =>
      conversations.filter(
        (c) => c.supplier.toLowerCase().includes(search.toLowerCase()) || c.lastMessage.toLowerCase().includes(search.toLowerCase())
      ),
    [search]
  );

  useEffect(() => {
    if (!filtered.some((c) => c.id === selected) && filtered[0]) {
      setSelected(filtered[0].id);
    }
  }, [filtered, selected]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selected, draft]);

  const activeConvo = conversations.find((c) => c.id === selected) ?? filtered[0] ?? conversations[0];
  const activeMessages = chatMessages[activeConvo.id] ?? [];

  const sendMessage = () => {
    if (!draft.trim()) return;
    setDraft('');
  };

  return (
    <AppShell activeTab="messages" hideSearch>
      <div className="mx-auto w-full max-w-7xl px-3 py-5 sm:px-5 lg:px-6">
        <div className="overflow-hidden rounded-[30px] border border-border bg-card shadow-[0_30px_90px_rgba(15,23,42,0.12)] ring-1 ring-slate-200/80">
          <div className="grid min-h-[80vh] grid-cols-1 lg:grid-cols-[390px_minmax(0,1fr)]">
            <aside className={`${mobileView === 'inbox' ? 'block' : 'hidden'} border-b border-border bg-gradient-to-b from-slate-50 via-slate-50 to-white lg:block lg:border-b-0 lg:border-r`}>
              <div className="flex items-center justify-between border-b border-border bg-white/80 px-4 py-4 backdrop-blur-sm sm:px-5">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">Messages</p>
                  <h1 className="mt-1 text-2xl font-bold text-foreground">Inbox</h1>
                </div>
                <button className="rounded-full bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground shadow-sm shadow-primary/20 transition hover:bg-primary/90">
                  New chat
                </button>
              </div>

              <div className="border-b border-border bg-white/60 px-3 py-3 sm:px-4">
                <div className="flex items-center gap-2 rounded-2xl border border-border bg-background px-3.5 py-2.5 text-sm text-muted-foreground shadow-sm focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10">
                  <Search size={17} />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search conversations"
                    className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                  />
                </div>
              </div>

              <div className="max-h-[calc(80vh-160px)] overflow-y-auto">
                {filtered.length === 0 ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">No conversations found.</div>
                ) : (
                  filtered.map((conversation) => {
                    const isSelected = conversation.id === activeConvo.id;

                    return (
                      <button
                        key={conversation.id}
                        type="button"
                        onClick={() => {
                          setSelected(conversation.id);
                          setMobileView('chat');
                        }}
                        className={`flex w-full items-center gap-3 border-b border-border px-3 py-3.5 text-left transition-all last:border-b-0 sm:px-4 ${
                          isSelected ? 'bg-primary/5 shadow-inner' : 'bg-transparent hover:bg-slate-100/80'
                        }`}
                      >
                        <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 text-sm font-bold text-primary ring-2 ring-white">
                          {conversation.avatar}
                          {conversation.online && (
                            <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-sm font-semibold text-foreground">{conversation.supplier}</p>
                            <span className="text-[10px] text-muted-foreground">{conversation.time}</span>
                          </div>
                          <div className="mt-1 flex items-center justify-between gap-2">
                            <p className="truncate text-xs text-muted-foreground">{conversation.lastMessage}</p>
                            {conversation.unread > 0 && (
                              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[9px] font-bold text-primary-foreground">
                                {conversation.unread}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </aside>

            <main className={`${mobileView === 'chat' ? 'flex' : 'hidden'} min-h-[60vh] flex-col bg-white lg:flex`}>
              <header className="flex items-center justify-between border-b border-border bg-gradient-to-r from-white via-slate-50 to-white px-4 py-4 sm:px-5">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-muted-foreground hover:bg-muted lg:hidden"
                    onClick={() => {
                      setMobileView('inbox');
                      setSelected(conversations[0].id);
                    }}
                    aria-label="Back to messages"
                  >
                    <ArrowLeft size={16} />
                  </button>

                  <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary ring-2 ring-white shadow-sm">
                    {activeConvo.avatar}
                    {activeConvo.online && (
                      <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500" />
                    )}
                  </div>

                  <div>
                    <p className="text-base font-bold text-foreground">{activeConvo.supplier}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {activeConvo.online ? 'Online now' : 'Usually replies within a few hours'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button type="button" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition hover:bg-muted hover:text-foreground">
                    <Phone size={17} />
                  </button>
                  <button type="button" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition hover:bg-muted hover:text-foreground">
                    <Video size={17} />
                  </button>
                  <button type="button" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition hover:bg-muted hover:text-foreground">
                    <MoreHorizontal size={17} />
                  </button>
                </div>
              </header>

              <div className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.08),_transparent_60%)] px-3 py-5 sm:px-5">
                <div className="mx-auto max-w-3xl space-y-4">
                  {activeMessages.map((message) => (
                    <div key={message.id} className={`flex ${message.from === 'me' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-[24px] px-4 py-3 shadow-sm ${
                        message.from === 'me'
                          ? 'rounded-br-md bg-primary text-primary-foreground'
                          : 'rounded-bl-md border border-border bg-white text-foreground'
                      }`}>
                        <p className="text-[15px] leading-relaxed">{message.text}</p>
                        <div className={`mt-1.5 flex items-center justify-end gap-1 text-[10px] ${message.from === 'me' ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                          <span>{message.time}</span>
                          {message.from === 'me' && (message.read ? <CheckCheck size={12} /> : <Check size={12} />)}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={endRef} />
                </div>
              </div>

              <div className="border-t border-border bg-white p-3 sm:p-4">
                <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-[24px] border border-border bg-background p-2.5 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
                  <button type="button" className="inline-flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground">
                    <Paperclip size={18} />
                  </button>
                  <button type="button" className="inline-flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground">
                    <Image size={18} />
                  </button>

                  <textarea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        sendMessage();
                      }
                    }}
                    rows={1}
                    placeholder="Write a message..."
                    className="max-h-28 min-h-[48px] flex-1 resize-none bg-transparent px-3 py-3 text-[15px] text-foreground outline-none placeholder:text-muted-foreground"
                  />

                  <button
                    type="button"
                    onClick={sendMessage}
                    disabled={!draft.trim()}
                    className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/20 transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
