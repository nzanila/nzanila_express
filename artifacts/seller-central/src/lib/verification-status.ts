import { useState, useEffect } from 'react';

// The seller's verification state, shared by the sidebar badge and the verify-now prompt
// so both read one fetch rather than two.
//
// It is a tiny store rather than a plain cache because the badge has to clear the moment
// the seller submits — the layout stays mounted, so a cache the page cannot notify would
// leave "Action needed" showing after the documents were sent.

const API_BASE = (import.meta as any).env?.VITE_API_URL || 'https://nzanila-api-server.nzanilaexpress.workers.dev';

export type VerificationStatus = 'not_submitted' | 'pending' | 'approved' | 'rejected' | 'suspended';

// Sellers in these states have something to do. 'pending' is waiting on us, and
// 'suspended' is not fixed by uploading anything, so neither is nagged.
export function needsVerificationAction(status: VerificationStatus | null): boolean {
  return status === 'not_submitted' || status === 'rejected';
}

let current: VerificationStatus | null = null;
let inFlight: Promise<void> | null = null;
const listeners = new Set<(status: VerificationStatus | null) => void>();

function publish(status: VerificationStatus | null) {
  current = status;
  listeners.forEach(listener => listener(status));
}

function load(): Promise<void> {
  const token = localStorage.getItem('sc_token');
  if (!token) { publish(null); return Promise.resolve(); }
  if (inFlight) return inFlight;
  inFlight = fetch(`${API_BASE}/api/seller/verification`, { headers: { Authorization: `Bearer ${token}` } })
    .then(response => (response.ok ? response.json() : null))
    .then(payload => publish(payload?.status ? (payload.status as VerificationStatus) : null))
    // A background check that fails must not put an error in front of the seller — the
    // verification page itself reports properly when they open it.
    .catch(() => { /* leave the last known value alone */ })
    .finally(() => { inFlight = null; });
  return inFlight;
}

export function useVerificationStatus(): VerificationStatus | null {
  const [status, setStatus] = useState<VerificationStatus | null>(current);

  useEffect(() => {
    listeners.add(setStatus);
    if (current === null) void load();
    return () => { listeners.delete(setStatus); };
  }, []);

  return status;
}

// Called after a submission so the sidebar badge reflects the new state without a reload.
export function refreshVerificationStatus() {
  void load();
}

// Called on sign-out so the next seller on this device does not inherit the last one's
// status.
export function clearVerificationStatusCache() {
  publish(null);
}
