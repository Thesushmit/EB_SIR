import { useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Building2, LogOut, ReceiptText, UsersRound } from 'lucide-react';
import AdminDashboard from './pages/AdminDashboard';
import LoginPage from './pages/LoginPage';
import TenantDashboard from './pages/TenantDashboard';
import { hasSupabaseConfig, supabase } from './services/supabase';
import type { Profile } from './types';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user) {
      setProfile(null);
      return;
    }

    let ignore = false;
    supabase
      .from('profiles')
      .select('id,name,email,role')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => {
        if (!ignore) setProfile(data as Profile | null);
      });

    return () => {
      ignore = true;
    };
  }, [session]);

  const shellTitle = useMemo(() => {
    if (!profile) return 'Rent & Electricity';
    return profile.role === 'admin' ? 'Owner Dashboard' : 'Tenant Dashboard';
  }, [profile]);

  if (loading) {
    return <div className="grid min-h-screen place-items-center bg-paper text-ink">Loading...</div>;
  }

  if (!session || !profile) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-brand text-white">
              <Building2 size={22} />
            </div>
            <div>
              <p className="text-sm text-slate-500">Rent manager</p>
              <h1 className="text-lg font-semibold">{shellTitle}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700 sm:inline-flex">
              {profile.email}
            </span>
            <button className="icon-button" onClick={() => supabase.auth.signOut()} title="Sign out">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      {!hasSupabaseConfig && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env` to connect live data.
        </div>
      )}

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {profile.role === 'admin' ? <AdminDashboard profile={profile} /> : <TenantDashboard profile={profile} />}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white px-4 py-2 sm:hidden">
        <div className="mx-auto flex max-w-sm justify-around">
          <span className="mobile-nav-item">
            <ReceiptText size={18} />
            Bills
          </span>
          {profile.role === 'admin' && (
            <span className="mobile-nav-item">
              <UsersRound size={18} />
              Tenants
            </span>
          )}
        </div>
      </nav>
    </div>
  );
}
