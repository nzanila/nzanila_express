import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'wouter';
import { ArrowLeft, Upload, FileCheck, Shield, Clock, CheckCircle, AlertCircle, Camera, X } from 'lucide-react';
import { AppShell } from '@/components/marketplace-shell';
import { useAuth } from '@/lib/auth-context';

const API = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000' : '');

const ID_TYPES = [
  { value: 'national_id', label: 'National ID Card', icon: '🪪' },
  { value: 'passport', label: 'Passport', icon: '📘' },
  { value: 'business_license', label: 'Business License', icon: '📋' },
  { value: 'driver_license', label: "Driver's License", icon: '🚗' },
];

export function SellerVerificationPage() {
  const { user, session, refreshUser } = useAuth();
  const [, setLocation] = useLocation();
  const [verificationStatus, setVerificationStatus] = useState<string>('not_submitted');
  const [idType, setIdType] = useState('');
  const [idName, setIdName] = useState('');
  const [idDocumentUrl, setIdDocumentUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    fetch(`${API}/api/profiles/sellers/verification-status`, {
      headers: { 'Authorization': `Bearer ${session?.accessToken || ''}` },
    })
      .then(r => r.json())
      .then(data => {
        setVerificationStatus(data.verificationStatus || 'not_submitted');
        setIdType(data.idDocumentType || '');
        setIdName(data.idDocumentName || '');
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError('File must be under 5MB'); return; }
    
    setUploading(true);
    setError('');
    
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setIdDocumentUrl(base64);
      setIdName(file.name);
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!idType || !idDocumentUrl) {
      setError('Please select an ID type and upload your document');
      return;
    }
    setSaving(true);
    setError('');
    
    try {
      const res = await fetch(`${API}/api/profiles/sellers/verify-id`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.accessToken || ''}`,
        },
        body: JSON.stringify({
          idDocumentUrl,
          idDocumentType: idType,
          idDocumentName: idName,
        }),
      });
      
      if (!res.ok) throw new Error('Failed to submit');
      
      setVerificationStatus('under_review');
      setSuccess('ID document submitted for review!');
      setTimeout(() => setSuccess(''), 3000);
      await refreshUser();
    } catch {
      setError('Failed to submit ID document');
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <AppShell mode="supplier">
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell mode="supplier">
      <div className="bg-background px-3 py-4 sm:px-5 sm:py-8 lg:px-10 max-w-2xl mx-auto">
        <Link href="/supplier" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>

        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <Shield size={24} className="text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Seller Verification</h1>
              <p className="text-sm text-muted-foreground">Upload your ID to get verified</p>
            </div>
          </div>

          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3">
              <AlertCircle size={16} className="flex-shrink-0 text-red-600" />
              <p className="text-sm font-medium text-red-700">{error}</p>
            </div>
          )}
          {success && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-3">
              <CheckCircle size={16} className="flex-shrink-0 text-green-600" />
              <p className="text-sm font-medium text-green-700">{success}</p>
            </div>
          )}

          {/* Status display */}
          {verificationStatus === 'verified' && (
            <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4">
              <div className="flex items-center gap-3">
                <CheckCircle size={24} className="text-green-600" />
                <div>
                  <p className="font-semibold text-green-800">Verified Seller</p>
                  <p className="text-sm text-green-600">Your identity has been verified. Buyers will see a verified badge on your profile.</p>
                </div>
              </div>
            </div>
          )}

          {verificationStatus === 'under_review' && (
            <div className="mb-6 rounded-xl border border-yellow-200 bg-yellow-50 p-4">
              <div className="flex items-center gap-3">
                <Clock size={24} className="text-yellow-600" />
                <div>
                  <p className="font-semibold text-yellow-800">Under Review</p>
                  <p className="text-sm text-yellow-600">Your ID document has been submitted and is being reviewed. This usually takes 1-3 business days.</p>
                </div>
              </div>
            </div>
          )}

          {verificationStatus === 'needs_changes' && (
            <div className="mb-6 rounded-xl border border-orange-200 bg-orange-50 p-4">
              <div className="flex items-center gap-3">
                <AlertCircle size={24} className="text-orange-600" />
                <div>
                  <p className="font-semibold text-orange-800">Changes Needed</p>
                  <p className="text-sm text-orange-600">Please re-submit with a clearer photo of your ID document.</p>
                </div>
              </div>
            </div>
          )}

          {/* ID Upload Form */}
          {verificationStatus !== 'verified' && (
            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-semibold">Select ID Type</label>
                <div className="grid grid-cols-2 gap-3">
                  {ID_TYPES.map(type => (
                    <button
                      key={type.value}
                      onClick={() => setIdType(type.value)}
                      className={`flex items-center gap-3 rounded-xl border-2 p-3 text-left transition-all ${
                        idType === type.value
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/30'
                      }`}
                    >
                      <span className="text-2xl">{type.icon}</span>
                      <span className="text-sm font-medium">{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">Upload Document</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                
                {idDocumentUrl ? (
                  <div className="relative rounded-xl border border-border bg-card p-4">
                    <div className="flex items-center gap-3">
                      <FileCheck size={24} className="text-green-500" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{idName}</p>
                        <p className="text-xs text-muted-foreground">Document ready</p>
                      </div>
                      <button
                        onClick={() => { setIdDocumentUrl(''); setIdName(''); }}
                        className="rounded-lg p-1.5 text-red-500 hover:bg-red-50"
                      >
                        <X size={16} />
                      </button>
                    </div>
                    {idDocumentUrl.startsWith('data:image') && (
                      <div className="mt-3 rounded-lg overflow-hidden border border-border">
                        <img src={idDocumentUrl} alt="ID Document" className="max-h-48 w-full object-contain" />
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="flex w-full items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border p-8 text-center hover:border-primary/50 hover:bg-primary/5 transition-all"
                  >
                    {uploading ? (
                      <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    ) : (
                      <>
                        <Camera size={32} className="text-muted-foreground" />
                        <div>
                          <p className="text-sm font-semibold">Click to upload</p>
                          <p className="text-xs text-muted-foreground">Photo of your ID, passport, or business license</p>
                          <p className="text-xs text-muted-foreground mt-1">Max 5MB — JPG, PNG, or PDF</p>
                        </div>
                      </>
                    )}
                  </button>
                )}
              </div>

              <div className="rounded-xl bg-muted/50 p-4">
                <h4 className="text-sm font-semibold mb-2">Why verify your identity?</h4>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  <li>• Get a verified badge on your profile</li>
                  <li>• Build trust with buyers</li>
                  <li>• Your ID is kept private and secure</li>
                  <li>• Only reviewed by admin, never shared publicly</li>
                </ul>
              </div>

              <button
                onClick={handleSubmit}
                disabled={!idType || !idDocumentUrl || saving}
                className="h-12 w-full rounded-xl bg-primary text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
              >
                {saving ? 'Submitting…' : 'Submit for Verification'}
              </button>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
