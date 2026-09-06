export type SearchEntry = { term: string; searchedAt: number; count: number };
const key = 'nzanila.product-searches.v1';
export function readSearchHistory(): SearchEntry[] {
  try {
    const entries = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(entries) ? entries.filter((entry) => typeof entry?.term === 'string' && Number.isFinite(entry.searchedAt) && entry.searchedAt > Date.now() - 90 * 86400000).slice(0, 20) : [];
  } catch { return []; }
}
export function recordSearch(value: string) {
  const term = value.trim().slice(0, 200);
  if (!term) return;
  try {
    const entries = readSearchHistory();
    const existing = entries.find((entry) => entry.term.toLowerCase() === term.toLowerCase());
    localStorage.setItem(key, JSON.stringify([{ term, searchedAt: Date.now(), count: (existing?.count || 0) + 1 }, ...entries.filter((entry) => entry !== existing)].slice(0, 20)));
    window.dispatchEvent(new Event('nzanila-search-history'));
  } catch { /* Browsing remains available when storage is disabled. */ }
}
export function clearSearchHistory() {
  try { localStorage.removeItem(key); } catch { /* Storage may be disabled. */ }
  window.dispatchEvent(new Event('nzanila-search-history'));
}
