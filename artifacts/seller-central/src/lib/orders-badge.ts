import { useState, useEffect } from 'react';

// The count of orders needing seller action, shared by the sidebar and bottom-nav
// badges so both read one fetch rather than two. Same statuses as the "Needs action"
// stat card on the Orders page itself.

const API_BASE = (import.meta as any).env?.VITE_API_URL || 'https://nzanila-api-server.nzanilaexpress.workers.dev';
const NEEDS_ACTION_STATUSES = ['new', 'confirmed', 'processing', 'preparing', 'ready'];

let current: number = 0;
let inFlight: Promise<void> | null = null;
const listeners = new Set<(count: number) => void>();

function publish(count: number) {
  current = count;
  listeners.forEach(listener => listener(count));
}

function load(): Promise<void> {
  const token = localStorage.getItem('sc_token');
  if (!token) { publish(0); return Promise.resolve(); }
  if (inFlight) return inFlight;
  inFlight = fetch(`${API_BASE}/api/supplier/orders`, { headers: { Authorization: `Bearer ${token}` } })
    .then(response => (response.ok ? response.json() : null))
    .then(data => {
      const orders = Array.isArray(data) ? data : [];
      publish(orders.filter((order: any) => NEEDS_ACTION_STATUSES.includes(order.status)).length);
    })
    // A background check that fails must not blank out a badge that was already correct.
    .catch(() => { /* leave the last known value alone */ })
    .finally(() => { inFlight = null; });
  return inFlight;
}

export function useOrdersNeedingAction(): number {
  const [count, setCount] = useState<number>(current);

  useEffect(() => {
    listeners.add(setCount);
    void load();
    const timer = window.setInterval(() => void load(), 20000);
    return () => { listeners.delete(setCount); window.clearInterval(timer); };
  }, []);

  return count;
}

// Called on sign-out so the next seller on this device does not inherit the last one's count.
export function clearOrdersBadgeCache() {
  publish(0);
}
