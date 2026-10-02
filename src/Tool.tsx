// Creditline: compares who did the work with who got named for it in notes and chat, to surface invisible work.
import { useMemo, useState } from "react";
import { uid, useStored } from "./lib/store";
import { ImportBox, Section, Stat, Stats } from "./ui/kit";

const T = "creditline";
type Work = { id: string; what: string; doers: string[]; credited: string[]; size: 1 | 2 | 3; date: string };
const TEAM = ["Amira", "Karim", "Nour", "Youssef", "Salma"];
const SAMPLE: Work[] = [
  { id: "w1", what: "Rebuilt the onboarding emails", doers: ["Nour"], credited: ["Karim"], size: 3, date: "2026-09-03" },
  { id: "w2", what: "Fixed the checkout bug over the weekend", doers: ["Salma"], credited: [], size: 2, date: "2026-09-08" },
  { id: "w3", what: "Client pitch deck", doers: ["Amira", "Nour"], credited: ["Amira"], size: 2, date: "2026-09-12" },
  { id: "w4", what: "Quarterly report", doers: ["Karim"], credited: ["Karim"], size: 2, date: "2026-09-19" },
  { id: "w5", what: "Mentored the two interns", doers: ["Salma"], credited: [], size: 3, date: "2026-09-25" },
];
const SAMPLE_NOTES = `Great launch this week, thanks Karim for the onboarding emails!
Amira nailed the pitch, client loved it.
Karim's quarterly report is out, well done Karim.
Shoutout to Amira and Karim for a strong month.`;

