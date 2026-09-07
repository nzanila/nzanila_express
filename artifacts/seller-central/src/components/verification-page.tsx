import { useState, useEffect } from 'react';
import { Shield, Upload, X, Clock, CheckCircle, AlertTriangle, Ban, FileText, Lock } from 'lucide-react';
import { refreshVerificationStatus } from '../lib/verification-status';
import { useLocale } from '../lib/i18n/locale-context';

const API_BASE = (import.meta as any).env?.VITE_API_URL || 'https://nzanila-api-server.nzanilaexpress.workers.dev';

function authHeaders(extra: Record<string, string> = {}) {
  const token = localStorage.getItem('sc_token');
  return token ? { ...extra, Authorization: `Bearer ${token}` } : extra;
}

type VerificationStatus = 'not_submitted' | 'pending' | 'approved' | 'rejected' | 'suspended';

type SubmittedDoc = { id: number; docType: string; fileName: string | null; uploadedAt: string };

type VerificationState = {
  status: VerificationStatus;
  verified: boolean;
  submittedAt: string | null;
  submissionNote: string | null;
  reviewNote: string | null;
  reviewedAt: string | null;
  documents: SubmittedDoc[];
};

// Every slot is optional on purpose: an informal trader has no RC number, a registered
// company does. One document of any kind is enough to submit.
const DOC_SLOTS = [
  { type: 'national_id', label: 'National ID', hint: 'Your national identity card' },
  { type: 'passport', label: 'Passport', hint: 'The photo page of your passport' },
  { type: 'business_registration', label: 'Business registration', hint: 'RC number certificate, if you have one' },
  { type: 'tax_certificate', label: 'Tax certificate', hint: 'NIF document, if you have one' },
  { type: 'proof_of_address', label: 'Proof of address', hint: 'A bill or lease showing your shop address' },
  { type: 'other', label: 'Anything else', hint: 'Any other document that proves your business' },
] as const;

const MAX_FILE_BYTES = 5 * 1024 * 1024;

const STATUS_VIEW: Record<VerificationStatus, { label: string; tone: string; icon: typeof Shield; blurb: string }> = {
  not_submitted: { label: 'Not submitted', tone: 'bg-gray-100 text-gray-700', icon: Shield, blurb: 'Send your documents to get the verified badge on your store.' },
  pending: { label: 'Under review', tone: 'bg-blue-100 text-blue-700', icon: Clock, blurb: 'Your documents are with our team. We will let you know as soon as there is a decision.' },
  approved: { label: 'Verified', tone: 'bg-emerald-100 text-emerald-700', icon: CheckCircle, blurb: 'Your business is verified. Buyers can see the verified badge on your store.' },
  rejected: { label: 'Needs changes', tone: 'bg-orange-100 text-orange-700', icon: AlertTriangle, blurb: 'We could not verify your business with what was sent. Read the note below and send again.' },
  suspended: { label: 'Suspended', tone: 'bg-red-100 text-red-700', icon: Ban, blurb: 'This account is suspended. Please contact support — resubmitting documents will not lift it.' },
};

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read that file.'));
    reader.readAsDataURL(file);
  });
}

