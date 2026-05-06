import { useState } from "react";
import { supabase } from "./supabase";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) setError(error.message);
    else setSent(true);
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0f172a", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif", padding: 24 }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <div style={{ width: "100%", maxWidth: 360 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#f8fafc", letterSpacing: -0.5 }}>Fitness Tracker</div>
          <div style={{ fontSize: 14, color: "#64748b", marginTop: 6 }}>Sign in to access your data</div>
        </div>

        {sent ? (
          <div style={{ background: "#1e293b", borderRadius: 12, padding: 24, textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📬</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: "#e2e8f0", marginBottom: 8 }}>Check your email</div>
            <div style={{ fontSize: 14, color: "#94a3b8", lineHeight: 1.6 }}>
              We sent a magic link to <span style={{ color: "#e2e8f0", fontWeight: 600 }}>{email}</span>.<br />
              Click the link to sign in — no password needed.
            </div>
          </div>
        ) : (
          <form onSubmit={handleLogin}>
            <div style={{ background: "#1e293b", borderRadius: 12, padding: 24 }}>
              <label style={{ display: "block", fontSize: 13, color: "#94a3b8", marginBottom: 8 }}>Email address</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com" required
                style={{ width: "100%", padding: "12px 14px", borderRadius: 8, border: "1px solid #334155", background: "#0f172a", color: "#e2e8f0", fontSize: 15, fontFamily: "inherit", outline: "none", boxSizing: "border-box", marginBottom: 16 }}
              />
              {error && <div style={{ fontSize: 13, color: "#ef4444", marginBottom: 12 }}>{error}</div>}
              <button type="submit" disabled={loading} style={{ width: "100%", padding: "13px", borderRadius: 8, border: "none", background: "#2563eb", color: "#fff", fontSize: 15, fontWeight: 600, fontFamily: "inherit", cursor: "pointer", opacity: loading ? 0.7 : 1 }}>
                {loading ? "Sending…" : "Send magic link"}
              </button>
            </div>
            <div style={{ fontSize: 12, color: "#475569", textAlign: "center", marginTop: 16, lineHeight: 1.5 }}>
              No password needed — we'll email you a link to sign in instantly.
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
