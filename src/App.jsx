import { useState, useEffect, useCallback } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, Area, AreaChart } from "recharts";

const TABS = ["Dashboard", "Cycle", "Plan", "Posture", "Weight", "Workouts", "Steps", "Nutrition", "Progress", "Milestones"];
const WORKOUT_TEMPLATES = [
  { key: "Lower Strength", label: "Lower Strength", exercises: [
    { name: "Goblet Squat", sets: ["10", "10", "10", "10"], completed: false, notes: "Use slow tempo and full depth." },
    { name: "Hip Thrust", sets: ["12", "12", "10", "10"], completed: false, notes: "Pause at the top." },
    { name: "Reverse Lunge", sets: ["10", "10", "10", "10"], completed: false, notes: "Keep torso upright." },
  ]},
  { key: "Upper Push", label: "Upper Push", exercises: [
    { name: "Push-Up", sets: ["12", "12", "10", "10"], completed: false, notes: "Use a bar or floor push-up." },
    { name: "Overhead Press", sets: ["10", "10", "8", "8"], completed: false, notes: "Keep core tight." },
    { name: "Tricep Dip", sets: ["12", "12", "10", "10"], completed: false, notes: "Control the descent." },
  ]},
  { key: "Upper Pull", label: "Upper Pull", exercises: [
    { name: "Australian Row", sets: ["12", "12", "10", "10"], completed: false, notes: "Use a low angle for more reps." },
    { name: "Negative Pull-Up", sets: ["5", "5", "4", "4"], completed: false, notes: "Slow 4-5 sec descent." },
    { name: "Bicep Curl", sets: ["12", "12", "10", "10"], completed: false, notes: "No swinging." },
  ]},
  { key: "Ruck/Walk", label: "Ruck/Walk", exercises: [
    { name: "Rucking", sets: ["8k", "8k", "—", "—"], completed: false, notes: "Log distance or steps." },
    { name: "Balance drill", sets: ["3", "3", "3", "3"], completed: false, notes: "Wobble board or single-leg hold." },
  ]},
  { key: "Hip Rehab", label: "Hip Rehab", exercises: [
    { name: "Clamshell", sets: ["15", "15", "15", "15"], completed: false, notes: "Band above knees." },
    { name: "Glute Bridge", sets: ["12", "12", "12", "12"], completed: false, notes: "Squeeze at the top." },
    { name: "Wobble Board", sets: ["30s", "30s", "30s", "30s"], completed: false, notes: "Single-leg if stable." },
  ]},
];
const COLORS = { blue: "#2563eb", teal: "#0d9488", orange: "#ea580c", purple: "#7c3aed", green: "#16a34a", red: "#dc2626", pink: "#ec4899", slate: "#334155", gold: "#eab308" };
const THEMES = {
  dark: {
    bg: "#0f172a",
    text: "#e2e8f0",
    surface: "#1e293b",
    surfaceAlt: "#111827",
    muted: "#94a3b8",
    mutedDarker: "#64748b",
    mutedEven: "#475569",
    border: "#334155",
    navBg: "rgba(15, 23, 42, 0.95)",
    inputBg: "#0f172a",
    inputBorder: "#334155",
    buttonBg: "#2563eb",
    buttonText: "#fff",
    cardShadow: "0 20px 50px rgba(0,0,0,0.18)",
  },
  light: {
    bg: "#f8fafc",
    text: "#0f172a",
    surface: "#ffffff",
    surfaceAlt: "#f1f5f9",
    muted: "#64748b",
    mutedDarker: "#475569",
    mutedEven: "#334155",
    border: "#cbd5e1",
    navBg: "rgba(255, 255, 255, 0.95)",
    inputBg: "#ffffff",
    inputBorder: "#cbd5e1",
    buttonBg: "#2563eb",
    buttonText: "#fff",
    cardShadow: "0 20px 40px rgba(15, 23, 42, 0.08)",
  },
};
const START_WEIGHT = 64;
const TARGET_WEIGHT = 57.5;
const START_DATE = new Date(2026, 2, 15);
const END_DATE = new Date(2026, 5, 4);

const daysBetween = (a, b) => Math.max(0, Math.round((b - a) / 86400000));
const formatDate = (d) => d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
const dayKey = (d) => d.toISOString().slice(0, 10);

const defaultMilestones = [
  { id: "pushup1", name: "First Full Push-Up", target: "Week 5–6", category: "Push-Up", done: false, date: "" },
  { id: "pushup5", name: "5 Unbroken Push-Ups", target: "Week 8", category: "Push-Up", done: false, date: "" },
  { id: "pullup1", name: "First Full Pull-Up", target: "Week 8–16", category: "Pull-Up", done: false, date: "" },
  { id: "pullup3", name: "3 Pull-Ups in a Row", target: "Week 16–24", category: "Pull-Up", done: false, date: "" },
  { id: "dips", name: "Bodyweight Dips (8 reps)", target: "Week 10–14", category: "Dips", done: false, date: "" },
  { id: "pistol1", name: "First Pistol Squat", target: "Week 10–12", category: "Pistol", done: false, date: "" },
  { id: "pistol3", name: "3 Pistol Squats Each Leg", target: "Week 14–16", category: "Pistol", done: false, date: "" },
  { id: "hang45", name: "Dead Hang 45 Seconds", target: "Week 4–6", category: "Pull-Up", done: false, date: "" },
  { id: "wobble30", name: "Wobble Board 30s Eyes Closed", target: "Week 5–6", category: "Mobility", done: false, date: "" },
  { id: "ruck10kg", name: "8,000 Steps Rucked (10 kg)", target: "Week 5–6", category: "Rucking", done: false, date: "" },
];

function App() {
  const [tab, setTab] = useState(0);
  const [data, setData] = useState(null);
  const [theme, setTheme] = useState("dark");
  const [loading, setLoading] = useState(true);

  const defaultData = { weights: {}, workouts: [], steps: {}, nutrition: {}, progress: {}, milestones: defaultMilestones, measurements: { start: {}, current: {}, bodyFat: {} }, settings: {} };

  const loadData = useCallback(async () => {
    try {
      const themeLocal = localStorage.getItem("fitness-tracker-theme");
      const v = localStorage.getItem("fitness-tracker-v2");
      const parsed = v ? { ...defaultData, ...JSON.parse(v) } : defaultData;
      setData(parsed);
      setTheme(themeLocal || parsed.settings?.theme || "dark");
    } catch {
      setData(defaultData);
      setTheme("dark");
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const save = async (newData) => {
    setData(newData);
    try { localStorage.setItem("fitness-tracker-v2", JSON.stringify(newData)); } catch (e) { console.error(e); }
  };

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("fitness-tracker-theme", next);
    if (data) save({ ...data, settings: { ...data.settings, theme: next } });
  };

  if (loading) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "var(--bg)", color: "var(--text)", fontFamily: "'DM Sans', sans-serif" }}><div style={{ textAlign: "center" }}><div style={{ fontSize: 32, fontWeight: 700, letterSpacing: -1 }}>Loading...</div></div></div>;

  const today = new Date();
  const startDate = data.settings?.startDate ? new Date(data.settings.startDate) : START_DATE;
  const endDate = data.settings?.endDate ? new Date(data.settings.endDate) : END_DATE;
  const daysIn = daysBetween(startDate, today);
  const daysLeft = daysBetween(today, endDate);
  const totalDays = daysBetween(startDate, endDate);

  const startWeight = parseFloat(data.settings?.startWeight) || START_WEIGHT;
  const targetWeight = parseFloat(data.settings?.targetWeight) || TARGET_WEIGHT;

  const weightEntries = Object.entries(data.weights || {}).sort(([a], [b]) => a.localeCompare(b));
  const latestWeight = weightEntries.length > 0 ? parseFloat(weightEntries[weightEntries.length - 1][1]) : null;
  const weightShift = latestWeight ? latestWeight - startWeight : 0;
  const weeklyShift = daysIn > 7 && latestWeight ? weightShift / (daysIn / 7) : 0;
  const bodyFatEntries = Object.entries(data.measurements?.bodyFat || {}).sort(([a], [b]) => a.localeCompare(b));
  const latestBodyFat = bodyFatEntries.length > 0 ? parseFloat(bodyFatEntries[bodyFatEntries.length - 1][1]) : null;
  const bodyFatStart = data.settings?.startBodyFat ? parseFloat(data.settings.startBodyFat) : null;
  const bodyFatGoal = data.settings?.goalBodyFat ? parseFloat(data.settings.goalBodyFat) : null;
  const bodyFatShift = latestBodyFat != null && bodyFatStart != null ? latestBodyFat - bodyFatStart : null;
  const milestonesComplete = (data.milestones || []).filter(m => m.done).length;

  const cycle = data.cycle || {};
  const cycleDay = getCycleDay(cycle.periodStart, cycle.cycleLength || 28);
  const cyclePhase = getPhase(cycleDay);

  const themeColors = THEMES[theme] || THEMES.dark;
  const themeLabel = theme === "dark" ? "☀️ Light mode" : "🌙 Dark mode";

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg)",
      color: "var(--text)",
      fontFamily: "'DM Sans', sans-serif",
      transition: "background 0.3s ease, color 0.3s ease",
      WebkitFontSmoothing: "antialiased",
      MozOsxFontSmoothing: "grayscale",
      "--bg": themeColors.bg,
      "--text": themeColors.text,
      "--surface": themeColors.surface,
      "--surface-alt": themeColors.surfaceAlt,
      "--muted": themeColors.muted,
      "--muted-darker": themeColors.mutedDarker,
      "--muted-even": themeColors.mutedEven,
      "--border": themeColors.border,
      "--nav-bg": themeColors.navBg,
      "--input-bg": themeColors.inputBg,
      "--input-border": themeColors.inputBorder,
      "--button-bg": themeColors.buttonBg,
      "--button-text": themeColors.buttonText,
      "--card-shadow": themeColors.cardShadow,
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
      {/* Fixed bottom nav */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100, background: "var(--nav-bg)", borderTop: "1px solid var(--border)", padding: "10px 0 18px", backdropFilter: "blur(12px)" }}>
        <div style={{ display: "flex", overflowX: "auto", gap: 8, padding: "0 16px", msOverflowStyle: "none", scrollbarWidth: "none" }}>
          {TABS.map((t, i) => (
            <NavButton key={t} active={tab === i} onClick={() => setTab(i)}>{t}</NavButton>
          ))}
        </div>
      </div>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "12px 16px 100px" }}>
        <div style={{ padding: "18px 0 12px", borderBottom: "1px solid var(--border)", marginBottom: 18, display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 10, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.6, color: "var(--text)" }}>Fitness Tracker</div>
            <div style={{ fontSize: 14, color: "var(--muted)", marginTop: 6, maxWidth: 640 }}>A cleaner, faster recomposition log with training templates, workout checks, and performance-focused progress summaries.</div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, color: "var(--button-text)", background: "var(--button-bg)", borderRadius: 999, padding: "8px 12px", fontWeight: 700 }}>Local-only</span>
            <span style={{ fontSize: 12, color: "var(--muted)", background: "rgba(148,165,184,0.12)", borderRadius: 999, padding: "8px 12px" }}>No login needed</span>
            <button onClick={toggleTheme} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--button-text)", background: "var(--button-bg)", border: "none", borderRadius: 999, padding: "8px 12px", cursor: "pointer", fontWeight: 700 }}>
              {themeLabel}
            </button>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginBottom: 18 }}>
          <Card style={{ padding: 20, background: "linear-gradient(135deg, var(--surface), var(--surface-alt))" }}>
            <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.9, color: "var(--muted)", marginBottom: 8 }}>Current tab</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>{TABS[tab]}</div>
            <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6 }}>Keep your focus on the task at hand and switch easily between workout logging, planning, and progress tracking.</div>
          </Card>
          <Card style={{ padding: 20, background: "linear-gradient(135deg, var(--surface-alt), var(--surface))" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.9, color: "var(--muted)" }}>Recomposition snapshot</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: COLORS.blue }}>{latestWeight ? latestWeight.toFixed(1) : startWeight.toFixed(1)} kg</div>
              </div>
              <span style={{ fontSize: 12, color: COLORS.green, fontWeight: 700 }}>{latestWeight ? `${weightShift >= 0 ? "+" : ""}${weightShift.toFixed(1)} kg` : "0.0 kg"}</span>
            </div>
            <ProgressBar value={latestWeight ? Math.abs(weightShift) : 0} max={Math.max(1, Math.abs(targetWeight - startWeight))} color={COLORS.blue} />
          </Card>
        </div>
        {tab === 0 && <DashboardTab data={data} save={save} latestWeight={latestWeight} weightShift={weightShift} weeklyShift={weeklyShift} latestBodyFat={latestBodyFat} bodyFatShift={bodyFatShift} bodyFatGoal={bodyFatGoal} bodyFatEntries={bodyFatEntries} daysIn={daysIn} daysLeft={daysLeft} totalDays={totalDays} milestonesComplete={milestonesComplete} weightEntries={weightEntries} cycleDay={cycleDay} cyclePhase={cyclePhase} startWeight={startWeight} targetWeight={targetWeight} />}
        {tab === 1 && <CycleTab data={data} save={save} />}
        {tab === 2 && <PlanTab />}
        {tab === 3 && <PostureTab data={data} save={save} />}
        {tab === 4 && <WeightTab data={data} save={save} weightEntries={weightEntries} startDate={startDate} />}
        {tab === 5 && <WorkoutTab data={data} save={save} />}
        {tab === 6 && <StepsTab data={data} save={save} />}
        {tab === 7 && <NutritionTab data={data} save={save} />}
        {tab === 8 && <ProgressTab data={data} save={save} />}
        {tab === 9 && <MilestonesTab data={data} save={save} />}
      </div>
    </div>
  );
}

