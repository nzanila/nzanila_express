import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowUpRight, Bell, Check, CheckCheck, Inbox, MessageSquare, Package, Search, Send, ShieldCheck, ShoppingBag, Star, Wallet } from 'lucide-react';
import './seller-communications.css';

type Message = { text: string; own?: boolean; time: string };
type Conversation = { id: number; name: string; company: string; initials: string; color: string; topic: string; unread: boolean; starred: boolean; messages: Message[] };
const conversations: Conversation[] = [
  { id: 1, name: 'Aline Nkurunziza', company: 'Imena Market · Bujumbura', initials: 'AN', color: 'peach', topic: 'Wholesale inquiry · Arabica coffee beans', unread: true, starred: false, messages: [{ text: 'Hello! I’m interested in your Arabica coffee beans for our shop. Do you supply wholesale quantities?', time: '09:32' }, { text: 'Hello Aline, thank you for reaching out. Yes, our minimum wholesale order is 50 kg. How much are you looking for?', own: true, time: '09:35' }, { text: 'We would like to start with 100 kg. Could you share your best price and delivery options to Bujumbura?', time: '09:41' }] },
  { id: 2, name: 'Eric Mugisha', company: 'Kivu Trading · Kigali', initials: 'EM', color: 'blue', topic: 'Product inquiry · Woven baskets', unread: true, starred: true, messages: [{ text: 'Good morning! Are the woven baskets available in different sizes? We’re looking to order 200 pieces.', time: '08:20' }] },
  { id: 3, name: 'Grace Uwimana', company: 'Green Table · Gitega', initials: 'GU', color: 'green', topic: 'Delivery inquiry · Fresh produce', unread: false, starred: false, messages: [{ text: 'Thank you for the update. We can collect the order on Friday.', time: 'Yesterday' }, { text: 'That works for us. We’ll have everything ready for collection.', own: true, time: 'Yesterday' }] },
  { id: 4, name: 'Patrick Niyongabo', company: 'City Supplies · Ngozi', initials: 'PN', color: 'purple', topic: 'Wholesale inquiry · Office supplies', unread: false, starred: false, messages: [{ text: 'Could you share the available colors and minimum order quantity?', time: 'Yesterday' }] },
];
const initialNotifications = [
  { id: 1, category: 'Orders', title: 'A new order is ready for your attention', text: 'Imena Market placed a wholesale order for 100 kg of Arabica coffee beans.', time: '5 min ago', group: 'Today', unread: true, action: 'Review order', icon: ShoppingBag, color: 'peach' },
  { id: 2, category: 'Messages', title: 'Aline sent you a message', text: '“Could you share your best price and delivery options to Bujumbura?”', time: '18 min ago', group: 'Today', unread: true, action: 'Open conversation', icon: MessageSquare, color: 'blue' },
  { id: 3, category: 'Inventory', title: 'Your woven baskets are running low', text: 'Only 8 pieces remain. Review your stock to keep this product available to buyers.', time: '1 hour ago', group: 'Today', unread: true, action: 'Review stock', icon: Package, color: 'peach' },
  { id: 4, category: 'Payments', title: 'Payment received', text: 'A sample payment of BIF 245,000 has been recorded for your completed order.', time: '3 hours ago', group: 'Today', unread: false, action: 'View payment', icon: Wallet, color: 'green' },
  { id: 5, category: 'Account', title: 'Your store profile is looking good', text: 'Your business details are complete. Keep your contact information up to date so buyers can reach you.', time: 'Yesterday', group: 'Earlier', unread: false, action: 'View profile', icon: ShieldCheck, color: 'purple' },
];

function Empty({ title, text }: { title: string; text: string }) {
  return <div className="sc-empty"><span><Inbox size={28} /></span><h3>{title}</h3><p>{text}</p></div>;
}

