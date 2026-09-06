import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { ArrowLeft, ArrowUpRight, Bell, Check, CheckCheck, Inbox, MessageSquare, Package, Search, Send, ShieldCheck, ShoppingBag, Star, Wallet } from 'lucide-react';
import './buyer-communications.css';

type Message = { text: string; own?: boolean; time: string };
type Conversation = { id: number; name: string; company: string; initials: string; color: string; topic: string; unread: boolean; starred: boolean; messages: Message[] };
const conversations: Conversation[] = [
  { id: 1, name: 'Kivu Coffee Co.', company: 'Coffee supplier · Bujumbura', initials: 'KC', color: 'peach', topic: 'Wholesale inquiry · Arabica coffee beans', unread: true, starred: false, messages: [{ text: 'Hello! Do you supply Arabica coffee in wholesale quantities?', own: true, time: '09:32' }, { text: 'Yes, our minimum order is 50 kg. How much would you like?', time: '09:35' }, { text: 'Could you quote 100 kg including delivery to Bujumbura?', own: true, time: '09:38' }, { text: 'Of course. I can prepare a quote with delivery included.', time: '09:41' }] },
  { id: 2, name: 'Kivu Craft Collective', company: 'Handmade goods · Kigali', initials: 'KC', color: 'blue', topic: 'Product inquiry · Woven baskets', unread: true, starred: true, messages: [{ text: 'Are the woven baskets available in different sizes?', own: true, time: '08:15' }, { text: 'Yes! We have small, medium, and large baskets. Which sizes would you like?', time: '08:20' }] },
  { id: 3, name: 'Safi Essentials', company: 'Household supplies · Gitega', initials: 'SE', color: 'green', topic: 'Delivery inquiry · Household supplies', unread: false, starred: false, messages: [{ text: 'Your order will be ready for collection on Friday.', time: 'Yesterday' }, { text: 'Thank you. Friday works for us.', own: true, time: 'Yesterday' }] },
  { id: 4, name: 'City Supplies', company: 'Office supplies · Ngozi', initials: 'CS', color: 'purple', topic: 'Product inquiry · Office supplies', unread: false, starred: false, messages: [{ text: 'Could you share your catalogue and minimum order quantity?', own: true, time: 'Yesterday' }] },
];
export const initialNotifications = [
  { id: 1, category: 'Orders', title: 'Your order has been confirmed', text: 'Kivu Coffee Co. is preparing your order of Arabica coffee beans.', time: '5 min ago', group: 'Today', unread: true, action: 'View update', icon: ShoppingBag, color: 'peach' },
  { id: 2, category: 'Messages', title: 'Kivu Coffee Co. replied to your inquiry', text: '“I can prepare a quote with delivery included.”', time: '18 min ago', group: 'Today', unread: true, action: 'View update', icon: MessageSquare, color: 'blue' },
  { id: 3, category: 'Deliveries', title: 'Your delivery is on its way', text: 'Your household supplies are ready for delivery. Check with your supplier for arrival details.', time: '1 hour ago', group: 'Today', unread: true, action: 'View update', icon: Package, color: 'peach' },
  { id: 4, category: 'Payments', title: 'Payment confirmed', text: 'A sample payment of BIF 245,000 has been recorded for your order.', time: '3 hours ago', group: 'Today', unread: false, action: 'View update', icon: Wallet, color: 'green' },
  { id: 5, category: 'Account', title: 'Your buyer profile is ready', text: 'Keep your delivery address and contact information up to date for your next order.', time: 'Yesterday', group: 'Earlier', unread: false, action: 'View update', icon: ShieldCheck, color: 'purple' },
];

function Empty({ title, text }: { title: string; text: string }) {
  return <div className="bc-empty"><span><Inbox size={28} /></span><h3>{title}</h3><p>{text}</p></div>;
}