const Card = ({ children, style = {} }) => (
  <div style={{ background: "var(--surface)", borderRadius: 18, padding: 18, marginBottom: 14, boxShadow: "var(--card-shadow)", border: "1px solid var(--border)", ...style }}>{children}</div>
);

const NavButton = ({ active, children, onClick }) => (
  <button onClick={onClick} style={{
    flex: "0 0 auto",
    minWidth: 92,
    padding: "10px 16px",
    borderRadius: 999,
    border: "1px solid transparent",
    background: active ? "var(--button-bg)" : "var(--nav-bg)",
    color: active ? "var(--button-text)" : "var(--muted)",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: active ? 700 : 500,
    transition: "all 0.2s ease",
    whiteSpace: "nowrap",
    fontFamily: "inherit",
  }}>{children}</button>
);

const StatBox = ({ label, value, unit, color = "var(--text)", small = false }) => (
  <div style={{ textAlign: "center", flex: 1, minWidth: small ? 70 : 80 }}>
    <div style={{ fontSize: small ? 20 : 26, fontWeight: 700, color, fontFamily: "'DM Mono', monospace", letterSpacing: -1 }}>{value}</div>
    <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{unit && <span style={{ fontSize: 10, color: "var(--border)" }}>{unit} </span>}{label}</div>
  </div>
);

const InputRow = ({ label, value, onChange, type = "number", placeholder = "", step = "0.1" }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0" }}>
    <span style={{ flex: 1, fontSize: 13, color: "var(--muted)" }}>{label}</span>
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} step={step}
      style={{ width: type === "date" ? 140 : 90, padding: "6px 10px", borderRadius: 8, border: "1px solid var(--input-border)", background: "var(--input-bg)", color: "var(--text)", fontSize: type === "date" ? 12 : 14, fontFamily: "'DM Mono', monospace", textAlign: "center", outline: "none" }} />
  </div>
);

const ProgressBar = ({ value, max, color = COLORS.blue }) => (
  <div style={{ height: 6, background: "var(--border)", borderRadius: 3, overflow: "hidden" }}>
    <div style={{ height: "100%", width: `${Math.min(100, (value / max) * 100)}%`, background: color, borderRadius: 3, transition: "width 0.5s ease" }} />
  </div>
);

const SectionHeader = ({ title, subtitle }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 12, gap: 12 }}>
    <div>
      <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>{title}</div>
      {subtitle && <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>{subtitle}</div>}
    </div>
  </div>
);

const WEEKLY_SCHEDULE = [
  { day: "Monday", focus: "Active Recovery + Ruck", color: COLORS.green, icon: "🚶‍♀️", duration: "50–60 min",
    exercises: [
      { name: "Hip Rehab Circuit", w12: "Full circuit", w34: "Full circuit", w56: "Warm-up only", w78: "Warm-up only", w910: "Warm-up only", w1112: "Maintenance only", rest: "—", notes: "See Hip Rehab section below." },
      { name: "Rucking (weight vest)", w12: "8k steps, 5kg, flat", w34: "8k steps, 5kg, incline", w56: "8k steps, 8kg, mix", w78: "8k steps, 10kg, incline", w910: "10k steps, 10kg, incline", w1112: "10k steps, 10kg, varied terrain", rest: "—", notes: "Conversational pace. HR 110–135 bpm." },
      { name: "Wobble Board Work", w12: "3 min each foot", w34: "3 min each foot", w56: "3 min eyes closed", w78: "3 min eyes closed", w910: "3 min eyes closed + single leg squat", w1112: "3 min single leg squat", rest: "—", notes: "Extended balance session." },
      { name: "Slant Board Passive Stretch", w12: "2x60s", w34: "2x60s", w56: "2x60s", w78: "2x60s", w910: "2x60s", w1112: "2x60s", rest: "—", notes: "Just stand on the board. Open up ankles." },
      { name: "Wall Calf Stretch (bent knee)", w12: "2x45s each", w34: "2x60s each", w56: "2x60s each", w78: "2x60s each", w910: "2x60s each", w1112: "2x60s each", rest: "—", notes: "Soleus stretch. Key for squat depth." },
    ]},
  { day: "Tuesday", focus: "Lower Body — Stability", color: COLORS.blue, icon: "🏋️‍♀️", duration: "45–50 min",
    exercises: [
      { name: "Wobble Board Single Leg", w12: "20s each x2", w34: "30s each x3", w56: "30s circles x3", w78: "30s eyes closed x3", w910: "30s eyes closed + mini squat", w1112: "45s eyes closed + mini squat", rest: "—", notes: "Barefoot. Build ankle control." },
      { name: "ATG Split Squat (Slant Board)", w12: "3x6 ea BW", w34: "3x8 ea BW", w56: "3x8 (5kg ea)", w78: "3x10 (5kg ea)", w910: "3x10 (8kg ea)", w1112: "4x10 (8kg ea)", rest: "60s", notes: "Front foot on slant board, back knee drops ALL the way to floor. 3s down, pause at bottom." },
      { name: "Step-Ups (bench)", w12: "3x10 ea BW", w34: "3x10 (5kg ea)", w56: "3x12 (5kg ea)", w78: "3x12 (8kg ea)", w910: "4x12 (8kg ea)", w1112: "4x12 (10kg ea)", rest: "60s", notes: "Drive through heel. No push from back leg." },
      { name: "Hip Thrust (bench)", w12: "3x12 BW", w34: "3x12 (10kg)", w56: "3x10 (15kg)", w78: "4x10 (15kg)", w910: "4x10 (20kg)", w1112: "4x12 (20kg)", rest: "60s", notes: "Shoulders on bench. Squeeze 2s at top." },
      { name: "Single-Leg Glute Bridge", w12: "3x10 ea BW", w34: "3x12 each", w56: "3x12 each", w78: "3x15 each", w910: "3x15 (5kg)", w1112: "4x15 (5kg)", rest: "45s", notes: "Keep pelvis LEVEL. IT band rehab + strength." },
      { name: "Slant Board Calf Raise (single)", w12: "3x8 ea BW", w34: "3x10 each", w56: "3x12 each", w78: "3x12 (3kg)", w910: "3x15 (3kg)", w1112: "3x15 (5kg)", rest: "30s", notes: "3s up, 3s down. Soleus strength." },
      { name: "Wall Calf Stretch (bent knee)", w12: "2x45s each", w34: "2x60s each", w56: "2x60s each", w78: "2x60s each", w910: "2x60s each", w1112: "2x60s each", rest: "—", notes: "Soleus stretch for squat depth + pistol squat." },
    ]},
  { day: "Wednesday", focus: "Active Recovery + Ruck", color: COLORS.green, icon: "🥾", duration: "50–60 min",
    exercises: [
      { name: "Hip Rehab Warm-Up", w12: "Clamshells + abduction", w34: "Banded clamshells + monster walk", w56: "Banded warm-up", w78: "Banded warm-up", w910: "Banded warm-up", w1112: "Light banded warm-up", rest: "—", notes: "Glute med activation before rucking." },
      { name: "Rucking (incline if possible)", w12: "8k steps, 5kg, flat", w34: "8k steps, 5kg, incline", w56: "8k steps, 8kg, incline", w78: "8k steps, 10kg, incline", w910: "10k steps, 10kg, incline", w1112: "10k steps, 10kg, varied terrain", rest: "—", notes: "Longer session if energy allows. Push HR into zone 2." },
      { name: "Slant Board Routine", w12: "Calf raises + stretch", w34: "Calf + tib raises", w56: "Full routine", w78: "Full routine", w910: "Full routine", w1112: "Full routine", rest: "—", notes: "5-min slant board finisher." },
      { name: "Full Body Stretching", w12: "10 min", w34: "10 min", w56: "10 min", w78: "10 min", w910: "10 min", w1112: "10 min", rest: "—", notes: "Calves, hips, shoulders, thoracic spine." },
    ]},
  { day: "Thursday", focus: "Upper Body — Push", color: COLORS.orange, icon: "💪", duration: "40–45 min",
    exercises: [
      { name: "Wobble Board Warm-Up", w12: "2 min", w34: "2 min single leg", w56: "2 min single leg", w78: "2 min single leg", w910: "2 min single leg", w1112: "2 min single leg", rest: "—", notes: "Activate stabilisers." },
      { name: "Push-Up Progression (Gornation)", w12: "3x10 highest", w34: "3x12 mid height", w56: "3x8 low + 3 eccentrics", w78: "3x5 floor + 5 low bar", w910: "3x8 floor push-ups", w1112: "3x10 floor + decline attempts", rest: "60–90s", notes: "KEY exercise. Lower bar height as you progress." },
      { name: "Dips (Gornation Bar)", w12: "3x8 feet assisted", w34: "3x10 feet assisted", w56: "3x6 bodyweight", w78: "3x8 bodyweight", w910: "3x10 bodyweight", w1112: "4x8 bodyweight", rest: "60s", notes: "Lean slightly forward for chest." },
      { name: "DB Overhead Press", w12: "3x12 (3kg ea)", w34: "3x10 (5kg ea)", w56: "3x10 (6kg ea)", w78: "4x10 (8kg ea)", w910: "4x10 (8kg ea)", w1112: "4x10 (10kg ea)", rest: "60s", notes: "Seated or standing. Core tight." },
      { name: "Tricep Overhead Extension", w12: "3x12 (3kg)", w34: "3x12 (5kg)", w56: "3x10 (6kg)", w78: "3x12 (6kg)", w910: "3x12 (8kg)", w1112: "3x12 (8kg)", rest: "45s", notes: "Elbows close to head. Arm definition." },
      { name: "Lateral Raises", w12: "3x12 (2kg ea)", w34: "3x12 (3kg ea)", w56: "3x12 (4kg ea)", w78: "3x15 (4kg ea)", w910: "3x15 (4kg ea)", w1112: "3x15 (5kg ea)", rest: "45s", notes: "Slight elbow bend. Shoulder caps." },
      { name: "Plank Hold", w12: "3x20s", w34: "3x30s", w56: "3x40s", w78: "3x45s", w910: "3x50s", w1112: "3x60s", rest: "30s", notes: "Push-up position. Straight line." },
    ]},
  { day: "Friday", focus: "Full Rest", color: "#64748b", icon: "😴", duration: "—",
    exercises: [
      { name: "Light walking only (no vest)", w12: "As desired", w34: "As desired", w56: "As desired", w78: "As desired", w910: "As desired", w1112: "As desired", rest: "—", notes: "Recovery day. No training. Recharge for weekend sessions." },
      { name: "Meal prep", w12: "Batch cook", w34: "Batch cook", w56: "Batch cook", w78: "Batch cook", w910: "Batch cook", w1112: "Batch cook", rest: "—", notes: "Prepare freezer meals for the week." },
      { name: "Slant Board Passive Stretch", w12: "2 min", w34: "2 min", w56: "2 min", w78: "2 min", w910: "2 min", w1112: "2 min", rest: "—", notes: "Light ankle mobility. Not a workout." },
    ]},
  { day: "Saturday", focus: "Lower Body — Strength", color: COLORS.blue, icon: "🦵", duration: "45–50 min",
    exercises: [
      { name: "Wobble Board Warm-Up", w12: "2 min both feet", w34: "30s each ankle", w56: "30s circles each", w78: "30s eyes closed", w910: "30s eyes closed", w1112: "30s eyes closed + pistol prep", rest: "—", notes: "Barefoot. Pre-workout activation." },
      { name: "Slant Board Goblet Squat", w12: "3x12 BW", w34: "3x12 (5kg)", w56: "3x10 (8kg)", w78: "4x10 (10kg)", w910: "4x10 (12kg)", w1112: "4x10 (14kg)", rest: "60s", notes: "Heels on slant board. Slow 3s descent. Full depth." },
      { name: "Romanian Deadlift (DB)", w12: "3x12 (5kg ea)", w34: "3x10 (8kg ea)", w56: "3x10 (10kg ea)", w78: "4x10 (10kg ea)", w910: "4x10 (12kg ea)", w1112: "4x10 (14kg ea)", rest: "60s", notes: "Hinge at hips. Feel hamstrings stretch." },
      { name: "Slant Board Reverse Lunge", w12: "3x8 ea BW", w34: "3x10 ea BW", w56: "3x10 (5kg ea)", w78: "3x12 (5kg ea)", w910: "3x12 (8kg ea)", w1112: "4x12 (8kg ea)", rest: "60s", notes: "Front foot on slant board, step back into lunge." },
      { name: "Glute Bridge", w12: "3x15 BW", w34: "3x15 (5kg)", w56: "3x12 (10kg)", w78: "4x12 (10kg)", w910: "4x12 (15kg)", w1112: "4x15 (15kg)", rest: "45s", notes: "Squeeze glutes 2s at top." },
      { name: "Slant Board Patrick Step", w12: "3x10 ea BW", w34: "3x12 ea BW", w56: "3x12 (3kg)", w78: "3x15 (5kg)", w910: "3x15 (5kg)", w1112: "4x15 (5kg)", rest: "45s", notes: "Knee over toes. Bulletproofs knees." },
      { name: "Deep Squat Hold", w12: "2x30s", w34: "2x45s", w56: "3x45s", w78: "3x60s", w910: "3x60s", w1112: "3x60s + pistol attempts", rest: "—", notes: "On slant board if needed. Mobility finisher." },
    ]},
  { day: "Sunday", focus: "Upper Body — Pull", color: COLORS.purple, icon: "🔥", duration: "40–45 min",
    exercises: [
      { name: "Dead Hang (Gornation)", w12: "3x15s", w34: "3x25s", w56: "3x35s", w78: "3x45s", w910: "3x45s + flexed arm hang 5s", w1112: "3x45s + flexed arm hang 10s", rest: "45s", notes: "Grip strength + shoulder health." },
      { name: "Australian Rows (Gornation)", w12: "3x8 (high angle)", w34: "3x10 (lower)", w56: "3x10 (near horiz)", w78: "3x12 (near horiz)", w910: "3x12 (horizontal)", w1112: "4x12 (horizontal + vest)", rest: "60s", notes: "#1 pull-up builder. Lower body = harder." },
      { name: "Scapular Pulls", w12: "3x6", w34: "3x8", w56: "3x10", w78: "3x10", w910: "3x12", w1112: "3x12 + chin over bar holds", rest: "45s", notes: "Pull shoulder blades down and together from hang." },
      { name: "Hanging Knee Raises", w12: "3x6", w34: "3x8", w56: "3x10", w78: "3x12", w910: "3x12 + 3 hanging leg raises", w1112: "3x10 hanging leg raises", rest: "45s", notes: "Core + grip. No swinging." },
      { name: "Negative Pull-Ups", w12: "3x3 (3s down)", w34: "3x4 (4s down)", w56: "3x5 (5s down)", w78: "3x5 (5s) + attempts", w910: "3x5 (6s) + band-assisted pull-ups", w1112: "3x5 (6s) + 3 pull-up attempts", rest: "90s", notes: "Jump to top. Lower as slowly as possible." },
      { name: "Bicep Curls (DB)", w12: "3x12 (3kg ea)", w34: "3x12 (5kg ea)", w56: "3x10 (6kg ea)", w78: "3x12 (6kg ea)", w910: "3x12 (8kg ea)", w1112: "4x10 (8kg ea)", rest: "45s", notes: "No swinging. Full extension at bottom." },
      { name: "Hammer Curls (DB)", w12: "3x12 (3kg ea)", w34: "3x12 (4kg ea)", w56: "3x10 (5kg ea)", w78: "3x12 (5kg ea)", w910: "3x12 (6kg ea)", w1112: "4x10 (6kg ea)", rest: "45s", notes: "Outer arm definition. Thumbs up grip." },
    ]},
];