export function MessagesPage() {
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
  return <div className="sc-comms sc-messenger">
    <div className={`sc-inbox ${mobileOpen ? 'sc-chat-open' : ''}`}>
      <section className="sc-conversations" aria-label="Conversations"><div className="sc-inbox-heading"><h3>Chats <span className="sc-count">{unread}</span></h3><MessageSquare size={20} /></div><label className="sc-search"><Search size={17} /><input aria-label="Search conversations" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search buyers or products" /></label><div className="sc-tabs">{['All', 'Unread', 'Starred'].map(tab => <button key={tab} aria-pressed={filter === tab} className={filter === tab ? 'active' : ''} onClick={() => setFilter(tab)}>{tab}{tab === 'Unread' && unread > 0 && <span>{unread}</span>}</button>)}</div><div className="sc-conversation-list">{visible.map(item => <button className={`sc-conversation ${selected === item.id ? 'selected' : ''}`} key={item.id} onClick={() => open(item.id)} aria-pressed={selected === item.id}><span className={`sc-avatar ${item.color}`}>{item.initials}</span><span className="sc-conversation-body"><span className="sc-conversation-top"><strong>{item.name}</strong><small>{item.messages[item.messages.length - 1]?.time}</small></span><span className="sc-company">{item.company.split(' · ')[0]}</span><span className="sc-snippet">{item.messages[item.messages.length - 1]?.own ? 'You: ' : ''}{item.messages[item.messages.length - 1]?.text}</span></span>{item.unread && <span className="sc-unread-dot" />}</button>)}{!visible.length && <Empty title={sample ? 'No conversations found' : 'Your next connection starts here'} text={sample ? 'Try another search or inbox filter.' : 'Buyer inquiries will appear here when messaging is connected.'} />}</div><div className="sc-inbox-footer"><ShieldCheck size={15} /> Sample inbox · replies are not delivered</div></section>
      <section className="sc-thread" aria-label="Conversation">{active ? <><header className="sc-thread-header"><button className="sc-icon-button sc-mobile-back" aria-label="Back to inbox" onClick={() => setMobileOpen(false)}><ArrowLeft size={20} /></button><span className={`sc-avatar ${active.color}`}>{active.initials}</span><div className="sc-thread-person"><h3>{active.name}</h3><p>{active.company}</p></div><button className={`sc-icon-button ${active.starred ? 'sc-starred' : ''}`} aria-label={active.starred ? 'Unstar conversation' : 'Star conversation'} aria-pressed={active.starred} onClick={() => setItems(old => old.map(item => item.id === active.id ? { ...item, starred: !item.starred } : item))}><Star size={20} fill={active.starred ? 'currentColor' : 'none'} /></button></header><div className="sc-topic"><Package size={17} /><span>{active.topic}</span></div><div className="sc-message-history" role="log" aria-label="Message history" aria-live="polite"><div className="sc-date-divider"><span>Sample conversation</span></div>{active.messages.map((message, index) => <div key={index} className={`sc-message ${message.own ? 'own' : ''}`}><div className="sc-bubble">{message.text}</div><span className="sc-message-time">{message.own ? 'You · ' : ''}{message.time}{message.own && <Check size={12} />}</span></div>)}<div ref={bottom} /></div><form className="sc-composer" onSubmit={send}><div className="sc-quick-replies"><span>Quick replies</span>{['Thank you for your inquiry.', 'What quantity do you need?'].map(reply => <button type="button" key={reply} onClick={() => setDrafts(old => ({ ...old, [active.id]: reply }))}>{reply}</button>)}</div><div className="sc-compose-box"><textarea aria-label="Write a reply" placeholder={`Reply to ${active.name.split(' ')[0]}…`} maxLength={4000} rows={1} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} value={drafts[active.id] || ''} onChange={e => setDrafts(old => ({ ...old, [active.id]: e.target.value }))} /><div><button aria-label="Send sample reply" title="Send sample reply" className="sc-button primary" disabled={!drafts[active.id]?.trim()} type="submit"><Send size={19} /></button></div></div></form></> : <Empty title="A space for every conversation" text="Select a buyer to view their inquiry and keep the conversation going." />}</section>
    </div>
  </div>;
}

