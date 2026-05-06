import { StrictMode, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import Auth from './Auth.jsx'
import { supabase } from './supabase.js'

function Root() {
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    if (!supabase) { setSession(null); return; }
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  if (session === undefined) return (
    <div style={{ minHeight: "100vh", background: "#0f172a", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "#475569", fontFamily: "sans-serif" }}>Loading…</div>
    </div>
  );

  // No Supabase configured — run in local-only mode
  if (!supabase) return <App session={null} />;

  return session ? <App session={session} /> : <Auth />;
}

createRoot(document.getElementById('root')).render(
  <StrictMode><Root /></StrictMode>
)