const HIP_REHAB = {
  avoid: [
    { what: "Foam rolling directly on painful hip", why: "Compresses irritated bursa/tendon. Roll quads and glutes instead." },
    { what: "IT band stretches (crossing legs)", why: "More compression on irritated structures. IT band can't be meaningfully stretched." },
    { what: "Sleeping on painful side", why: "Use pillow between knees. Prevents overnight compression." },
    { what: "Deep lunges at full depth (temporarily)", why: "Reduce to 90° until pain settles (2–3 weeks)." },
  ],
  phases: [
    { name: "Phase 1: Pain Relief (Wk 1–2)", when: "Daily, 10–15 min", exercises: [
      { name: "Isometric Glute Med Hold", detail: "Side-lying, lift top leg to 30° only. Hold 30–45s each side. 3 sets." },
      { name: "Clamshells (no band)", detail: "Side-lying, knees bent 90°. Open top knee slowly. 3x15 each side." },
      { name: "Side-Lying Hip Abduction", detail: "Straight leg, slight backward angle. Lift to 30°. 3x12 each side." },
      { name: "Pillow Squeeze", detail: "On back, knees bent, squeeze pillow between knees 5s. 3x10." },
    ]},
    { name: "Phase 2: Strengthen (Wk 3–4)", when: "Daily or 5x/week", exercises: [
      { name: "Banded Clamshells", detail: "Light band above knees. Same form. 3x15 each side." },
      { name: "Monster Walk (band)", detail: "Band above knees. Quarter squat. Side step 10 each way. 3 sets." },
      { name: "Single-Leg Glute Bridge", detail: "Keep pelvis LEVEL. 3x10 each side." },
      { name: "Step-Down (low step)", detail: "Stand on step, lower opposite foot slowly. Pelvis level. 3x8 each." },
      { name: "Wobble Board Single Leg", detail: "Double duty: ankle + glute med. 3x30s each side." },
    ]},
    { name: "Phase 3: Return to Full (Wk 5–6)", when: "Pre-workout warm-up", exercises: [
      { name: "Banded Clamshells (warm-up)", detail: "2x15 each side before every lower body session + rucking." },
      { name: "Monster Walk (warm-up)", detail: "2x10 each direction before every session." },
      { name: "Full-depth lunges (reintroduce)", detail: "Gradually return to full range. Start bodyweight." },
    ]},
  ]
};

const RUCKING_PLAN = [
  { week: "Wk 1–2", vest: "5 kg", terrain: "Flat only", steps: "8,000", notes: "Get used to vest. Focus on posture — no forward lean." },
  { week: "Wk 3–4", vest: "5 kg", terrain: "Add incline (5–8%)", steps: "8,000", notes: "Introduce treadmill incline or hills 2x/week." },
  { week: "Wk 5–6", vest: "8 kg", terrain: "Mix flat + incline", steps: "8,000", notes: "Increase vest. Drop to 5kg on incline if needed." },
  { week: "Wk 7–8", vest: "8–10 kg", terrain: "Incline 10%+", steps: "8,000", notes: "Full progression. HR 110–135 bpm." },
  { week: "Wk 9–10", vest: "10 kg", terrain: "Incline 10%+", steps: "10,000", notes: "Increase step target. Push zone 2 duration." },
  { week: "Wk 11–12", vest: "10 kg", terrain: "Varied terrain", steps: "10,000", notes: "Maintain intensity. Focus on cadence and posture under load." },
];

function PlanTab() {
  // Mon=0, Tue=1, Wed=2, Thu=3, Fri=4, Sat=5, Sun=6 in WEEKLY_SCHEDULE
  const [selectedDay, setSelectedDay] = useState(() => ({ 1:0, 2:1, 3:2, 4:3, 5:4, 6:5, 0:6 }[new Date().getDay()] ?? 0));
  const [section, setSection] = useState("weekly");
  const [weekRange, setWeekRange] = useState("w12");
  const weekLabels = { w12: "Weeks 1–2", w34: "Weeks 3–4", w56: "Weeks 5–6", w78: "Weeks 7–8", w910: "Weeks 9–10", w1112: "Weeks 11–12" };

  return (<>
    <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
      {[["weekly", "Weekly Plan"], ["rehab", "Hip Rehab"], ["rucking", "Rucking"]].map(([key, label]) => (
        <button key={key} onClick={() => setSection(key)} style={{
          flex: 1, padding: "8px 6px", borderRadius: 8, border: "none", cursor: "pointer",
          background: section === key ? "#2563eb" : "#1e293b", color: section === key ? "#fff" : "#94a3b8",
          fontSize: 12, fontWeight: section === key ? 600 : 400, fontFamily: "inherit"
        }}>{label}</button>
      ))}
    </div>

    {section === "weekly" && (<>
      <Card style={{ padding: 10 }}>
        <div style={{ display: "flex", gap: 4 }}>
          {Object.entries(weekLabels).map(([key, label]) => (
            <button key={key} onClick={() => setWeekRange(key)} style={{
              flex: 1, padding: "6px 4px", borderRadius: 6, border: "none", cursor: "pointer",
              background: weekRange === key ? "#334155" : "transparent", color: weekRange === key ? "#e2e8f0" : "#64748b",
              fontSize: 11, fontWeight: weekRange === key ? 600 : 400, fontFamily: "inherit"
            }}>{label}</button>
          ))}
        </div>
      </Card>
      <div style={{ display: "flex", gap: 4, marginBottom: 12, overflowX: "auto" }}>
        {WEEKLY_SCHEDULE.map((d, i) => (
          <button key={d.day} onClick={() => setSelectedDay(i)} style={{
            flex: 1, minWidth: 44, padding: "8px 4px", borderRadius: 8, border: selectedDay === i ? `2px solid ${d.color}` : "2px solid transparent",
            background: selectedDay === i ? d.color + "22" : "#1e293b", cursor: "pointer", textAlign: "center"
          }}>
            <div style={{ fontSize: 16 }}>{d.icon}</div>
            <div style={{ fontSize: 10, color: selectedDay === i ? d.color : "#64748b", fontWeight: selectedDay === i ? 600 : 400, fontFamily: "'DM Sans', sans-serif" }}>{d.day.slice(0, 3)}</div>
          </button>
        ))}
      </div>
      {(() => {
        const day = WEEKLY_SCHEDULE[selectedDay];
        return (
          <Card style={{ borderTop: `3px solid ${day.color}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: day.color }}>{day.day}</div>
                <div style={{ fontSize: 13, color: "var(--muted)" }}>{day.focus}</div>
              </div>
              <div style={{ fontSize: 12, color: "var(--muted-even)", background: "var(--bg)", padding: "4px 10px", borderRadius: 6 }}>{day.duration}</div>
            </div>
            {day.exercises.map((ex, i) => (
              <div key={i} style={{ background: i % 2 === 0 ? "#0f172a" : "transparent", borderRadius: 8, padding: "10px", marginBottom: 2 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", flex: 1 }}>{ex.name}</div>
                  {ex.rest !== "—" && <span style={{ fontSize: 10, color: "var(--muted-even)", background: "var(--surface)", padding: "2px 6px", borderRadius: 4, marginLeft: 8, whiteSpace: "nowrap" }}>Rest: {ex.rest}</span>}
                </div>
                <div style={{ fontSize: 13, fontWeight: 500, color: day.color, fontFamily: "'DM Mono', monospace", marginBottom: 4 }}>{ex[weekRange]}</div>
                <div style={{ fontSize: 11, color: "var(--muted-darker)", lineHeight: 1.4 }}>{ex.notes}</div>
              </div>
            ))}
          </Card>
        );
      })()}
    </>)}

    {section === "rehab" && (<>
      <Card style={{ borderTop: "3px solid " + COLORS.red }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.red, marginBottom: 10 }}>Avoid These</div>
        {HIP_REHAB.avoid.map((item, i) => (
          <div key={i} style={{ background: i % 2 === 0 ? "#0f172a" : "transparent", borderRadius: 8, padding: "8px 10px", marginBottom: 2 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>{item.what}</div>
            <div style={{ fontSize: 11, color: "var(--muted-darker)" }}>{item.why}</div>
          </div>
        ))}
      </Card>
      {HIP_REHAB.phases.map((phase, pi) => (
        <Card key={pi} style={{ borderLeft: `3px solid ${pi === 0 ? COLORS.red : pi === 1 ? COLORS.orange : COLORS.green}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: pi === 0 ? COLORS.red : pi === 1 ? COLORS.orange : COLORS.green }}>{phase.name}</div>
            <span style={{ fontSize: 11, color: "var(--muted-even)", background: "var(--bg)", padding: "2px 8px", borderRadius: 4 }}>{phase.when}</span>
          </div>
          {phase.exercises.map((ex, i) => (
            <div key={i} style={{ background: i % 2 === 0 ? "#0f172a" : "transparent", borderRadius: 6, padding: "8px 10px", marginBottom: 2 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>{ex.name}</div>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>{ex.detail}</div>
            </div>
          ))}
        </Card>
      ))}
      <Card style={{ background: "#1a1625", border: "1px solid #7c3aed33" }}>
        <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.6 }}>
          <div style={{ fontWeight: 600, color: COLORS.purple, marginBottom: 4 }}>When to see a physio:</div>
          Pain doesn't improve after 3 weeks of consistent glute work, pain wakes her at night, clicking or catching, or sharp rather than dull ache.
        </div>
      </Card>
    </>)}

    {section === "rucking" && (<>
      <Card style={{ borderTop: "3px solid " + COLORS.teal }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.teal, marginBottom: 10 }}>Rucking Progression</div>
        {RUCKING_PLAN.map((r, i) => (
          <div key={i} style={{ background: i % 2 === 0 ? "#0f172a" : "transparent", borderRadius: 8, padding: "10px", marginBottom: 2 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.teal }}>{r.week}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", fontFamily: "'DM Mono', monospace" }}>{r.vest}</span>
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>{r.terrain} — {r.steps} steps</div>
            <div style={{ fontSize: 11, color: "var(--muted-darker)", marginTop: 2 }}>{r.notes}</div>
          </div>
        ))}
      </Card>
      <Card>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--muted)", marginBottom: 8 }}>Calorie Burn Estimates (8,000 steps at 64 kg)</div>
        {[["No vest, flat","~260 kcal"],["5 kg vest, flat","~290 kcal"],["10 kg vest, flat","~330 kcal"],["5 kg vest, 10% incline","~420 kcal"],["10 kg vest, 10% incline","~500 kcal"]].map(([scenario, cal], i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: i < 4 ? "1px solid #1e293b" : "none" }}>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>{scenario}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.teal, fontFamily: "'DM Mono', monospace" }}>{cal}</span>
          </div>
        ))}
      </Card>
      <Card>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--muted)", marginBottom: 8 }}>Equipment Guide</div>
        {[["Slant Board","Squat depth, knee health, ankle mobility","Goblet squats, Patrick steps, calf raises"],["Wobble Board","Dynamic ankle stability, proprioception","Single-leg balance, circles, eyes-closed"],["Gornation Bar","Push-up & pull-up progression, dips, rows","Incline push-ups, Australian rows, dead hangs"],["Weight Vest","Calorie burn, cardiovascular health","Rucking walks, incline treadmill"]].map(([tool, purpose, exercises], i) => (
          <div key={i} style={{ background: i % 2 === 0 ? "#0f172a" : "transparent", borderRadius: 8, padding: "8px 10px", marginBottom: 2 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>{tool}</div>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>{purpose}</div>
            <div style={{ fontSize: 10, color: "var(--muted-even)", marginTop: 2 }}>{exercises}</div>
          </div>
        ))}
      </Card>
    </>)}
  </>);
}