export function NotificationsPage() {
  const [items, setItems] = useState(initialNotifications);
  const [filter, setFilter] = useState('All activity');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [query, setQuery] = useState('');
  const [sample, setSample] = useState(true);
  const [detail, setDetail] = useState<number | null>(null);
  const unread = sample ? items.filter(item => item.unread).length : 0;
  const visible = sample ? items.filter(item => (filter === 'All activity' || item.category === filter) && (!unreadOnly || item.unread) && `${item.title} ${item.text}`.toLowerCase().includes(query.toLowerCase())) : [];
  return <div className="sc-comms sc-notifications notification-center">
    <div className="nc-heading"><div><div className="nc-kicker"><Bell size={14} /> ACTIVITY CENTER</div><h2>Notifications<span>{unread}</span></h2><p>Your orders, conversations, and store updates. All in one place.</p></div><button className="nc-mark-all" disabled={!unread} onClick={() => setItems(old => old.map(item => ({ ...item, unread: false })))}><CheckCheck size={17} /> Mark all as read</button></div>
    <section className="nc-panel" aria-label="Notifications">
      <div className="nc-toolbar"><div className="nc-view-switch"><button aria-pressed={!unreadOnly} className={!unreadOnly ? 'active' : ''} onClick={() => setUnreadOnly(false)}>All updates</button><button aria-pressed={unreadOnly} className={unreadOnly ? 'active' : ''} onClick={() => setUnreadOnly(true)}>Unread <span>{unread}</span></button></div><label className="sc-search"><Search size={17} /><input aria-label="Search notifications" placeholder="Search notifications…" value={query} onChange={e => setQuery(e.target.value)} /></label></div>
      <div className="nc-categories" aria-label="Notification categories">{['All activity', 'Orders', 'Messages', 'Inventory', 'Payments', 'Account'].map(category => <button key={category} className={filter === category ? 'active' : ''} aria-pressed={filter === category} onClick={() => { setFilter(category); setDetail(null); }}>{category === 'All activity' ? 'Everything' : category}</button>)}</div>
      {['Today', 'Earlier'].map(group => { const groupItems = visible.filter(item => item.group === group); return groupItems.length > 0 && <section key={group} className="nc-group" aria-label={group}><div className="nc-group-label">{group}<span>{groupItems.length} updates</span></div>{groupItems.map(item => <article key={item.id} className={`nc-item ${item.unread ? 'unread' : ''}`}><span className={`nc-event-icon ${item.color}`}><item.icon size={20} strokeWidth={1.7} /></span><div className="nc-item-content"><div className="nc-item-title"><h3>{item.title}</h3>{item.unread && <span className="nc-new" aria-label="Unread" />}</div><p>{item.text}</p><div className="nc-item-bottom"><span className="nc-category">{item.category}</span><span className="nc-time">{item.time}</span><button className="nc-item-action" aria-expanded={detail === item.id} onClick={() => { setDetail(detail === item.id ? null : item.id); setItems(old => old.map(n => n.id === item.id ? { ...n, unread: false } : n)); }}>{detail === item.id ? 'Close details' : item.action}<ArrowUpRight size={13} /></button></div>{detail === item.id && <div className="sc-detail" role="status">This is sample {item.category.toLowerCase()} activity. Live details will be available when notifications are connected to your store.</div>}</div><button className={`nc-read-button ${item.unread ? '' : 'is-read'}`} title={item.unread ? 'Mark as read' : 'Mark as unread'} aria-label={`${item.unread ? 'Mark as read' : 'Mark as unread'}: ${item.title}`} onClick={() => setItems(old => old.map(n => n.id === item.id ? { ...n, unread: !n.unread } : n))}><Check size={16} /></button></article>)}</section>; })}
      {!visible.length && <Empty title={unreadOnly ? 'You’re all caught up' : 'No updates to show'} text={query ? 'Try a different search or category.' : 'Your next store update will appear here.'} />}
      <footer className="nc-footer"><span><span className="nc-preview-indicator" /> Design preview · Sample activity</span><button onClick={() => { setSample(!sample); setDetail(null); }}>{sample ? 'Preview empty state' : 'Show sample activity'}</button></footer>
    </section><p className="nc-endnote"><ShieldCheck size={14} /> Only updates about your business. Always in your control.</p>
  </div>;
}