export function BuyerMessages() {
  const [items, setItems] = useState(conversations);
  const [selected, setSelected] = useState<number | null>(1);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [filter, setFilter] = useState('All');
  const [query, setQuery] = useState('');
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const sample = true;
  const bottom = useRef<HTMLDivElement>(null);
  const active = sample ? items.find(item => item.id === selected) : undefined;
  const unread = sample ? items.filter(item => item.unread).length : 0;
  const visible = sample ? items.filter(item => (filter !== 'Unread' || item.unread) && (filter !== 'Starred' || item.starred) && `${item.name} ${item.company} ${item.topic}`.toLowerCase().includes(query.toLowerCase())) : [];
  useEffect(() => { bottom.current?.scrollIntoView({ block: 'nearest' }); }, [selected, active?.messages.length]);
  const open = (id: number) => { setSelected(id); setMobileOpen(true); setItems(old => old.map(item => item.id === id ? { ...item, unread: false } : item)); };
  const send = (event: React.FormEvent) => {
    event.preventDefault();
    if (!active || !drafts[active.id]?.trim()) return;
    const text = drafts[active.id].trim();
    setItems(old => old.map(item => item.id === active.id ? { ...item, unread: false, messages: [...item.messages, { text, own: true, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }] } : item));
    setDrafts(old => ({ ...old, [active.id]: '' }));
  };
  return <div className="bc-comms bc-messenger">
    <div className={`bc-inbox ${mobileOpen ? 'bc-chat-open' : ''}`}>
      <section className="bc-conversations" aria-label="Conversations"><div className="bc-inbox-heading"><h3>Chats <span className="bc-count">{unread}</span></h3><MessageSquare size={20} /></div><label className="bc-search"><Search size={17} /><input aria-label="Search conversations" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search suppliers or products" /></label><div className="bc-tabs">{['All', 'Unread', 'Starred'].map(tab => <button key={tab} aria-pressed={filter === tab} className={filter === tab ? 'active' : ''} onClick={() => setFilter(tab)}>{tab}{tab === 'Unread' && unread > 0 && <span>{unread}</span>}</button>)}</div><div className="bc-conversation-list">{visible.map(item => <button className={`bc-conversation ${selected === item.id ? 'selected' : ''}`} key={item.id} onClick={() => open(item.id)} aria-pressed={selected === item.id}><span className={`bc-avatar ${item.color}`}>{item.initials}</span><span className="bc-conversation-body"><span className="bc-conversation-top"><strong>{item.name}</strong><small>{item.messages[item.messages.length - 1]?.time}</small></span><span className="bc-company">{item.company.split(' · ')[0]}</span><span className="bc-snippet">{item.messages[item.messages.length - 1]?.own ? 'You: ' : ''}{item.messages[item.messages.length - 1]?.text}</span></span>{item.unread && <span className="bc-unread-dot" />}</button>)}{!visible.length && <Empty title={sample ? 'No conversations found' : 'Your next connection starts here'} text={sample ? 'Try another search or inbox filter.' : 'Supplier replies will appear here when messaging is connected.'} />}</div><div className="bc-inbox-footer"><ShieldCheck size={15} /> Sample inbox · replies are not delivered</div></section>
      <section className="bc-thread" aria-label="Conversation">{active ? <><header className="bc-thread-header"><button className="bc-icon-button bc-mobile-back" aria-label="Back to inbox" onClick={() => setMobileOpen(false)}><ArrowLeft size={20} /></button><span className={`bc-avatar ${active.color}`}>{active.initials}</span><div className="bc-thread-person"><h3>{active.name}</h3><p>{active.company}</p></div><button className={`bc-icon-button ${active.starred ? 'bc-starred' : ''}`} aria-label={active.starred ? 'Unstar conversation' : 'Star conversation'} aria-pressed={active.starred} onClick={() => setItems(old => old.map(item => item.id === active.id ? { ...item, starred: !item.starred } : item))}><Star size={20} fill={active.starred ? 'currentColor' : 'none'} /></button></header><div className="bc-topic"><Package size={17} /><span>{active.topic}</span></div><div className="bc-message-history" role="log" aria-label="Message history" aria-live="polite"><div className="bc-date-divider"><span>Sample conversation</span></div>{active.messages.map((message, index) => <div key={index} className={`bc-message ${message.own ? 'own' : ''}`}><div className="bc-bubble">{message.text}</div><span className="bc-message-time">{message.own ? 'You · ' : ''}{message.time}{message.own && <Check size={12} />}</span></div>)}<div ref={bottom} /></div><form className="bc-composer" onSubmit={send}><div className="bc-quick-replies"><span>Quick replies</span>{['Thank you for the update.', 'Could you share a quote?'].map(reply => <button type="button" key={reply} onClick={() => setDrafts(old => ({ ...old, [active.id]: reply }))}>{reply}</button>)}</div><div className="bc-compose-box"><textarea aria-label="Write a reply" placeholder={`Reply to ${active.name.split(' ')[0]}…`} maxLength={4000} rows={1} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} value={drafts[active.id] || ''} onChange={e => setDrafts(old => ({ ...old, [active.id]: e.target.value }))} /><div><button aria-label="Send sample reply" title="Send sample reply" className="bc-button primary" disabled={!drafts[active.id]?.trim()} type="submit"><Send size={19} /></button></div></div></form></> : <Empty title="A space for every conversation" text="Select a supplier to view your messages and keep the conversation going." />}</section>
    </div>
  </div>;
}