const CYCLE_PHASES = [
  { name: "Menstrual", days: "Days 1–5", color: "#ef4444", bg: "#fef2f2", intensity: "60–70%", calories: "1,400–1,500", training: "Light weights, mobility, rucking without vest. Iron-rich foods.", icon: "🔴" },
  { name: "Follicular", days: "Days 6–13", color: "#16a34a", bg: "#f0fdf4", intensity: "90–100%", calories: "1,300–1,400", training: "PUSH HARD. Add weight. Attempt new movements. PRs happen here.", icon: "🟢" },
  { name: "Ovulation", days: "Days 14–16", color: "#eab308", bg: "#fefce8", intensity: "95–100%", calories: "1,300–1,400", training: "Peak strength BUT highest injury risk. Extra warm-up. Perfect form.", icon: "🟡" },
  { name: "Early Luteal", days: "Days 17–21", color: "#ea580c", bg: "#fff7ed", intensity: "80%", calories: "1,400–1,500", training: "Maintain intensity. Volume over load. Don't chase PRs.", icon: "🟠" },
  { name: "Late Luteal", days: "Days 22–28", color: "#ec4899", bg: "#fdf2f8", intensity: "70–80%", calories: "1,500–1,600", training: "Reduce intensity. Hunger is real (metabolism up). Rucking + mobility.", icon: "🩷" },
];

const SESSION_ADJUSTMENTS = [
  { session: "Sat — Lower Strength", menstrual: "Reduce weight 20%. 3x10 instead of 4x10.", follicular: "PUSH. Add weight. Attempt heavier goblet squat.", ovulation: "Maintain heavy. Extra wobble board warm-up.", earlyLuteal: "Same weights. Focus on reps not load.", lateLuteal: "Reduce 10–15%. Longer mobility work." },
  { session: "Thu — Upper Push", menstrual: "Light push-up work. Higher Gornation bar.", follicular: "Lower the Gornation bar! Attempt harder level.", ovulation: "Peak pressing. Test new push-up level.", earlyLuteal: "Maintain current level. Volume.", lateLuteal: "Easier bar height. Fewer sets if fatigued." },
  { session: "Tue — Lower Stability", menstrual: "Bodyweight only ATG splits. Extra rehab.", follicular: "Add weight to ATG splits. Deeper range.", ovulation: "Careful with ATG depth. Extra warm-up.", earlyLuteal: "Maintain weights. Focus on tempo.", lateLuteal: "Bodyweight or light. More mobility." },
  { session: "Sun — Upper Pull", menstrual: "Shorter hangs. High-angle rows only.", follicular: "Longer hangs! Lower row angle. More negatives.", ovulation: "Peak grip. Best day for pull-up attempts.", earlyLuteal: "Maintain hang times. Steady.", lateLuteal: "Reduce hang 20%. Higher angle rows." },
  { session: "Mon/Wed — Rucking", menstrual: "Light vest or no vest. Flat. Shorter.", follicular: "Full vest. Add incline. Push zone 2.", ovulation: "Full vest + incline. Stay hydrated.", earlyLuteal: "Normal rucking. May feel warmer.", lateLuteal: "Reduce vest. Flat ground. Walk for mood." },
];

function getCycleDay(periodStart, cycleLength = 28) {
  if (!periodStart) return null;
  const start = new Date(periodStart);
  const today = new Date();
  const diff = Math.floor((today - start) / 86400000);
  return ((diff % cycleLength) + cycleLength) % cycleLength + 1;
}

function getPhase(cycleDay) {
  if (!cycleDay) return null;
  if (cycleDay <= 5) return CYCLE_PHASES[0];
  if (cycleDay <= 13) return CYCLE_PHASES[1];
  if (cycleDay <= 16) return CYCLE_PHASES[2];
  if (cycleDay <= 21) return CYCLE_PHASES[3];
  return CYCLE_PHASES[4];
}

function CycleTab({ data, save }) {
  const [view, setView] = useState("today");
  const cycle = data.cycle || { periodStart: "", cycleLength: 28, log: {} };
  const cycleDay = getCycleDay(cycle.periodStart, cycle.cycleLength);
  const phase = getPhase(cycleDay);

  const updateCycle = (field, value) => save({ ...data, cycle: { ...cycle, [field]: value } });
  const updateLog = (dateKey, field, value) => {
    const newLog = { ...cycle.log, [dateKey]: { ...cycle.log?.[dateKey], [field]: value } };
    updateCycle("log", newLog);
  };

  const today = new Date();
  const weekDates = Array.from({ length: 7 }, (_, i) => { const d = new Date(today); d.setDate(d.getDate() - 3 + i); return d; });

  return (<>
    <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
      {[["today", "Today"], ["log", "Daily Log"], ["guide", "Training Guide"]].map(([k, l]) => (
        <button key={k} onClick={() => setView(k)} style={{ flex: 1, padding: "8px 6px", borderRadius: 8, border: "none", cursor: "pointer", background: view === k ? COLORS.pink : "#1e293b", color: view === k ? "#fff" : "#94a3b8", fontSize: 12, fontWeight: view === k ? 600 : 400, fontFamily: "inherit" }}>{l}</button>
      ))}
    </div>
    <Card style={{ padding: 12 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <span style={{ fontSize: 13, color: "var(--muted)", flex: 1 }}>Period start date</span>
        <input type="date" value={cycle.periodStart || ""} onChange={e => updateCycle("periodStart", e.target.value)}
          style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--input-bg)", color: "var(--text)", fontSize: 13, fontFamily: "inherit", outline: "none" }} />
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6 }}>
        <span style={{ fontSize: 13, color: "var(--muted)", flex: 1 }}>Cycle length (days)</span>
        <input type="number" value={cycle.cycleLength || 28} onChange={e => updateCycle("cycleLength", parseInt(e.target.value) || 28)}
          style={{ width: 70, padding: "6px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--input-bg)", color: "var(--text)", fontSize: 14, fontFamily: "'DM Mono', monospace", textAlign: "center", outline: "none" }} />
      </div>
    </Card>

    {view === "today" && (<>
      {phase ? (
        <Card style={{ borderTop: `3px solid ${phase.color}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: phase.color }}>{phase.icon} {phase.name}</div>
              <div style={{ fontSize: 13, color: "var(--muted)" }}>{phase.days} — Cycle Day {cycleDay}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: phase.color, fontFamily: "'DM Mono', monospace" }}>{phase.intensity}</div>
              <div style={{ fontSize: 11, color: "var(--muted-darker)" }}>intensity</div>
            </div>
          </div>
          <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.5, marginBottom: 8 }}>{phase.training}</div>
          <div style={{ fontSize: 12, color: "var(--muted)", padding: "6px 0", borderTop: "1px solid var(--border)" }}>
            Calorie target: <span style={{ color: phase.color, fontWeight: 600 }}>{phase.calories} kcal</span>
          </div>
        </Card>
      ) : (
        <Card><div style={{ fontSize: 13, color: "var(--muted-darker)", textAlign: "center", padding: 20 }}>Enter your period start date above to see your current phase</div></Card>
      )}
      {phase && (
        <Card>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--muted)", marginBottom: 8 }}>Today's Training Adjustment</div>
          {SESSION_ADJUSTMENTS.map((s, i) => {
            const dayOfWeek = today.getDay();
            const sessionDays = { "Sat — Lower Strength": 6, "Thu — Upper Push": 4, "Tue — Lower Stability": 2, "Sun — Upper Pull": 0 };
            const isToday = sessionDays[s.session] === dayOfWeek || (s.session === "Mon/Wed — Rucking" && (dayOfWeek === 1 || dayOfWeek === 3));
            const phaseKey = phase.name === "Menstrual" ? "menstrual" : phase.name === "Follicular" ? "follicular" : phase.name === "Ovulation" ? "ovulation" : phase.name === "Early Luteal" ? "earlyLuteal" : "lateLuteal";
            return (
              <div key={i} style={{ background: i % 2 === 0 ? "#0f172a" : "transparent", borderRadius: 8, padding: "8px 10px", marginBottom: 2, border: isToday ? `1px solid ${phase.color}44` : "1px solid transparent" }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: isToday ? phase.color : "#e2e8f0" }}>{s.session} {isToday && "← Today"}</span>
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{s[phaseKey]}</div>
              </div>
            );
          })}
        </Card>
      )}
      <Card>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--muted)", marginBottom: 10 }}>Cycle Overview</div>
        <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", height: 32 }}>
          {CYCLE_PHASES.map((p, i) => {
            const widths = [5/28*100, 8/28*100, 3/28*100, 5/28*100, 7/28*100];
            const isActive = phase && phase.name === p.name;
            return <div key={i} style={{ width: `${widths[i]}%`, background: p.color + (isActive ? "dd" : "44"), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: isActive ? "#fff" : "#94a3b8", fontWeight: isActive ? 700 : 400 }}>{isActive && `D${cycleDay}`}</div>;
          })}
        </div>
        <div style={{ display: "flex", marginTop: 4 }}>
          {CYCLE_PHASES.map((p, i) => { const widths = [5/28*100, 8/28*100, 3/28*100, 5/28*100, 7/28*100]; return <div key={i} style={{ width: `${widths[i]}%`, fontSize: 9, color: "#475569", textAlign: "center" }}>{p.name.split(" ")[0]}</div>; })}
        </div>
      </Card>
    </>)}

    {view === "log" && (
      <Card>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>Daily Cycle Log</div>
        {weekDates.map(d => {
          const key = dayKey(d);
          const entry = cycle.log?.[key] || {};
          const isToday = key === dayKey(new Date());
          const dayCycleDay = getCycleDay(cycle.periodStart, cycle.cycleLength);
          const dayOffset = Math.floor((d - new Date()) / 86400000);
          const thisDayCycle = dayCycleDay ? ((dayCycleDay - 1 + dayOffset + cycle.cycleLength) % cycle.cycleLength) + 1 : null;
          const dayPhase = getPhase(thisDayCycle);
          return (
            <div key={key} style={{ background: isToday ? "#1a2744" : "#0f172a", borderRadius: 8, padding: 10, marginBottom: 6, border: isToday ? "1px solid #2563eb44" : "1px solid transparent" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: isToday ? COLORS.blue : "#94a3b8" }}>{d.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short" })} {isToday && "← Today"}</span>
                {dayPhase && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: dayPhase.color + "22", color: dayPhase.color, fontWeight: 600 }}>{dayPhase.icon} D{thisDayCycle} {dayPhase.name}</span>}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {[["energy", "Energy (1–5)"], ["mood", "Mood (1–5)"]].map(([field, label]) => (
                  <div key={field} style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, color: "var(--muted-even)", marginBottom: 2 }}>{label}</div>
                    <div style={{ display: "flex", gap: 2 }}>
                      {[1,2,3,4,5].map(n => (
                        <button key={n} onClick={() => updateLog(key, field, n)} style={{ flex: 1, padding: "4px 0", borderRadius: 4, border: "none", cursor: "pointer", fontSize: 11, background: parseInt(entry[field]) === n ? (n <= 2 ? "#ef444444" : n <= 3 ? "#eab30844" : "#16a34a44") : "#334155", color: parseInt(entry[field]) === n ? "#fff" : "#64748b" }}>{n}</button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <input placeholder="Symptoms / notes" value={entry.notes || ""} onChange={e => updateLog(key, "notes", e.target.value)}
                style={{ width: "100%", marginTop: 4, padding: "4px 8px", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", color: "var(--muted)", fontSize: 11, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
            </div>
          );
        })}
      </Card>
    )}

    {view === "guide" && (<>
      {CYCLE_PHASES.map((p, i) => (
        <Card key={i} style={{ borderLeft: `3px solid ${p.color}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: p.color }}>{p.icon} {p.name}</div>
            <span style={{ fontSize: 12, color: "var(--muted-even)" }}>{p.days}</span>
          </div>
          <div style={{ display: "flex", gap: 12, marginBottom: 8 }}>
            <div style={{ textAlign: "center" }}><div style={{ fontSize: 16, fontWeight: 700, color: p.color, fontFamily: "'DM Mono', monospace" }}>{p.intensity}</div><div style={{ fontSize: 10, color: "var(--muted-even)" }}>intensity</div></div>
            <div style={{ textAlign: "center" }}><div style={{ fontSize: 16, fontWeight: 700, color: p.color, fontFamily: "'DM Mono', monospace" }}>{p.calories}</div><div style={{ fontSize: 10, color: "var(--muted-even)" }}>kcal target</div></div>
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.5 }}>{p.training}</div>
        </Card>
      ))}
      <Card style={{ background: "#1a0a1e", border: "1px solid #ec489933" }}>
        <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.6 }}>
          <div style={{ fontWeight: 600, color: COLORS.pink, marginBottom: 4 }}>Key Reminders</div>
          <div>The follicular phase (days 6–13) is when 70% of progress happens. Don't waste it on light sessions.</div>
          <div style={{ marginTop: 4 }}>Late luteal reduced performance is HORMONAL, not laziness. Train lighter and trust the process.</div>
          <div style={{ marginTop: 4 }}>Increased hunger in the luteal phase = metabolism speeding up. Eating 100–200 kcal more won't affect fat loss.</div>
        </div>
      </Card>
    </>)}
  </>);
}