export function VerificationPage() {
  const { tr } = useLocale();
  const [state, setState] = useState<VerificationState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState('');
  // docType -> the file the seller attached for that slot
  const [files, setFiles] = useState<Record<string, { dataUrl: string; name: string }>>({});
  const [resubmitting, setResubmitting] = useState(false);

  const load = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/seller/verification`, { headers: authHeaders() });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Could not load your verification status');
      setState(payload);
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load your verification status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const attach = async (docType: string, file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) { setError(`${file.name} is larger than 5 MB. Please send a smaller file.`); return; }
    try {
      setError('');
      const dataUrl = await readFileAsDataUrl(file);
      setFiles(current => ({ ...current, [docType]: { dataUrl, name: file.name } }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not read that file.');
    }
  };

  const remove = (docType: string) => setFiles(current => {
    const next = { ...current };
    delete next[docType];
    return next;
  });

  const attachedCount = Object.keys(files).length;

  const submit = async () => {
    if (!attachedCount || saving) return;
    setSaving(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE}/api/seller/verification`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          note: note.trim() || undefined,
          documents: Object.entries(files).map(([docType, file]) => ({ docType, fileUrl: file.dataUrl, fileName: file.name })),
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        // A 403 means the account was decided on while this page was open (approved or
        // suspended). Reload so the seller sees the state that caused the refusal instead
        // of a form the server will keep rejecting.
        if (response.status === 403) { refreshVerificationStatus(); await load(); }
        throw new Error(payload.error || 'Could not send your documents');
      }
      setFiles({});
      setNote('');
      setResubmitting(false);
      // The seller is now 'pending', so the sidebar's "action needed" badge should clear.
      refreshVerificationStatus();
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not send your documents');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="min-h-full bg-[#f5f5f7] p-4 md:p-8"><div className="mx-auto max-w-3xl"><div className="h-8 w-56 animate-pulse rounded bg-gray-200" /><div className="mt-6 h-64 animate-pulse rounded-xl bg-gray-100" /></div></div>;
  }

  const status: VerificationStatus = state?.status ?? 'not_submitted';
  const view = STATUS_VIEW[status] ?? STATUS_VIEW.not_submitted;
  const StatusIcon = view.icon;
  // Approved and suspended sellers have nothing to send; pending sellers can still
  // replace their documents if they realise something was wrong.
  const canSubmit = status !== 'approved' && status !== 'suspended';
  const showForm = canSubmit && (status === 'not_submitted' || status === 'rejected' || resubmitting);

  return (
    <div className="min-h-full bg-[#f5f5f7] p-4 md:p-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-orange-600">{tr('sc.account')}</p>
          <h2 className="mt-1 text-2xl font-bold text-gray-900">{tr('sc.business-verification')}</h2>
          <p className="mt-1 text-sm text-gray-500">{tr('sc.send-whichever-documents-you-have-verified-s')}</p>
        </div>

        {error && <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}

        {/* Approved is the state sellers care about most, so it gets its own banner rather
            than only a small pill they have to hunt for. */}
        {status === 'approved' && (
          <section className="mb-5 flex items-start gap-4 rounded-2xl border border-emerald-300 bg-emerald-50 p-5">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-emerald-600 text-white">
              <CheckCircle size={26} />
            </span>
            <div className="min-w-0">
              <p className="text-lg font-bold text-emerald-900">{tr('sc.your-business-is-verified')}</p>
              <p className="mt-1 text-sm text-emerald-800">
                Buyers see the verified badge on your store and your products. Your documents are locked in — contact support if anything needs to change.
              </p>
            </div>
          </section>
        )}

        {/* Current status */}
        <section className="mb-5 rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex flex-wrap items-center gap-3">
            <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${view.tone}`}>
              <StatusIcon size={14} /> {view.label}
            </span>
            {state?.submittedAt && <span className="text-xs text-gray-500">Sent {new Date(state.submittedAt).toLocaleDateString()}</span>}
          </div>
          <p className="mt-3 text-sm text-gray-600">{view.blurb}</p>

          {/* The reviewer's note, verbatim — this is what tells the seller what to fix. */}
          {state?.reviewNote && (
            <div className={`mt-4 rounded-xl border p-4 ${status === 'approved' ? 'border-emerald-200 bg-emerald-50' : 'border-orange-200 bg-orange-50'}`}>
              <p className="text-xs font-bold uppercase tracking-wide text-gray-600">{tr('sc.message-from-our-team')}</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-gray-900">{state.reviewNote}</p>
              {state.reviewedAt && <p className="mt-2 text-[11px] text-gray-500">Reviewed {new Date(state.reviewedAt).toLocaleString()}</p>}
            </div>
          )}

          {/* What is currently on file */}
          {!!state?.documents.length && (
            <div className="mt-4 border-t border-gray-100 pt-4">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500">{tr('sc.documents-on-file')}</p>
              <ul className="mt-2 space-y-1.5">
                {state.documents.map(doc => (
                  <li key={doc.id} className="flex items-center gap-2 text-sm text-gray-700">
                    <FileText size={14} className="shrink-0 text-gray-400" />
                    <span className="font-medium">{DOC_SLOTS.find(slot => slot.type === doc.docType)?.label || 'Document'}</span>
                    {doc.fileName && <span className="min-w-0 truncate text-xs text-gray-500">· {doc.fileName}</span>}
                  </li>
                ))}
              </ul>
              {/* The server refuses a submission once approved; say so here rather than
                  leaving the missing buttons unexplained. */}
              {status === 'approved' && (
                <p className="mt-3 flex items-center gap-1.5 text-xs text-gray-500">
                  <Lock size={12} className="shrink-0" />
                  These documents are locked because your business is verified. Contact support to change them.
                </p>
              )}
            </div>
          )}

          {status === 'pending' && !resubmitting && (
            <button type="button" onClick={() => setResubmitting(true)} className="mt-4 text-xs font-bold text-[#ff9900] hover:underline">{tr('sc.replace-my-documents')}</button>
          )}
        </section>

        {/* Upload form */}
        {showForm && (
          <section className="rounded-2xl border border-gray-200 bg-white p-5">
            <h3 className="font-bold text-gray-900">{status === 'rejected' ? 'Send your documents again' : 'Send your documents'}</h3>
            <p className="mt-1 text-sm text-gray-500">{tr('sc.upload-whichever-you-have-you-do-not-need-al')}</p>

            <div className="mt-5 space-y-3">
              {DOC_SLOTS.map(slot => {
                const attached = files[slot.type];
                return (
                  <div key={slot.type} className="rounded-xl border border-gray-200 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900">{slot.label} <span className="font-normal text-gray-400">· optional</span></p>
                        <p className="mt-0.5 text-xs text-gray-500">{slot.hint}</p>
                      </div>
                      {attached ? (
                        <div className="flex items-center gap-2">
                          <span className="max-w-[140px] truncate text-xs font-semibold text-emerald-700">{attached.name}</span>
                          <button type="button" onClick={() => remove(slot.type)} aria-label={`Remove ${slot.label}`} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100">
                            <X size={15} />
                          </button>
                        </div>
                      ) : (
                        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50">
                          <Upload size={14} />{tr('sc.choose-file')}<input
                            type="file"
                            accept="image/*,application/pdf"
                            className="hidden"
                            onChange={event => { void attach(slot.type, event.target.files?.[0]); event.target.value = ''; }}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <label className="mt-5 block">
              <span className="text-sm font-semibold text-gray-700">{tr('sc.tell-us-about-your-business')}<span className="font-normal text-gray-400">(optional)</span></span>
              <textarea
                value={note}
                onChange={event => setNote(event.target.value)}
                rows={3}
                maxLength={1000}
                placeholder="For example: I sell farm produce at Kamenge market. I have no RC number."
                className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#ff9900]"
              />
            </label>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void submit()}
                disabled={!attachedCount || saving}
                className="rounded-xl bg-[#ff9900] px-6 py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                {saving ? 'Sending…' : 'Send for review'}
              </button>
              <span className="text-xs text-gray-500">
                {attachedCount ? `${attachedCount} document${attachedCount === 1 ? '' : 's'} attached` : 'Attach at least one document'}
              </span>
              {resubmitting && status === 'pending' && (
                <button type="button" onClick={() => { setResubmitting(false); setFiles({}); }} className="text-xs font-semibold text-gray-500 hover:underline">{tr('sc.cancel')}</button>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