export function BuyerNotifications({ items, setItems }: { items: typeof initialNotifications; setItems: Dispatch<SetStateAction<typeof initialNotifications>> }) {
  const [filter, setFilter] = useState('All activity');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [query, setQuery] = useState('');
  const [sample, setSample] = useState(true);
  const [detail, setDetail] = useState<number | null>(null);
  const unread = sample ? items.filter(item => item.unread).length : 0;
  const visible = sample ? items.filter(item => (filter === 'All activity' || item.category === filter) && (!unreadOnly || item.unread) && `${item.title} ${item.text}`.toLowerCase().includes(query.toLowerCase())) : [];
  return <div className="bc-comms bc-notifications buyer-notification-center">
    <div className="bn-heading"><div><div className="bn-kicker"><Bell size={14} /> ACTIVITY CENTER</div><h2>Notifications<span>{unread}</span></h2><p>Your orders, conversations, and delivery updates. All in one place.</p></div><button className="bn-mark-all" disabled={!unread} onClick={() => setItems(old => old.map(item => ({ ...item, unread: false })))}><CheckCheck size={17} /> Mark all as read</button></div>
    <section className="bn-panel" aria-label="Notifications">
      <div className="bn-toolbar"><div className="bn-view-switch"><button aria-pressed={!unreadOnly} className={!unreadOnly ? 'active' : ''} onClick={() => setUnreadOnly(false)}>All updates</button><button aria-pressed={unreadOnly} className={unreadOnly ? 'active' : ''} onClick={() => setUnreadOnly(true)}>Unread <span>{unread}</span></button></div><label className="bc-search"><Search size={17} /><input aria-label="Search notifications" placeholder="Search notifications…" value={query} onChange={e => setQuery(e.target.value)} /></label></div>
      <div className="bn-categories" aria-label="Notification categories">{['All activity', 'Orders', 'Messages', 'Deliveries', 'Payments', 'Account'].map(category => <button key={category} className={filter === category ? 'active' : ''} aria-pressed={filter === category} onClick={() => { setFilter(category); setDetail(null); }}>{category === 'All activity' ? 'Everything' : category}</button>)}</div>
      {['Today', 'Earlier'].map(group => { const groupItems = visible.filter(item => item.group === group); return groupItems.length > 0 && <section key={group} className="bn-group" aria-label={group}><div className="bn-group-label">{group}<span>{groupItems.length} updates</span></div>{groupItems.map(item => <article key={item.id} className={`bn-item ${item.unread ? 'unread' : ''}`}><span className={`bn-event-icon ${item.color}`}><item.icon size={20} strokeWidth={1.7} /></span><div className="bn-item-content"><div className="bn-item-title"><h3>{item.title}</h3>{item.unread && <span className="bn-new" aria-label="Unread" />}</div><p>{item.text}</p><div className="bn-item-bottom"><span className="bn-category">{item.category}</span><span className="bn-time">{item.time}</span><button className="bn-item-action" aria-expanded={detail === item.id} onClick={() => { setDetail(detail === item.id ? null : item.id); setItems(old => old.map(n => n.id === item.id ? { ...n, unread: false } : n)); }}>{detail === item.id ? 'Close details' : item.action}<ArrowUpRight size={13} /></button></div>{detail === item.id && <div className="bc-detail" role="status">This is sample {item.category.toLowerCase()} activity. Live details will be available when notifications are connected to your account.</div>}</div><button className={`bn-read-button ${item.unread ? '' : 'is-read'}`} title={item.unread ? 'Mark as read' : 'Mark as unread'} aria-label={`${item.unread ? 'Mark as read' : 'Mark as unread'}: ${item.title}`} onClick={() => setItems(old => old.map(n => n.id === item.id ? { ...n, unread: !n.unread } : n))}><Check size={16} /></button></article>)}</section>; })}
      {!visible.length && <Empty title={unreadOnly ? 'You’re all caught up' : 'No updates to show'} text={query ? 'Try a different search or category.' : 'Your next order update will appear here.'} />}
      <footer className="bn-footer"><span><span className="bn-preview-indicator" /> Design preview · Sample activity</span><button onClick={() => { setSample(!sample); setDetail(null); }}>{sample ? 'Preview empty state' : 'Show sample activity'}</button></footer>
    </section><p className="bn-endnote"><ShieldCheck size={14} /> Only updates about your purchases. Always in your control.</p>
  </div>;
}