const POSTURE_EXERCISES = {
  apt: [
    { name: "Half-Kneeling Hip Flexor Stretch", w12: "2x30s each", w34: "2x45s each", w56: "2x60s each", w78: "2x60s each", w910: "2x60s each", w1112: "2x60s each", freq: "Daily", notes: "Back knee on pad. Squeeze GLUTE on back leg. Lean forward gently." },
    { name: "Dead Bug", w12: "3x6 each", w34: "3x8 each", w56: "3x10 each", w78: "3x10 each", w910: "3x12 each", w1112: "3x12 each", freq: "Daily", notes: "Lie on back, arms up, knees 90°. Extend opposite arm/leg. Lower back MUST stay on floor." },
    { name: "Glute Squeeze (standing)", w12: "3x10s", w34: "3x15s", w56: "3x20s", w78: "3x20s", w910: "3x20s", w1112: "Habit", freq: "2–3x daily", notes: "Squeeze glutes hard, tuck pelvis under. Memorise how this feels." },
    { name: "Posterior Pelvic Tilt (wall)", w12: "3x10", w34: "3x12", w56: "3x12", w78: "3x15", w910: "3x15", w1112: "Habit", freq: "Daily", notes: "Back against wall. Flatten lower back by tilting pelvis. Hold 3s each rep." },
    { name: "Couch Stretch", w12: "2x30s each", w34: "2x45s each", w56: "2x60s each", w78: "2x60s each", w910: "2x60s each", w1112: "2x60s each", freq: "Daily", notes: "Back foot on couch. Squeeze back glute. Deepest hip flexor stretch." },
  ],
  fhp: [
    { name: "Chin Tucks", w12: "3x10 (3s)", w34: "3x12 (5s)", w56: "3x12 (5s)", w78: "3x15 (5s)", w910: "3x15 (5s)", w1112: "Habit throughout day", freq: "3–5x daily", notes: "Pull chin straight back (double chin). Don't tilt up/down. Retrains deep neck flexors." },
    { name: "Wall Angels", w12: "3x8", w34: "3x10", w56: "3x12", w78: "3x12", w910: "3x12", w1112: "3x12 — full contact", freq: "Daily", notes: "Back against wall, goalpost arms. Slide up/down keeping head, back, elbows, wrists on wall." },
    { name: "Doorway Chest Stretch", w12: "2x30s each", w34: "2x45s each", w56: "2x60s each", w78: "2x60s each", w910: "2x60s each", w1112: "2x60s each", freq: "Daily", notes: "Forearm on door frame at shoulder height, step through." },
    { name: "Thoracic Extension (foam roller)", w12: "2x10", w34: "3x10", w56: "3x12", w78: "3x12", w910: "3x12", w1112: "3x12", freq: "Daily", notes: "Lie on roller across upper back. Hands behind head. Extend over roller. Only upper back moves." },
    { name: "Prone Y Raise", w12: "3x8", w34: "3x10", w56: "3x10", w78: "3x12", w910: "3x12 (1kg)", w1112: "3x12 (2kg)", freq: "3–4x/week", notes: "Face down, arms in Y, thumbs up. Lift arms by squeezing shoulder blades down. Hold 2s." },
  ]
};

const POSTURE_MILESTONES = [
  { id: "wall3cm", name: "Wall test: gap < 3 cm", target: "Week 3–4" },
  { id: "chintuck10", name: "Chin tuck 10s comfortably", target: "Week 2–3" },
  { id: "wallangels", name: "Wall angels with full contact", target: "Week 4–6" },
  { id: "natural", name: "Corrected posture feels natural", target: "Week 6–8" },
  { id: "comments", name: "Others comment on height/posture", target: "Week 6–10" },
  { id: "bellyflat", name: "Belly appears flatter (APT resolved)", target: "Week 4–8" },
  { id: "hangshoulder", name: "Dead hang 30s+ shoulders packed", target: "Week 4–6" },
];

