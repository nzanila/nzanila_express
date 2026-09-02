import { useState } from 'react';
import { Link } from 'wouter';
import { 
  User, 
  Bell, 
  Truck, 
  ShieldCheck, 
  Lock, 
  AlertCircle, 
  Trash2,
  LogOut,
  ChevronRight,
  Phone,
  Globe,
  MapPin,
  PauseCircle,
  PlayCircle
} from 'lucide-react';
import { SellerWorkspace } from '@/components/seller-workspace';
import { useAuth } from '@/lib/auth-context';

export function SellerSettingsPage() {
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState({
    newOrderAlerts: true,
    messageAlerts: true,
    lowStockAlerts: true,
  });
  const [accountPaused, setAccountPaused] = useState(false);

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  const handleDeleteAccount = () => {
    if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      // Implement account deletion logic
      console.log('Account deletion requested');
    }
  };

  const verificationStatus = (user as any)?.verificationStatus || 'not_submitted';
  const isVerified = verificationStatus === 'verified';
  const businessName = (user as any)?.businessName || '';
  const businessDescription = (user as any)?.businessDescription || '';

  const healthItems = [
    { label: 'Account verified', done: isVerified },
    { label: 'Business name set', done: !!businessName },
    { label: 'Business description', done: !!businessDescription },
  ];
  const healthScore = Math.round((healthItems.filter((i) => i.done).length / healthItems.length) * 100);

  return (
    <SellerWorkspace title="Settings">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* ACCOUNT HEALTH */}
        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-gray-900">ACCOUNT HEALTH</h2>
            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${
              healthScore === 100 ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'
            }`}>
              {healthScore}% complete
            </span>
          </div>
          <div className="space-y-2">
            {healthItems.map((item) => (
              <div key={item.label} className="flex items-center justify-between py-1.5">
                <span className="text-sm text-gray-700">{item.label}</span>
                <span className={`text-xs font-bold ${item.done ? 'text-emerald-600' : 'text-orange-500'}`}>
                  {item.done ? '✓' : 'Add'}
                </span>
              </div>
            ))}
          </div>
          {healthScore < 100 && (
            <Link href="/seller/profile/edit" className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-[#ff6a00] hover:underline">
              Complete your profile →
            </Link>
          )}
        </section>

        {/* ACCOUNT SECTION */}
        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
            <User size={18} className="text-gray-600" />
            ACCOUNT
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div>
                <p className="font-medium text-gray-900">Name</p>
                <p className="text-sm text-gray-600">{user?.name || 'Not set'}</p>
              </div>
              <Link href="/settings/profile" className="text-[#ff6a00] text-sm font-medium hover:underline">
                Edit
              </Link>
            </div>

            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div>
                <p className="font-medium text-gray-900">Phone number</p>
                <p className="text-sm text-gray-600">{(user as any)?.phone || 'Not set'}</p>
              </div>
              <Link href="/settings/phone" className="text-[#ff6a00] text-sm font-medium hover:underline">
                Edit
              </Link>
            </div>

            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div>
                <p className="font-medium text-gray-900">Password or login method</p>
                <p className="text-sm text-gray-600">Last changed 30 days ago</p>
              </div>
              <Link href="/settings/password" className="text-[#ff6a00] text-sm font-medium hover:underline">
                Change
              </Link>
            </div>

            <div className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium text-gray-900">Preferred language</p>
                <p className="text-sm text-gray-600">English</p>
              </div>
              <Link href="/settings/language" className="text-[#ff6a00] text-sm font-medium hover:underline">
                Change
              </Link>
            </div>
          </div>
        </section>

        {/* NOTIFICATIONS SECTION */}
        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Bell size={18} className="text-gray-600" />
            NOTIFICATIONS
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div>
                <p className="font-medium text-gray-900">New order alerts</p>
                <p className="text-sm text-gray-600">Get notified when you receive new orders</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifications.newOrderAlerts}
                  onChange={(e) => setNotifications(prev => ({ ...prev, newOrderAlerts: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#ff6a00] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#ff6a00]" />
              </label>
            </div>

            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div>
                <p className="font-medium text-gray-900">Message alerts</p>
                <p className="text-sm text-gray-600">Get notified when buyers send messages</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifications.messageAlerts}
                  onChange={(e) => setNotifications(prev => ({ ...prev, messageAlerts: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#ff6a00] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#ff6a00]" />
              </label>
            </div>

            <div className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium text-gray-900">Low-stock alerts</p>
                <p className="text-sm text-gray-600">Get notified when products are running low</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifications.lowStockAlerts}
                  onChange={(e) => setNotifications(prev => ({ ...prev, lowStockAlerts: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#ff6a00] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#ff6a00]" />
              </label>
            </div>
          </div>
        </section>

        {/* DELIVERY SETTINGS SECTION */}
        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Truck size={18} className="text-gray-600" />
            DELIVERY SETTINGS
          </h2>
          
          <div className="space-y-4">
            <Link 
              href="/seller/profile/edit"
              className="flex items-center justify-between py-3 border-b border-gray-100 hover:bg-gray-50 rounded-lg px-2 -mx-2"
            >
              <div>
                <p className="font-medium text-gray-900">Delivery areas</p>
                <p className="text-sm text-gray-600">Manage where you deliver</p>
              </div>
              <ChevronRight size={18} className="text-gray-400" />
            </Link>

            <Link 
              href="/seller/profile/edit"
              className="flex items-center justify-between py-3 border-b border-gray-100 hover:bg-gray-50 rounded-lg px-2 -mx-2"
            >
              <div>
                <p className="font-medium text-gray-900">Delivery fee rules</p>
                <p className="text-sm text-gray-600">Set pricing for different areas</p>
              </div>
              <ChevronRight size={18} className="text-gray-400" />
            </Link>

            <Link 
              href="/seller/profile/edit"
              className="flex items-center justify-between py-3 hover:bg-gray-50 rounded-lg px-2 -mx-2"
            >
              <div>
                <p className="font-medium text-gray-900">Delivery hours</p>
                <p className="text-sm text-gray-600">Set your available delivery times</p>
              </div>
              <ChevronRight size={18} className="text-gray-400" />
            </Link>
          </div>
        </section>

        {/* VERIFICATION SECTION */}
        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
            <ShieldCheck size={18} className="text-gray-600" />
            VERIFICATION
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div>
                <p className="font-medium text-gray-900">Phone verification</p>
                <p className="text-sm text-emerald-600 flex items-center gap-1">
                  <Phone size={14} /> Verified
                </p>
              </div>
              <span className="text-xs text-gray-500">Completed</span>
            </div>

            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div>
                <p className="font-medium text-gray-900">Seller verification</p>
                <p className="text-sm text-gray-600">
                  {(user as any)?.verificationStatus === 'verified' 
                    ? 'Your seller profile is approved' 
                    : 'Complete verification to get verified badge'}
                </p>
              </div>
              <Link 
                to="/seller/verify"
                className="text-[#ff6a00] text-sm font-medium hover:underline"
              >
                {(user as any)?.verificationStatus === 'verified' ? 'View status' : 'Complete'}
              </Link>
            </div>

            <div className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium text-gray-900">Verification documents</p>
                <p className="text-sm text-gray-600">Manage your uploaded documents</p>
              </div>
              <Link 
                to="/seller/verify"
                className="text-[#ff6a00] text-sm font-medium hover:underline"
              >
                Manage
              </Link>
            </div>
          </div>
        </section>

        {/* PRIVACY AND SECURITY SECTION */}
        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Lock size={18} className="text-gray-600" />
            PRIVACY AND SECURITY
          </h2>
          
          <div className="space-y-4">
            <Link 
              href="/settings/location"
              className="flex items-center justify-between py-3 border-b border-gray-100 hover:bg-gray-50 rounded-lg px-2 -mx-2"
            >
              <div>
                <p className="font-medium text-gray-900">Private location settings</p>
                <p className="text-sm text-gray-600">Control who sees your exact location</p>
              </div>
              <ChevronRight size={18} className="text-gray-400" />
            </Link>

            <Link 
              href="/settings/blocked"
              className="flex items-center justify-between py-3 border-b border-gray-100 hover:bg-gray-50 rounded-lg px-2 -mx-2"
            >
              <div>
                <p className="font-medium text-gray-900">Blocked users</p>
                <p className="text-sm text-gray-600">Manage users you've blocked</p>
              </div>
              <ChevronRight size={18} className="text-gray-400" />
            </Link>

            <Link 
              href="/settings/reports"
              className="flex items-center justify-between py-3 hover:bg-gray-50 rounded-lg px-2 -mx-2"
            >
              <div>
                <p className="font-medium text-gray-900">Report history</p>
                <p className="text-sm text-gray-600">View reports you've submitted</p>
              </div>
              <ChevronRight size={18} className="text-gray-400" />
            </Link>
          </div>
        </section>

        {/* ACCOUNT ACTIONS SECTION */}
        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-bold text-gray-900 mb-4">ACCOUNT ACTIONS</h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                {accountPaused ? (
                  <PlayCircle size={18} className="text-emerald-600" />
                ) : (
                  <PauseCircle size={18} className="text-orange-600" />
                )}
                <div>
                  <p className="font-medium text-gray-900">
                    {accountPaused ? 'Resume seller account' : 'Pause seller account'}
                  </p>
                  <p className="text-sm text-gray-600">
                    {accountPaused 
                      ? 'Your products will become visible again' 
                      : 'Your products will be hidden temporarily'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAccountPaused(!accountPaused)}
                className={`px-4 py-2 rounded-lg text-xs font-bold ${
                  accountPaused 
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700' 
                    : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                }`}
              >
                {accountPaused ? 'Resume' : 'Pause'}
              </button>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full py-3 text-left hover:bg-gray-50 rounded-lg px-2 -mx-2"
            >
              <LogOut size={18} className="text-gray-600" />
              <div>
                <p className="font-medium text-gray-900">Log out</p>
                <p className="text-sm text-gray-600">Sign out of your account</p>
              </div>
            </button>

            <button
              onClick={handleDeleteAccount}
              className="flex items-center gap-3 w-full py-3 text-left hover:bg-red-50 rounded-lg px-2 -mx-2 text-red-600"
            >
              <Trash2 size={18} />
              <div>
                <p className="font-medium text-red-600">Delete account</p>
                <p className="text-sm text-red-500">Permanently delete your account and data</p>
              </div>
            </button>
          </div>
        </section>
      </div>
    </SellerWorkspace>
  );
}