export default function Creditline() {
  const [team, setTeam] = useStored<string[]>(T, "team", TEAM);
  const [work, setWork] = useStored<Work[]>(T, "work", SAMPLE);
  const [notes, setNotes] = useStored(T, "notes", SAMPLE_NOTES);
  const [d, setD] = useState<{ what: string; doers: string[]; credited: string[]; size: 1 | 2 | 3 }>({ what: "", doers: [], credited: [], size: 2 });
  const [newName, setNewName] = useState("");

  const mentions = useMemo(() => Object.fromEntries(team.map(n => [n, (notes.match(new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi")) ?? []).length])), [notes, team]);
  const stats = team.map(n => {
    const did = work.filter(w => w.doers.includes(n)).reduce((a, w) => a + w.size / w.doers.length, 0);
    const got = work.filter(w => w.credited.includes(n)).reduce((a, w) => a + w.size / Math.max(1, w.credited.length), 0);
    return { n, did, got, gap: did - got, mentions: mentions[n] ?? 0 };
  });
  const totalDid = stats.reduce((a, s) => a + s.did, 0) || 1, totalMent = stats.reduce((a, s) => a + s.mentions, 0) || 1;
  const uncredited = work.filter(w => w.doers.some(x => !w.credited.includes(x)));
  const toggle = (arr: string[], n: string) => (arr.includes(n) ? arr.filter(x => x !== n) : [...arr, n]);
  const max = Math.max(0.01, ...stats.map(s => Math.max(s.did / totalDid, s.mentions / totalMent)));

  return (
    <div className="stack">
      <Section title="Share of the work vs share of the credit">
        <Stats><Stat value={work.length} label="Pieces of work logged" /><Stat value={uncredited.length} label="With someone left out" tone={uncredited.length ? "warn" : "good"} /><Stat value={totalMent === 1 && !stats.some(s => s.mentions) ? 0 : totalMent} label="Name mentions in notes" /></Stats>
        <div className="cl-bars">
          {stats.sort((a, b) => b.gap - a.gap).map(s => (
            <div key={s.n} className="cl-row">
              <strong>{s.n}</strong>
              <div className="cl-pair">
                <span className="cl-bar" style={{ width: `${(s.did / totalDid / max) * 68}%`, background: "var(--accent)" }}><em>{Math.round((s.did / totalDid) * 100)}% of work</em></span>
                <span className="cl-bar" style={{ width: `${(s.mentions / totalMent / max) * 68}%`, background: "var(--warn)" }}><em>{Math.round((s.mentions / totalMent) * 100)}% of mentions</em></span>
              </div>
              {s.gap > 1 && <span className="pill bad">Under-credited</span>}
              {s.gap < -1 && <span className="pill warn">Credited for others' work</span>}
            </div>
          ))}
        </div>
      </Section>

      {uncredited.length > 0 && <Section title="Say thank you to">
        <div className="stack" style={{ gap: 6 }}>{uncredited.map(w => <p key={w.id}><strong>{w.doers.filter(x => !w.credited.includes(x)).join(" and ")}</strong> for “{w.what}”</p>)}</div>
      </Section>}

      <div className="grid2">
        <Section title="Log a piece of work">
          <form className="stack" style={{ gap: 10 }} onSubmit={e => { e.preventDefault(); if (!d.what.trim() || !d.doers.length) return; setWork([{ id: uid(), ...d, what: d.what.trim(), date: new Date().toISOString().slice(0, 10) }, ...work]); setD({ what: "", doers: [], credited: [], size: 2 }); }}>
            <label className="field"><span>What was done</span><input id="cl-what" className="input" value={d.what} onChange={e => setD({ ...d, what: e.target.value })} /></label>
            <div className="field"><span>Who did it</span><div className="row" style={{ gap: 6 }}>{team.map(n => <button type="button" key={n} className="btn small" aria-pressed={d.doers.includes(n)} style={d.doers.includes(n) ? { background: "var(--ink)", color: "var(--bg)" } : undefined} onClick={() => setD({ ...d, doers: toggle(d.doers, n) })}>{n}</button>)}</div></div>
            <div className="field"><span>Who got publicly credited</span><div className="row" style={{ gap: 6 }}>{team.map(n => <button type="button" key={n} className="btn small" aria-pressed={d.credited.includes(n)} style={d.credited.includes(n) ? { background: "var(--warn)", color: "#fff", borderColor: "var(--warn)" } : undefined} onClick={() => setD({ ...d, credited: toggle(d.credited, n) })}>{n}</button>)}</div></div>
            <div className="row" style={{ alignItems: "flex-end" }}><label className="field"><span>Size</span><select id="cl-size" className="input" value={d.size} onChange={e => setD({ ...d, size: +e.target.value as 1 | 2 | 3 })}><option value={1}>Small</option><option value={2}>Medium</option><option value={3}>Large</option></select></label><button className="btn primary" type="submit">Log it</button></div>
          </form>
        </Section>
        <Section title="Meeting notes and chat">
          <ImportBox label="Paste recent notes, recaps or kudos messages. Names are counted." rows={5} onText={setNotes} />
          <p className="note" style={{ marginTop: 8 }}>{notes.split("\n").length} lines loaded.</p>
        </Section>
      </div>

      <Section title="Team">
        <div className="row" style={{ gap: 6 }}>{team.map(n => <span key={n} className="pill">{n} <button className="btn ghost small" style={{ padding: "0 4px" }} aria-label={`Remove ${n}`} onClick={() => setTeam(team.filter(x => x !== n))}>×</button></span>)}</div>
        <form className="row" style={{ marginTop: 10 }} onSubmit={e => { e.preventDefault(); if (newName.trim() && !team.includes(newName.trim())) setTeam([...team, newName.trim()]); setNewName(""); }}>
          <input id="cl-new" className="input" style={{ maxWidth: 240 }} aria-label="New team member" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Add a name" /><button className="btn small" type="submit">Add</button>
        </form>
      </Section>
      <Section title="Work log">
        <div className="table-wrap"><table className="t"><thead><tr><th>Date</th><th>Work</th><th>Done by</th><th>Credited</th><th /></tr></thead>
          <tbody>{work.map(w => <tr key={w.id}><td className="num">{w.date}</td><td>{w.what}</td><td>{w.doers.join(", ")}</td><td>{w.credited.join(", ") || <span className="pill bad">Nobody</span>}</td><td><button className="btn ghost small danger" onClick={() => setWork(work.filter(x => x.id !== w.id))}>Delete</button></td></tr>)}</tbody></table></div>
      </Section>
      <style>{`.cl-bars{display:grid;gap:12px;margin-top:18px}.cl-row{display:grid;grid-template-columns:90px 1fr auto;gap:12px;align-items:center}.cl-pair{display:grid;gap:3px}.cl-bar{position:relative;display:block;height:14px;border-radius:4px;min-width:2px}
      .cl-bar em{position:absolute;left:calc(100% + 6px);top:-2px;white-space:nowrap;font-style:normal;font-size:12px;color:var(--muted)}@media(max-width:560px){.cl-row{grid-template-columns:70px 1fr}.cl-row .pill{grid-column:2}}`}</style>
    </div>
  );
}