function PostureTab({ data, save }) {
  const [view, setView] = useState("exercises");
  const [weekRange, setWeekRange] = useState("w12");
  const posture = data.posture || { log: {}, milestones: POSTURE_MILESTONES.map(m => ({ ...m, done: false, date: "" })) };
  const weekLabels = { w12: "Wk 1–2", w34: "Wk 3–4", w56: "Wk 5–6", w78: "Wk 7–8", w910: "Wk 9–10", w1112: "Wk 11–12" };

  const updatePosture = (field, value) => save({ ...data, posture: { ...posture, [field]: value } });
  const updateLog = (dateKey, field, value) => updatePosture("log", { ...posture.log, [dateKey]: { ...posture.log?.[dateKey], [field]: value } });
  const toggleMilestone = (id) => updatePosture("milestones", posture.milestones.map(m => m.id === id ? { ...m, done: !m.done, date: !m.done ? dayKey(new Date()) : "" } : m));

  const today = new Date();
  const weekDates = Array.from({ length: 7 }, (_, i) => { const d = new Date(today); d.setDate(d.getDate() - 3 + i); return d; });
  const completedMilestones = posture.milestones.filter(m => m.done).length;

  return (<>
    <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
      {[["exercises", "Exercises"], ["tracker", "Daily Log"], ["milestones", "Milestones"]].map(([k, l]) => (
        <button key={k} onClick={() => setView(k)} style={{ flex: 1, padding: "8px 6px", borderRadius: 8, border: "none", cursor: "pointer", background: view === k ? "#6366f1" : "#1e293b", color: view === k ? "#fff" : "#94a3b8", fontSize: 12, fontWeight: view === k ? 600 : 400, fontFamily: "inherit" }}>{l}</button>
      ))}
    </div>

    {view === "exercises" && (<>
      <Card style={{ padding: 10 }}>
        <div style={{ display: "flex", gap: 4 }}>
          {Object.entries(weekLabels).map(([key, label]) => (
            <button key={key} onClick={() => setWeekRange(key)} style={{ flex: 1, padding: "6px 4px", borderRadius: 6, border: "none", cursor: "pointer", background: weekRange === key ? "#334155" : "transparent", color: weekRange === key ? "#e2e8f0" : "#64748b", fontSize: 11, fontWeight: weekRange === key ? 600 : 400, fontFamily: "inherit" }}>{label}</button>
          ))}
        </div>
      </Card>
      <Card style={{ borderTop: "3px solid #6366f1" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#6366f1", marginBottom: 8 }}>Why This Matters</div>
        <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.6 }}>Anterior pelvic tilt + forward head posture can reduce apparent height by <span style={{ color: "var(--text)", fontWeight: 600 }}>2–4 cm</span>. Fixing this visually "grows" you to 159–161 cm and makes the belly appear flatter.</div>
      </Card>
      {[["apt", "#818cf8", "Anterior Pelvic Tilt Correction"], ["fhp", "#6366f1", "Forward Head Posture Correction"]].map(([key, color, title]) => (
        <Card key={key} style={{ borderLeft: `3px solid ${color}` }}>
          <div style={{ fontSize: 13, fontWeight: 700, color, marginBottom: 10 }}>{title}</div>
          {POSTURE_EXERCISES[key].map((ex, i) => (
            <div key={i} style={{ background: i % 2 === 0 ? "#0f172a" : "transparent", borderRadius: 8, padding: "10px", marginBottom: 2 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{ex.name}</div>
                <span style={{ fontSize: 10, color: "var(--muted-even)", background: "var(--surface)", padding: "2px 6px", borderRadius: 4, whiteSpace: "nowrap" }}>{ex.freq}</span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 500, color, fontFamily: "'DM Mono', monospace", marginBottom: 4 }}>{ex[weekRange]}</div>
              <div style={{ fontSize: 11, color: "var(--muted-darker)", lineHeight: 1.4 }}>{ex.notes}</div>
            </div>
          ))}
        </Card>
      ))}
    </>)}

    {view === "tracker" && (
      <Card>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>Daily Posture Log</div>
        {weekDates.map(d => {
          const key = dayKey(d);
          const entry = posture.log?.[key] || {};
          const isToday = key === dayKey(new Date());
          return (
            <div key={key} style={{ background: isToday ? "#1a1a3e" : "#0f172a", borderRadius: 8, padding: 10, marginBottom: 6, border: isToday ? "1px solid #6366f144" : "1px solid transparent" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: isToday ? "#6366f1" : "#94a3b8" }}>{d.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short" })} {isToday && "← Today"}</span>
                <button onClick={() => updateLog(key, "done", !entry.done)} style={{ padding: "3px 10px", borderRadius: 12, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600, background: entry.done ? "#16a34a33" : "#334155", color: entry.done ? COLORS.green : "#64748b" }}>{entry.done ? "✓ Done" : "Not done"}</button>
              </div>
              <div style={{ display: "flex", gap: 6, marginBottom: 4 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: "var(--muted-even)", marginBottom: 2 }}>Posture Rating (1–5)</div>
                  <div style={{ display: "flex", gap: 2 }}>
                    {[1,2,3,4,5].map(n => (
                      <button key={n} onClick={() => updateLog(key, "rating", n)} style={{ flex: 1, padding: "4px 0", borderRadius: 4, border: "none", cursor: "pointer", fontSize: 11, background: parseInt(entry.rating) === n ? (n <= 2 ? "#ef444444" : n <= 3 ? "#eab30844" : "#6366f144") : "#334155", color: parseInt(entry.rating) === n ? "#fff" : "#64748b" }}>{n}</button>
                    ))}
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: "var(--muted-even)", marginBottom: 2 }}>Wall Test Gap (cm)</div>
                  <input type="number" value={entry.wallGap || ""} onChange={e => updateLog(key, "wallGap", e.target.value)} placeholder="—" step="0.5"
                    style={{ width: "100%", padding: "4px 6px", borderRadius: 6, border: "1px solid #334155", background: "transparent", color: "#e2e8f0", fontSize: 13, fontFamily: "'DM Mono', monospace", textAlign: "center", outline: "none", boxSizing: "border-box" }} />
                </div>
              </div>
              <input placeholder="Notes" value={entry.notes || ""} onChange={e => updateLog(key, "notes", e.target.value)}
                style={{ width: "100%", padding: "4px 8px", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", color: "var(--muted)", fontSize: 11, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
            </div>
          );
        })}
      </Card>
    )}

    {view === "milestones" && (<>
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>Posture Milestones</span>
          <span style={{ fontSize: 22, fontWeight: 700, color: "#6366f1", fontFamily: "'DM Mono', monospace" }}>{completedMilestones}/{posture.milestones.length}</span>
        </div>
        <ProgressBar value={completedMilestones} max={posture.milestones.length} color="#6366f1" />
      </Card>
      {posture.milestones.map(m => (
        <div key={m.id} onClick={() => toggleMilestone(m.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px", marginBottom: 4, borderRadius: 8, cursor: "pointer", background: m.done ? "#6366f111" : "#1e293b", border: `1px solid ${m.done ? "#6366f133" : "#334155"}` }}>
          <div style={{ width: 24, height: 24, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", background: m.done ? "#6366f1" : "#334155", color: "#fff", fontSize: 14, flexShrink: 0 }}>{m.done ? "✓" : ""}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: m.done ? "#6366f1" : "#e2e8f0", textDecoration: m.done ? "line-through" : "none" }}>{m.name}</div>
            <div style={{ fontSize: 11, color: "var(--muted-even)" }}>Target: {m.target}</div>
          </div>
          {m.done && m.date && <div style={{ fontSize: 11, color: "var(--muted-even)" }}>{new Date(m.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</div>}
        </div>
      ))}
    </>)}
  </>);
}

function DashboardTab({ data, save, latestWeight, weightShift, weeklyShift, latestBodyFat, bodyFatShift, bodyFatGoal, bodyFatEntries, daysIn, daysLeft, totalDays, milestonesComplete, weightEntries, cycleDay, cyclePhase, startWeight, targetWeight }) {
  const chartData = weightEntries.map(([k, v]) => ({ date: new Date(k).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }), weight: parseFloat(v) }));
  const projectedFinal = latestWeight && weeklyShift !== 0 ? latestWeight + (weeklyShift * daysLeft / 7) : null;

  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 6);
  const recentWorkouts = (data.workouts || []).filter(w => {
    const wDate = new Date(w.date);
    return !Number.isNaN(wDate.getTime()) && wDate >= sevenDaysAgo && wDate <= today;
  });
  const recentWorkoutCount = recentWorkouts.length;
  const weeklyCaloriesBurned = recentWorkouts.reduce((sum, w) => sum + (parseInt(w.calories, 10) || 0), 0);
  const avgDuration = recentWorkouts.length > 0 ? recentWorkouts.reduce((sum, w) => sum + (parseInt(w.duration, 10) || 0), 0) / recentWorkouts.length : 0;
  const completedExerciseCount = recentWorkouts.reduce((sum, w) => sum + (w.exercises?.filter(ex => ex.completed).length || 0), 0);
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(today);
    day.setDate(today.getDate() - 6 + i);
    return day;
  });
  const workoutTrend = last7Days.map(d => {
    const key = dayKey(d);
    const count = (data.workouts || []).filter(w => dayKey(new Date(w.date)) === key).length;
    return { date: formatDate(d), count };
  });

  const bodyFatChartData = bodyFatEntries.map(([k, v]) => ({ date: new Date(k).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }), bodyFat: parseFloat(v) }));
  const bodyFatStart = data.settings?.startBodyFat ? parseFloat(data.settings.startBodyFat) : null;
  const todaySession = SESSION_ADJUSTMENTS.find(s => {
    const dow = today.getDay();
    const map = { "Sat — Lower Strength": 6, "Thu — Upper Push": 4, "Tue — Lower Stability": 2, "Sun — Upper Pull": 0 };
    return map[s.session] === dow || (s.session === "Mon/Wed — Rucking" && (dow === 1 || dow === 3));
  });
  const loggedDays = new Set(recentWorkouts.map(w => dayKey(new Date(w.date)))).size;
  const consistency = Math.round(Math.min(100, (loggedDays / 7) * 50 + Math.min(completedExerciseCount / 21, 1) * 30 + Math.min(avgDuration / 60, 1) * 20));
  const phaseKey = cyclePhase ? (cyclePhase.name === "Menstrual" ? "menstrual" : cyclePhase.name === "Follicular" ? "follicular" : cyclePhase.name === "Ovulation" ? "ovulation" : cyclePhase.name === "Early Luteal" ? "earlyLuteal" : "lateLuteal") : null;

  return (<>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14, marginBottom: 14 }}>
      <Card style={{ minHeight: 180 }}>
        <SectionHeader title="Overview" subtitle="Track weight, weekly workouts and progress at a glance" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10, marginTop: 10 }}>
          <StatBox label="Current" value={latestWeight ? latestWeight.toFixed(1) : "—"} unit="kg" color={COLORS.blue} />
          <StatBox label="Shift" value={latestWeight ? `${weightShift >= 0 ? "+" : ""}${weightShift.toFixed(1)}` : "—"} unit="kg" color={COLORS.green} />
          <StatBox label="Consistency" value={`${consistency}%`} color={COLORS.gold} />
          <StatBox label="Avg shift" value={latestWeight ? `${weeklyShift >= 0 ? "+" : ""}${weeklyShift.toFixed(2)}` : "—"} unit="kg/wk" color={COLORS.teal} />
        </div>
      </Card>

      <Card style={{ minHeight: 180 }}>
        <SectionHeader title="Workout summary" subtitle="Recent session details and weekly totals" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10, marginTop: 10 }}>
          <StatBox label="Workouts 7d" value={recentWorkoutCount || "0"} color={COLORS.orange} />
          <StatBox label="Calories" value={weeklyCaloriesBurned ? weeklyCaloriesBurned : "—"} unit="kcal" color={COLORS.red} />
          <StatBox label="Avg Duration" value={recentWorkoutCount ? `${Math.round(avgDuration)}m` : "—"} color={COLORS.teal} />
          <StatBox label="Exercises Checked" value={completedExerciseCount || "0"} color={COLORS.green} />
        </div>
        {recentWorkouts.length > 0 && (
          <div style={{ marginTop: 12, fontSize: 12, color: "var(--muted)" }}>
            Last workout: {recentWorkouts[recentWorkouts.length - 1].type} on {new Date(recentWorkouts[recentWorkouts.length - 1].date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
          </div>
        )}
      </Card>
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14, marginBottom: 14 }}>
      <Card>
        <SectionHeader title="Weekly Workout Frequency" subtitle="See how many sessions you logged each day" />
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={workoutTrend} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <XAxis dataKey="date" tick={{ fill: "var(--muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} domain={[0, "dataMax + 1"]} tick={{ fill: "var(--muted)", fontSize: 10 }} axisLine={false} tickLine={false} width={30} />
            <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12, color: "var(--text)" }} />
            <Bar dataKey="count" fill={COLORS.orange} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <div style={{ display: "grid", gap: 14 }}>
        {cyclePhase ? (
          <Card style={{ borderLeft: `4px solid ${cyclePhase.color}`, background: "var(--surface)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8, gap: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 11, color: "var(--muted-darker)", marginBottom: 2, textTransform: "uppercase", letterSpacing: 0.5 }}>Cycle — Day {cycleDay}</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: cyclePhase.color }}>{cyclePhase.icon} {cyclePhase.name}</div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{cyclePhase.days}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: cyclePhase.color, fontFamily: "'DM Mono', monospace" }}>{cyclePhase.intensity}</div>
                <div style={{ fontSize: 10, color: "var(--muted-darker)" }}>intensity</div>
                <div style={{ fontSize: 12, color: cyclePhase.color, fontWeight: 600, marginTop: 2 }}>{cyclePhase.calories} kcal</div>
              </div>
            </div>
            <div style={{ fontSize: 13, color: "#e2e8f0", lineHeight: 1.5, marginBottom: todaySession ? 10 : 0 }}>{cyclePhase.training}</div>
            {todaySession && phaseKey && (
              <div style={{ borderTop: "1px solid #334155", paddingTop: 8, marginTop: 4 }}>
                <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>Today — {todaySession.session}</div>
                <div style={{ fontSize: 13, color: cyclePhase.color, fontWeight: 500 }}>{todaySession[phaseKey]}</div>
              </div>
            )}
          </Card>
        ) : (
          <Card style={{ borderLeft: "4px solid #334155" }}>
            <div style={{ fontSize: 13, color: "#64748b" }}>
              Set your period start date in the <span style={{ color: COLORS.pink, fontWeight: 600 }}>Cycle</span> tab to see today's training guidance here.
            </div>
          </Card>
        )}

        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, color: "#94a3b8" }}>Recomposition progress</span>
            <span style={{ fontSize: 13, color: COLORS.blue, fontWeight: 600, fontFamily: "'DM Mono', monospace" }}>{latestWeight ? Math.max(0, Math.min(100, Math.round((Math.abs(latestWeight - startWeight) / Math.max(1, Math.abs(targetWeight - startWeight))) * 100))) : 0}%</span>
          </div>
          <ProgressBar value={latestWeight ? Math.abs(latestWeight - startWeight) : 0} max={Math.max(1, Math.abs(targetWeight - startWeight))} color={COLORS.blue} />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11, color: "#475569" }}>
            <span>{startWeight} kg</span>
            {projectedFinal && <span style={{ color: COLORS.teal }}>Est. final: {projectedFinal.toFixed(1)} kg</span>}
            <span>{targetWeight} kg</span>
          </div>
        </Card>
      </div>
    </div>

    {/* Settings */}
    <Card style={{ borderLeft: `4px solid ${!data.settings?.startWeight ? "#eab308" : "#334155"}` }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: !data.settings?.startWeight ? "#eab308" : "#94a3b8", marginBottom: 8 }}>
        {!data.settings?.startWeight ? "⚠️ Set your starting stats" : "Settings"}
      </div>
      <InputRow label="Start weight (kg)" value={data.settings?.startWeight || ""} placeholder="e.g. 64.0"
        onChange={v => save({ ...data, settings: { ...data.settings, startWeight: v } })} />
      <InputRow label="Target weight (kg)" value={data.settings?.targetWeight || ""} placeholder="e.g. 62.0"
        onChange={v => save({ ...data, settings: { ...data.settings, targetWeight: v } })} />
      <InputRow label="Start body fat (%)" value={data.settings?.startBodyFat || ""} placeholder="e.g. 24"
        onChange={v => save({ ...data, settings: { ...data.settings, startBodyFat: v } })} />
      <InputRow label="Goal body fat (%)" value={data.settings?.goalBodyFat || ""} placeholder="e.g. 18"
        onChange={v => save({ ...data, settings: { ...data.settings, goalBodyFat: v } })} />
      <InputRow label="Program start date" value={data.settings?.startDate || ""} placeholder="2026-03-15"
        type="date" onChange={v => save({ ...data, settings: { ...data.settings, startDate: v } })} />
      <InputRow label="Program end date" value={data.settings?.endDate || ""} placeholder="2026-06-04"
        type="date" onChange={v => save({ ...data, settings: { ...data.settings, endDate: v } })} />
    </Card>
    {chartData.length > 1 && (
      <Card>
        <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 8 }}>Weight Trend</div>
        <ResponsiveContainer width="100%" height={140}>
          <AreaChart data={chartData}>
            <defs><linearGradient id="wg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={COLORS.blue} stopOpacity={0.3}/><stop offset="95%" stopColor={COLORS.blue} stopOpacity={0}/></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="date" tick={{ fill: "var(--muted-even)", fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis domain={["dataMin - 1", "dataMax + 1"]} tick={{ fill: "var(--muted-even)", fontSize: 10 }} axisLine={false} tickLine={false} width={35} />
            <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12, color: "var(--text)" }} />
            <Area type="monotone" dataKey="weight" stroke={COLORS.blue} strokeWidth={2} fill="url(#wg)" dot={{ fill: COLORS.blue, r: 3 }} />
          </AreaChart>
        </ResponsiveContainer>
      </Card>
    )}
    {bodyFatChartData.length > 0 && (
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 6 }}>Body fat status</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.pink }}>{latestBodyFat ? `${latestBodyFat.toFixed(1)}%` : "—"}</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 10, width: "100%" }}>
            <StatBox label="Change" value={bodyFatShift != null ? `${bodyFatShift >= 0 ? "+" : ""}${bodyFatShift.toFixed(1)}` : "—"} unit="%" color={COLORS.purple} />
            <StatBox label="Goal" value={bodyFatGoal ? `${bodyFatGoal.toFixed(1)}%` : "—"} color={COLORS.blue} />
          </div>
        </div>
        {bodyFatStart != null && latestBodyFat != null && bodyFatGoal != null ? (
          <>
            <ProgressBar value={Math.max(0, Math.min(100, ((bodyFatStart - latestBodyFat) / Math.max(1, bodyFatStart - bodyFatGoal)) * 100))} max={100} color={COLORS.pink} />
            <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 6 }}>Progress from start to goal body fat</div>
          </>
        ) : (
          <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 10 }}>Log start + goal body fat to track progress visually.</div>
        )}
        {bodyFatChartData.length > 1 ? (
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={bodyFatChartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <defs><linearGradient id="bf" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={COLORS.pink} stopOpacity={0.3}/><stop offset="95%" stopColor={COLORS.pink} stopOpacity={0}/></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" tick={{ fill: "var(--muted-even)", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis domain={["dataMin - 1", "dataMax + 1"]} tick={{ fill: "var(--muted-even)", fontSize: 10 }} axisLine={false} tickLine={false} width={35} />
              <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12, color: "var(--text)" }} />
              <Area type="monotone" dataKey="bodyFat" stroke={COLORS.pink} strokeWidth={2} fill="url(#bf)" dot={{ fill: COLORS.pink, r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ fontSize: 12, color: "#94a3b8" }}>Add multiple body fat readings to view your trend.</div>
        )}
      </Card>
    )}
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 13, color: "#94a3b8" }}>Milestones</span>
        <span style={{ fontSize: 13, color: COLORS.purple, fontWeight: 600 }}>{milestonesComplete}/{(data.milestones || []).length}</span>
      </div>
      <ProgressBar value={milestonesComplete} max={(data.milestones || []).length} color={COLORS.purple} />
      <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6 }}>
        {(data.milestones || []).map(m => (
          <span key={m.id} style={{ fontSize: 11, padding: "3px 8px", borderRadius: 12, background: m.done ? "#16a34a22" : "#334155", color: m.done ? COLORS.green : "#64748b", border: `1px solid ${m.done ? "#16a34a44" : "#475569"}` }}>{m.done ? "✓" : "○"} {m.name}</span>
        ))}
      </div>
    </Card>
    <Card>
      <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 8 }}>Quick Log — Today ({formatDate(new Date())})</div>
      <InputRow label="Weight (kg)" value={data.weights?.[dayKey(new Date())] || ""} onChange={v => save({ ...data, weights: { ...data.weights, [dayKey(new Date())]: v } })} placeholder="e.g. 63.2" />
      <InputRow label="Body fat (%)" value={data.measurements?.bodyFat?.[dayKey(new Date())] || ""} onChange={v => save({ ...data, measurements: { ...data.measurements, bodyFat: { ...data.measurements?.bodyFat, [dayKey(new Date())]: v } } })} placeholder="e.g. 22.5" step="0.1" />
      <InputRow label="Steps" value={data.steps?.[dayKey(new Date())]?.total || ""} onChange={v => save({ ...data, steps: { ...data.steps, [dayKey(new Date())]: { ...data.steps?.[dayKey(new Date())], total: v } } })} placeholder="e.g. 8500" step="1" />
      <InputRow label="Calories" value={data.nutrition?.[dayKey(new Date())]?.cal || ""} onChange={v => save({ ...data, nutrition: { ...data.nutrition, [dayKey(new Date())]: { ...data.nutrition?.[dayKey(new Date())], cal: v } } })} placeholder="e.g. 1400" step="1" />
      <InputRow label="Protein (g)" value={data.nutrition?.[dayKey(new Date())]?.protein || ""} onChange={v => save({ ...data, nutrition: { ...data.nutrition, [dayKey(new Date())]: { ...data.nutrition?.[dayKey(new Date())], protein: v } } })} placeholder="e.g. 120" step="1" />
    </Card>
  </>);
}

function WeightTab({ data, save, weightEntries, startDate = START_DATE }) {
  const [week, setWeek] = useState(() => Math.min(8, Math.max(0, Math.ceil(daysBetween(startDate, new Date()) / 7) - 1)));
  const weekStart = new Date(startDate.getTime() + week * 7 * 86400000);
  const days = Array.from({ length: 7 }, (_, i) => new Date(weekStart.getTime() + (i + 1) * 86400000));
  const chartData = weightEntries.map(([k, v]) => ({ date: new Date(k).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }), weight: parseFloat(v) }));
  const weekWeights = days.map(d => data.weights?.[dayKey(d)]).filter(Boolean).map(Number);
  const weekAvg = weekWeights.length > 0 ? (weekWeights.reduce((a, b) => a + b, 0) / weekWeights.length).toFixed(1) : "—";

  return (<>
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <button onClick={() => setWeek(Math.max(0, week - 1))} style={{ background: "#334155", border: "none", color: "#e2e8f0", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontFamily: "inherit" }}>←</button>
        <span style={{ fontSize: 14, fontWeight: 600 }}>Week {week + 1} — {formatDate(days[0])} to {formatDate(days[6])}</span>
        <button onClick={() => setWeek(Math.min(8, week + 1))} style={{ background: "#334155", border: "none", color: "#e2e8f0", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontFamily: "inherit" }}>→</button>
      </div>
      {days.map(d => (
        <div key={dayKey(d)} style={{ marginBottom: 10 }}>
          <InputRow label={d.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short" })} value={data.weights?.[dayKey(d)] || ""} placeholder="—"
            onChange={v => { const w = { ...data.weights }; if (v) w[dayKey(d)] = v; else delete w[dayKey(d)]; save({ ...data, weights: w }); }} />
          <InputRow label="Body fat (%)" value={data.measurements?.bodyFat?.[dayKey(d)] || ""} placeholder="—"
            onChange={v => { const bf = { ...data.measurements?.bodyFat }; if (v) bf[dayKey(d)] = v; else delete bf[dayKey(d)]; save({ ...data, measurements: { ...data.measurements, bodyFat: bf } }); }} step="0.1" />
        </div>
      ))}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, padding: "8px 0", borderTop: "1px solid #334155" }}>
        <span style={{ fontSize: 13, color: "#94a3b8" }}>Week Average</span>
        <span style={{ fontSize: 16, fontWeight: 700, color: COLORS.blue, fontFamily: "'DM Mono', monospace" }}>{weekAvg} kg</span>
      </div>
    </Card>
    {chartData.length > 1 && (
      <Card>
        <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 8 }}>All Weeks</div>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData}>
            <defs><linearGradient id="wg2" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={COLORS.blue} stopOpacity={0.3}/><stop offset="95%" stopColor={COLORS.blue} stopOpacity={0}/></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="date" tick={{ fill: "var(--muted-even)", fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis domain={["dataMin - 1", "dataMax + 1"]} tick={{ fill: "var(--muted-even)", fontSize: 10 }} axisLine={false} tickLine={false} width={35} />
            <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12, color: "var(--text)" }} />
            <Area type="monotone" dataKey="weight" stroke={COLORS.blue} strokeWidth={2} fill="url(#wg2)" dot={{ fill: COLORS.blue, r: 3 }} />
          </AreaChart>
        </ResponsiveContainer>
      </Card>
    )}
  </>);
}

function WorkoutTab({ data, save }) {
  const [session, setSession] = useState({
    date: dayKey(new Date()),
    type: "Lower Strength",
    template: "Custom",
    calories: "",
    bodyWeight: "",
    duration: "",
    notes: "",
    exercises: [{ name: "", sets: ["", "", "", ""], completed: false, notes: "" }],
  });
  const sessionTypes = ["Lower Strength", "Upper Push", "Upper Pull", "Lower Stability", "Ruck/Walk", "Hip Rehab"];
  const templateOptions = ["Custom", ...WORKOUT_TEMPLATES.map(t => t.key)];
  const recentWorkouts = data.workouts || [];
  const lastWorkout = recentWorkouts.length > 0 ? recentWorkouts[recentWorkouts.length - 1] : null;

  const completedExerciseCount = session.exercises.filter(ex => ex.completed).length;
  const exerciseCount = session.exercises.filter(ex => ex.name.trim()).length;

  const applyTemplate = (templateKey) => {
    const template = WORKOUT_TEMPLATES.find(t => t.key === templateKey);
    if (!template) return;
    setSession({
      ...session,
      type: template.label,
      template: template.key,
      exercises: template.exercises.map(ex => ({ ...ex, completed: false })),
    });
  };

  const addExercise = () => setSession({ ...session, exercises: [...session.exercises, { name: "", sets: ["", "", "", ""], completed: false, notes: "" }] });
  const fillRecentWorkout = () => {
    if (!lastWorkout) return;
    const { id, ...rest } = lastWorkout;
    setSession({
      ...rest,
      date: dayKey(new Date()),
      template: "Custom",
      exercises: rest.exercises.map(ex => ({ ...ex, completed: false })),
    });
  };
  const updateExercise = (idx, field, val) => {
    const ex = [...session.exercises];
    if (field === "name" || field === "notes" || field === "completed") ex[idx][field] = val;
    else ex[idx].sets[field] = val;
    setSession({ ...session, exercises: ex, template: "Custom" });
  };
  const toggleExerciseComplete = (idx) => {
    const ex = [...session.exercises];
    ex[idx].completed = !ex[idx].completed;
    setSession({ ...session, exercises: ex, template: "Custom" });
  };
  const removeExercise = (idx) => {
    const ex = session.exercises.filter((_, i) => i !== idx);
    setSession({ ...session, exercises: ex.length ? ex : [{ name: "", sets: ["", "", "", ""], completed: false, notes: "" }], template: "Custom" });
  };

  const saveSession = async () => {
    const filtered = session.exercises.filter(e => e.name.trim());
    if (!filtered.length) return;
    await save({ ...data, workouts: [...(data.workouts || []), { ...session, exercises: filtered, id: Date.now() }] });
    setSession({ date: dayKey(new Date()), type: "Lower Strength", calories: "", bodyWeight: "", duration: "", notes: "", exercises: [{ name: "", sets: ["", "", "", ""], completed: false, notes: "" }] });
  };

  return (<>
    <Card>
      <SectionHeader title="Log Workout" subtitle="Enter session details, calories, weight and exercise checklist" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginBottom: 16 }}>
        <select value={session.template} onChange={e => {
            const value = e.target.value;
            if (value === "Custom") setSession({ ...session, template: "Custom" });
            else applyTemplate(value);
          }}
          style={{ width: "100%", padding: "12px 14px", borderRadius: 14, border: "1px solid var(--border)", background: "var(--input-bg)", color: "var(--text)", fontSize: 13, fontFamily: "inherit" }}>
          {templateOptions.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <input type="date" value={session.date} onChange={e => setSession({ ...session, date: e.target.value, template: "Custom" })}
          style={{ width: "100%", padding: "12px 14px", borderRadius: 14, border: "1px solid var(--border)", background: "var(--input-bg)", color: "var(--text)", fontSize: 13, fontFamily: "inherit" }} />
        <select value={session.type} onChange={e => setSession({ ...session, type: e.target.value, template: "Custom" })}
          style={{ width: "100%", padding: "12px 14px", borderRadius: 14, border: "1px solid var(--border)", background: "var(--input-bg)", color: "var(--text)", fontSize: 13, fontFamily: "inherit" }}>
          {sessionTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <input type="number" value={session.calories} onChange={e => setSession({ ...session, calories: e.target.value, template: "Custom" })} placeholder="Calories burned"
          style={{ width: "100%", padding: "12px 14px", borderRadius: 14, border: "1px solid var(--border)", background: "var(--input-bg)", color: "var(--text)", fontSize: 13, fontFamily: "inherit" }} />
        <input type="number" value={session.bodyWeight} onChange={e => setSession({ ...session, bodyWeight: e.target.value, template: "Custom" })} placeholder="Body weight (kg)"
          style={{ width: "100%", padding: "12px 14px", borderRadius: 14, border: "1px solid var(--border)", background: "var(--input-bg)", color: "var(--text)", fontSize: 13, fontFamily: "inherit" }} />
        <input type="text" value={session.duration} onChange={e => setSession({ ...session, duration: e.target.value, template: "Custom" })} placeholder="Duration (min)"
          style={{ width: "100%", padding: "12px 14px", borderRadius: 14, border: "1px solid var(--border)", background: "var(--input-bg)", color: "var(--text)", fontSize: 13, fontFamily: "inherit" }} />
        <input type="text" value={session.notes} onChange={e => setSession({ ...session, notes: e.target.value, template: "Custom" })} placeholder="Session notes"
          style={{ width: "100%", padding: "12px 14px", borderRadius: 14, border: "1px solid var(--border)", background: "var(--input-bg)", color: "var(--muted)", fontSize: 13, fontFamily: "inherit" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 12, flexWrap: "wrap" }}>
        <div style={{ fontSize: 12, color: "var(--muted)" }}>{exerciseCount} exercises, {completedExerciseCount} checked</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {lastWorkout && (
            <button onClick={fillRecentWorkout} style={{ padding: "10px 14px", borderRadius: 12, border: "1px solid var(--border)", background: "var(--surface-alt)", color: "var(--text)", cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>
              Load last workout
            </button>
          )}
          <button onClick={addExercise} style={{ padding: "10px 14px", borderRadius: 12, border: "1px dashed var(--border)", background: "transparent", color: "var(--muted-darker)", cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>+ Add exercise</button>
        </div>
      </div>
      {session.exercises.map((ex, idx) => (
        <div key={idx} style={{ background: ex.completed ? "#152d16" : "var(--bg)", borderRadius: 14, padding: 14, marginBottom: 12, border: ex.completed ? "1px solid #16a34a" : "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", flex: 1, minWidth: 200 }}>
              <input type="checkbox" checked={ex.completed} onChange={() => toggleExerciseComplete(idx)}
                style={{ width: 18, height: 18, borderRadius: 4, accentColor: COLORS.green }} />
              <input placeholder="Exercise name" value={ex.name} onChange={e => updateExercise(idx, "name", e.target.value)}
                style={{ flex: 1, padding: "8px 10px", borderRadius: 12, border: "1px solid var(--border)", background: "transparent", color: "var(--text)", fontSize: 13, fontFamily: "inherit", outline: "none" }} />
            </label>
            <button onClick={() => removeExercise(idx)} style={{ background: "var(--border)", border: "none", color: "var(--muted)", borderRadius: 10, padding: "8px 12px", cursor: "pointer", fontSize: 12 }}>Remove</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10, marginBottom: 10 }}>
            {[0, 1, 2, 3].map(s => (
              <div key={s} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ fontSize: 10, color: "var(--muted-darker)", textTransform: "uppercase", letterSpacing: 0.5 }}>Set {s + 1}</div>
                <input value={ex.sets[s]} onChange={e => updateExercise(idx, s, e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 12, border: "1px solid var(--border)", background: "transparent", color: "var(--text)", fontSize: 13, fontFamily: "'DM Mono', monospace", textAlign: "center", outline: "none" }} />
              </div>
            ))}
          </div>
          <textarea value={ex.notes} onChange={e => updateExercise(idx, "notes", e.target.value)} placeholder="Exercise notes / load / tempo"
            rows={3} style={{ width: "100%", padding: "10px 12px", borderRadius: 12, border: "1px solid var(--border)", background: "var(--input-bg)", color: "var(--muted)", fontSize: 12, fontFamily: "inherit", outline: "none", resize: "vertical" }} />
        </div>
      ))}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
        <button onClick={saveSession} style={{ minWidth: 160, padding: "12px 16px", borderRadius: 12, border: "none", background: COLORS.blue, color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: "inherit" }}>Save workout</button>
      </div>
    </Card>
    {(data.workouts || []).length > 0 && (
      <Card>
        <SectionHeader title="Recent Workouts" subtitle="Quick review of the last sessions" />
        {[...(data.workouts || [])].slice(-5).reverse().map(w => (
          <div key={w.id} style={{ background: "var(--bg)", borderRadius: 12, padding: 14, marginBottom: 10, border: "1px solid var(--border)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.orange }}>{w.type}</div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>{new Date(w.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</div>
              </div>
              <div style={{ textAlign: "right", fontSize: 11, color: "var(--muted)" }}>
                {w.calories && <div>Calories: <span style={{ color: "var(--text)" }}>{w.calories}</span></div>}
                {w.bodyWeight && <div>Weight: <span style={{ color: "var(--text)" }}>{w.bodyWeight}kg</span></div>}
                {w.duration && <div>Duration: <span style={{ color: "var(--text)" }}>{w.duration}</span></div>}
              </div>
            </div>
            {w.notes && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 10, marginBottom: 10 }}>{w.notes}</div>}
            {w.exercises.map((ex, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 18, height: 18, display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: 6, background: ex.completed ? COLORS.green : "var(--border)", color: "#fff", fontSize: 11 }}>{ex.completed ? "✓" : ""}</span>
                  <span style={{ color: "var(--text)" }}>{ex.name}</span>
                </div>
                <span>{ex.sets.filter(Boolean).join(" | ")}</span>
              </div>
            ))}
          </div>
        ))}
      </Card>
    )}
  </>);
}

function StepsTab({ data, save }) {
  const [week, setWeek] = useState(() => Math.min(8, Math.max(0, Math.ceil(daysBetween(START_DATE, new Date()) / 7) - 1)));
  const weekStart = new Date(START_DATE.getTime() + week * 7 * 86400000);
  const days = Array.from({ length: 7 }, (_, i) => new Date(weekStart.getTime() + (i + 1) * 86400000));
  const updateStep = (d, field, val) => save({ ...data, steps: { ...data.steps, [dayKey(d)]: { ...data.steps?.[dayKey(d)], [field]: val } } });
  const weekSteps = days.map(d => parseInt(data.steps?.[dayKey(d)]?.total) || 0);
  const weekTotal = weekSteps.reduce((a, b) => a + b, 0);
  const daysOnTarget = weekSteps.filter(s => s >= 8000).length;

  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <button onClick={() => setWeek(Math.max(0, week - 1))} style={{ background: "var(--border)", border: "none", color: "var(--text)", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontFamily: "inherit" }}>←</button>
        <span style={{ fontSize: 14, fontWeight: 600 }}>Week {week + 1}</span>
        <button onClick={() => setWeek(Math.min(8, week + 1))} style={{ background: "var(--border)", border: "none", color: "var(--text)", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontFamily: "inherit" }}>→</button>
      </div>
      <div style={{ display: "flex", justifyContent: "space-around", marginBottom: 12 }}>
        <StatBox label="Week Total" value={weekTotal > 0 ? (weekTotal/1000).toFixed(1)+"k" : "—"} color={COLORS.teal} small />
        <StatBox label="Daily Avg" value={weekSteps.filter(Boolean).length > 0 ? Math.round(weekTotal/weekSteps.filter(Boolean).length).toLocaleString() : "—"} color={COLORS.blue} small />
        <StatBox label="On Target" value={`${daysOnTarget}/7`} color={daysOnTarget >= 5 ? COLORS.green : COLORS.orange} small />
      </div>
      {days.map(d => {
        const key = dayKey(d); const entry = data.steps?.[key] || {}; const isToday = key === dayKey(new Date());
        return (
          <div key={key} style={{ background: isToday ? "#1a2744" : "#0f172a", borderRadius: 8, padding: 10, marginBottom: 6, border: isToday ? "1px solid #2563eb44" : "1px solid transparent" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: isToday ? COLORS.blue : "#94a3b8", marginBottom: 6 }}>
              {d.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short" })} {isToday && "← Today"}{parseInt(entry.total) >= 8000 && <span style={{ marginLeft: 8, color: COLORS.green }}>✓</span>}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {[["total","Steps"],["rucked","Rucked"],["vest","Vest (kg)"]].map(([field, label]) => (
                <div key={field} style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: "var(--muted-even)", marginBottom: 2 }}>{label}</div>
                  <input type="number" value={entry[field] || ""} onChange={e => updateStep(d, field, e.target.value)} placeholder="—"
                    style={{ width: "100%", padding: "4px 6px", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", color: "var(--text)", fontSize: 13, fontFamily: "'DM Mono', monospace", textAlign: "center", outline: "none", boxSizing: "border-box" }} />
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </Card>
  );
}

function NutritionTab({ data, save }) {
  const [week, setWeek] = useState(() => Math.min(8, Math.max(0, Math.ceil(daysBetween(START_DATE, new Date()) / 7) - 1)));
  const weekStart = new Date(START_DATE.getTime() + week * 7 * 86400000);
  const days = Array.from({ length: 7 }, (_, i) => new Date(weekStart.getTime() + (i + 1) * 86400000));
  const updateNutrition = (d, field, val) => save({ ...data, nutrition: { ...data.nutrition, [dayKey(d)]: { ...data.nutrition?.[dayKey(d)], [field]: val } } });
  const weekCals = days.map(d => parseInt(data.nutrition?.[dayKey(d)]?.cal) || 0).filter(Boolean);
  const weekProtein = days.map(d => parseInt(data.nutrition?.[dayKey(d)]?.protein) || 0).filter(Boolean);
  const avgCal = weekCals.length > 0 ? Math.round(weekCals.reduce((a,b)=>a+b,0)/weekCals.length) : 0;
  const avgProtein = weekProtein.length > 0 ? Math.round(weekProtein.reduce((a,b)=>a+b,0)/weekProtein.length) : 0;

  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <button onClick={() => setWeek(Math.max(0, week-1))} style={{ background: "#334155", border: "none", color: "#e2e8f0", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontFamily: "inherit" }}>←</button>
        <span style={{ fontSize: 14, fontWeight: 600 }}>Week {week+1}</span>
        <button onClick={() => setWeek(Math.min(8, week+1))} style={{ background: "#334155", border: "none", color: "#e2e8f0", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontFamily: "inherit" }}>→</button>
      </div>
      <div style={{ display: "flex", justifyContent: "space-around", marginBottom: 12 }}>
        <StatBox label="Avg Calories" value={avgCal||"—"} color={avgCal>=1300&&avgCal<=1500?COLORS.green:COLORS.orange} small />
        <StatBox label="Avg Protein" value={avgProtein?avgProtein+"g":"—"} color={avgProtein>=115?COLORS.green:COLORS.orange} small />
        <StatBox label="Days Logged" value={`${weekCals.length}/7`} color={COLORS.blue} small />
      </div>
      {days.map(d => {
        const key = dayKey(d); const entry = data.nutrition?.[key] || {}; const cal = parseInt(entry.cal)||0; const protein = parseInt(entry.protein)||0; const isToday = key === dayKey(new Date());
        return (
          <div key={key} style={{ background: isToday ? "#1a2744" : "#0f172a", borderRadius: 8, padding: 10, marginBottom: 6, border: isToday ? "1px solid #2563eb44" : "1px solid transparent" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: isToday ? COLORS.blue : "#94a3b8", marginBottom: 6 }}>
              {d.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short" })} {isToday && "← Today"}
              {cal>0&&cal>=1300&&cal<=1500 && <span style={{ marginLeft: 6, fontSize: 10, color: COLORS.green }}>✓ cal</span>}
              {protein>0&&protein>=115 && <span style={{ marginLeft: 6, fontSize: 10, color: COLORS.green }}>✓ protein</span>}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {[["cal","Calories"],["protein","Protein (g)"],["carbs","Carbs (g)"],["fat","Fat (g)"]].map(([field, label]) => (
                <div key={field} style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: "#475569", marginBottom: 2 }}>{label}</div>
                  <input type="number" value={entry[field]||""} onChange={e => updateNutrition(d, field, e.target.value)} placeholder="—"
                    style={{ width: "100%", padding: "4px 6px", borderRadius: 6, border: "1px solid #334155", background: "transparent", color: "#e2e8f0", fontSize: 13, fontFamily: "'DM Mono', monospace", textAlign: "center", outline: "none", boxSizing: "border-box" }} />
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </Card>
  );
}

function ProgressTab({ data, save }) {
  const categories = [
    { name: "Push-Up", color: COLORS.orange, metrics: ["Gornation Bar Height", "Max Reps at Height", "Eccentric (sec down)", "Full Push-Ups (max)", "Plank Hold (sec)"] },
    { name: "Pull-Up", color: COLORS.purple, metrics: ["Dead Hang (sec)", "Row Angle/Height", "Row Max Reps", "Negative (sec down)", "Negative Reps", "Band Pull-Up Reps", "Flexed Hang (sec)"] },
    { name: "Pistol Squat", color: COLORS.teal, metrics: ["Squat Depth", "ATG Split Squat Reps", "Box Height (cm)", "Counter Pistol Reps", "Eccentric (sec)", "Wobble Board (sec)"] },
    { name: "Key Lifts (kg)", color: COLORS.blue, metrics: ["Goblet Squat", "Romanian DL", "Hip Thrust", "OH Press", "Bicep Curl", "Vest Weight"] },
  ];
  const updateProgress = (cat, metric, week, val) => {
    const key = `${cat}-${metric}`;
    save({ ...data, progress: { ...data.progress, [key]: { ...data.progress?.[key], [week]: val } } });
  };
  return (<>
    {categories.map(cat => (
      <Card key={cat.name}>
        <div style={{ fontSize: 14, fontWeight: 600, color: cat.color, marginBottom: 10 }}>{cat.name}</div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "4px 6px", color: "#64748b", fontWeight: 500, minWidth: 110 }}>Metric</th>
                {[1,2,3,4,5,6,7,8].map(w => <th key={w} style={{ textAlign: "center", padding: "4px 4px", color: "#64748b", fontWeight: 500, minWidth: 52 }}>Wk{w}</th>)}
              </tr>
            </thead>
            <tbody>
              {cat.metrics.map((metric, mi) => (
                <tr key={metric} style={{ background: mi % 2 === 0 ? "#0f172a" : "transparent" }}>
                  <td style={{ padding: "4px 6px", color: "#94a3b8", fontSize: 11 }}>{metric}</td>
                  {[1,2,3,4,5,6,7,8].map(w => (
                    <td key={w} style={{ padding: "2px" }}>
                      <input value={data.progress?.[`${cat.name}-${metric}`]?.[w] || ""} onChange={e => updateProgress(cat.name, metric, w, e.target.value)}
                        style={{ width: "100%", padding: "3px 2px", borderRadius: 4, border: "1px solid var(--border)", background: "transparent", color: "var(--text)", fontSize: 11, fontFamily: "'DM Mono', monospace", textAlign: "center", outline: "none", boxSizing: "border-box" }} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    ))}
  </>);
}

function MilestonesTab({ data, save }) {
  const toggleMilestone = (id) => save({ ...data, milestones: (data.milestones||[]).map(m => m.id === id ? { ...m, done: !m.done, date: !m.done ? dayKey(new Date()) : "" } : m) });
  const categories = [...new Set((data.milestones||[]).map(m => m.category))];
  const complete = (data.milestones||[]).filter(m => m.done).length;
  const total = (data.milestones||[]).length;

  return (<>
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 600 }}>Movement Milestones</span>
        <span style={{ fontSize: 22, fontWeight: 700, color: COLORS.purple, fontFamily: "'DM Mono', monospace" }}>{complete}/{total}</span>
      </div>
      <ProgressBar value={complete} max={total} color={COLORS.purple} />
    </Card>
    {categories.map(cat => (
      <Card key={cat}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#94a3b8", marginBottom: 8 }}>{cat}</div>
        {(data.milestones||[]).filter(m => m.category === cat).map(m => (
          <div key={m.id} onClick={() => toggleMilestone(m.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 8px", marginBottom: 4, borderRadius: 8, cursor: "pointer", background: m.done ? "#16a34a11" : "#0f172a", border: `1px solid ${m.done ? "#16a34a33" : "#334155"}` }}>
            <div style={{ width: 24, height: 24, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", background: m.done ? COLORS.green : "#334155", color: "#fff", fontSize: 14, flexShrink: 0 }}>{m.done ? "✓" : ""}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: m.done ? COLORS.green : "#e2e8f0", textDecoration: m.done ? "line-through" : "none" }}>{m.name}</div>
              <div style={{ fontSize: 11, color: "#475569" }}>Target: {m.target}</div>
            </div>
            {m.done && m.date && <div style={{ fontSize: 11, color: "#475569" }}>{new Date(m.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</div>}
          </div>
        ))}
      </Card>
    ))}
    <Card style={{ background: "#1a1625", border: "1px solid #7c3aed33" }}>
      <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 6 }}>Timeline</div>
      <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.6 }}>
        <div><span style={{ color: COLORS.orange }}>Wk 5–6:</span> First push-up</div>
        <div><span style={{ color: COLORS.orange }}>Wk 8:</span> 5 unbroken push-ups</div>
        <div><span style={{ color: COLORS.purple }}>Wk 8–16:</span> First pull-up</div>
        <div><span style={{ color: COLORS.blue }}>Wk 10–14:</span> Bodyweight dips</div>
        <div><span style={{ color: COLORS.teal }}>Wk 10–12:</span> First pistol squat</div>
        <div><span style={{ color: COLORS.green }}>Wk 16–24:</span> All four mastered + visible definition</div>
      </div>
    </Card>
    <button onClick={async () => { if (confirm("Reset all data? This cannot be undone.")) { await save({ weights: {}, workouts: [], steps: {}, nutrition: {}, progress: {}, milestones: defaultMilestones, measurements: { start: {}, current: {} } }); } }}
      style={{ width: "100%", padding: "10px", marginTop: 8, borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--muted-darker)", cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>
      Reset All Data
    </button>
  </>);
}

export default App;
