import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  AlertCircle,
  Bell,
  Bookmark,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronRight,
  FileUp,
  Globe2,
  Layers3,
  Loader2,
  MapPin,
  RefreshCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  UploadCloud,
  WandSparkles,
} from "lucide-react";
import "./styles.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

const initialAnalysis = null;

function percent(value) {
  const safe = Number.isFinite(Number(value)) ? Number(value) : 0;
  return Math.max(0, Math.min(100, Math.round(safe)));
}

async function parseError(response) {
  try {
    const payload = await response.json();
    return payload.detail || payload.message || "Something went wrong.";
  } catch {
    return "Something went wrong.";
  }
}

function App() {
  const [analysis, setAnalysis] = useState(initialAnalysis);
  const [jobs, setJobs] = useState([]);
  const [savedJobs, setSavedJobs] = useState([]);
  const [alerts, setAlerts] = useState(null);
  const [filters, setFilters] = useState({ location: "", role: "", country: "" });
  const [uploading, setUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const dashboard = analysis?.dashboard || {};
  const topScore = percent(dashboard.average_match_score);
  const skillGroups = analysis?.skill_profile || {};
  const hasAnalysis = Boolean(analysis?.analysis_id);

  const allSkills = useMemo(() => analysis?.extracted_skills || [], [analysis]);
  const topJobs = jobs.length ? jobs : analysis?.recommended_jobs || [];

  useEffect(() => {
    loadSavedJobs();
    loadAlerts();
  }, []);

  async function uploadResume(file) {
    if (!file) return;
    setUploading(true);
    setError("");
    setNotice("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${API_BASE_URL}/upload_resume`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error(await parseError(response));

      const payload = await response.json();
      setAnalysis(payload);
      setJobs(payload.recommended_jobs || []);
      setFilters({
        location: payload.selected_location || "",
        role: payload.selected_role || "",
        country: payload.selected_country || "",
      });
      setNotice(`Analyzed ${payload.filename}. Your job dashboard is ready.`);
      await Promise.all([loadSavedJobs(), loadAlerts(payload.analysis_id)]);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function refreshJobs() {
    if (!analysis?.analysis_id) return;
    setRefreshing(true);
    setError("");
    setNotice("");

    const params = new URLSearchParams({
      analysis_id: analysis.analysis_id,
      location: filters.location,
      preferred_role: filters.role,
      preferred_country: filters.country,
    });

    try {
      const response = await fetch(`${API_BASE_URL}/jobs?${params}`);
      if (!response.ok) throw new Error(await parseError(response));
      const payload = await response.json();
      setJobs(payload.jobs || []);
      setAnalysis((current) => ({
        ...current,
        recommended_jobs: payload.jobs || [],
        dashboard: payload.dashboard,
        top_skill_gaps: payload.top_skill_gaps,
        country_options: payload.country_options || current.country_options,
        role_options: payload.role_options || current.role_options,
        selected_country: payload.selected_country,
        selected_location: payload.selected_location,
        selected_role: payload.selected_role,
      }));
      await loadAlerts(analysis.analysis_id);
      setNotice("Jobs refreshed for your selected role and location.");
    } catch (err) {
      setError(err.message);
    } finally {
      setRefreshing(false);
    }
  }

  async function loadSavedJobs() {
    try {
      const response = await fetch(`${API_BASE_URL}/saved-jobs`);
      if (!response.ok) return;
      const payload = await response.json();
      setSavedJobs(payload.jobs || []);
    } catch {
      setSavedJobs([]);
    }
  }

  async function loadAlerts(analysisId = analysis?.analysis_id) {
    const suffix = analysisId ? `?analysis_id=${encodeURIComponent(analysisId)}` : "";
    try {
      const response = await fetch(`${API_BASE_URL}/job-alerts${suffix}`);
      if (!response.ok) return;
      setAlerts(await response.json());
    } catch {
      setAlerts(null);
    }
  }

  async function saveJob(job) {
    setError("");
    setNotice("");
    try {
      const response = await fetch(`${API_BASE_URL}/saved-jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: job.title,
          company: job.company,
          location: job.location,
          match_score: job.match_score || 0,
          apply_link: job.apply_link,
          missing_skills: job.missing_skills || [],
        }),
      });
      if (!response.ok) throw new Error(await parseError(response));
      setNotice("Job bookmarked successfully.");
      await loadSavedJobs();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="app-shell">
      <section className="workspace">
        <aside className="sidebar">
          <div className="brand">
            <div className="brand-mark">
              <Sparkles size={22} />
            </div>
            <div>
              <p>AI Resume</p>
              <h1>Job Finder</h1>
            </div>
          </div>

          <UploadPanel uploading={uploading} onUpload={uploadResume} />

          <div className="quick-panel">
            <div className="panel-title">
              <ShieldCheck size={18} />
              <span>Backend status</span>
            </div>
            <p className="muted">Connected to FastAPI endpoints for resume analysis, job matching, saved jobs, and alerts.</p>
          </div>

          <SavedJobs jobs={savedJobs} />
        </aside>

        <section className="content">
          <header className="topbar">
            <div>
              <p className="eyebrow">Resume-first career dashboard</p>
              <h2>Find roles that match your skills, then close the gaps.</h2>
            </div>
            <div className="alert-pill">
              <Bell size={17} />
              <span>{alerts?.enabled ? `Daily alerts ${alerts.next_run_hint}` : "Alerts ready after upload"}</span>
            </div>
          </header>

          {(error || notice) && (
            <div className={error ? "message error" : "message success"}>
              {error ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
              <span>{error || notice}</span>
            </div>
          )}

          {!hasAnalysis ? (
            <EmptyState uploading={uploading} />
          ) : (
            <>
              <section className="metrics-grid">
                <Metric icon={<BriefcaseBusiness />} label="Jobs found" value={dashboard.jobs_found || topJobs.length} />
                <Metric icon={<Target />} label="Avg match" value={`${topScore}%`} accent />
                <Metric icon={<Layers3 />} label="Skills found" value={allSkills.length} />
                <Metric icon={<WandSparkles />} label="Top role" value={dashboard.top_role || filters.role || "Role detected"} wide />
              </section>

              <section className="control-strip">
                <label>
                  <span>Role</span>
                  <select value={filters.role} onChange={(event) => setFilters({ ...filters, role: event.target.value })}>
                    {(analysis.role_options || []).map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                    {!analysis.role_options?.length && <option value="">Software Engineer</option>}
                  </select>
                </label>
                <label>
                  <span>Country</span>
                  <select value={filters.country} onChange={(event) => setFilters({ ...filters, country: event.target.value })}>
                    {(analysis.country_options || []).map((country) => (
                      <option key={country.code} value={country.code}>
                        {country.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Location</span>
                  <input value={filters.location} onChange={(event) => setFilters({ ...filters, location: event.target.value })} />
                </label>
                <button className="primary-button" onClick={refreshJobs} disabled={refreshing}>
                  {refreshing ? <Loader2 className="spin" size={18} /> : <RefreshCcw size={18} />}
                  Refresh jobs
                </button>
              </section>

              <section className="analysis-grid">
                <SkillProfile groups={skillGroups} skills={allSkills} />
                <GapPanel gaps={analysis.top_skill_gaps || []} suggestions={analysis.resume_improvement_suggestions || []} />
              </section>

              <section className="jobs-section">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">Ranked matches</p>
                    <h3>Recommended jobs</h3>
                  </div>
                  <span>{topJobs.length} results</span>
                </div>
                <div className="job-list">
                  {topJobs.length ? (
                    topJobs.map((job, index) => <JobCard key={`${job.title}-${job.company}-${index}`} job={job} onSave={saveJob} />)
                  ) : (
                    <div className="empty-card">
                      <Search size={28} />
                      <p>No jobs returned yet. Check your SerpAPI key or try a broader location.</p>
                    </div>
                  )}
                </div>
              </section>
            </>
          )}
        </section>
      </section>
    </main>
  );
}

function UploadPanel({ uploading, onUpload }) {
  return (
    <label className="upload-panel">
      <input
        type="file"
        accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
        disabled={uploading}
        onChange={(event) => onUpload(event.target.files?.[0])}
      />
      <div className="upload-icon">{uploading ? <Loader2 className="spin" /> : <UploadCloud />}</div>
      <strong>{uploading ? "Analyzing resume..." : "Upload resume"}</strong>
      <span>PDF, DOCX, or TXT</span>
    </label>
  );
}

function EmptyState({ uploading }) {
  return (
    <section className="empty-state">
      <div className="empty-art">
        <FileUp size={56} />
      </div>
      <p className="eyebrow">Start with your resume</p>
      <h3>{uploading ? "Reading your resume and searching roles..." : "Upload a resume to generate your matching dashboard."}</h3>
      <p>
        The frontend will call the backend to extract skills, infer roles, search jobs, rank matches, and surface skill gaps.
      </p>
    </section>
  );
}

function Metric({ icon, label, value, accent = false, wide = false }) {
  return (
    <div className={`metric ${accent ? "accent" : ""} ${wide ? "wide" : ""}`}>
      <div className="metric-icon">{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function SkillProfile({ groups, skills }) {
  const entries = Object.entries(groups).filter(([, items]) => items?.length);
  return (
    <article className="insight-panel">
      <div className="panel-heading">
        <h3>Skill profile</h3>
        <span>{skills.length} detected</span>
      </div>
      {entries.length ? (
        entries.map(([group, items]) => (
          <div className="skill-group" key={group}>
            <strong>{group.replace("_", " + ")}</strong>
            <div className="chips">
              {items.map((skill) => (
                <span className="chip" key={skill}>
                  {skill}
                </span>
              ))}
            </div>
          </div>
        ))
      ) : (
        <p className="muted">No grouped skills detected yet.</p>
      )}
    </article>
  );
}

function GapPanel({ gaps, suggestions }) {
  return (
    <article className="insight-panel">
      <div className="panel-heading">
        <h3>Skill gaps</h3>
        <span>{gaps.length} priority</span>
      </div>
      <div className="chips gap-chips">
        {gaps.length ? gaps.map((gap) => <span className="chip warning" key={gap}>{gap}</span>) : <span className="muted">No gaps found yet.</span>}
      </div>
      <div className="suggestions">
        {suggestions.map((item) => (
          <div className="suggestion" key={item}>
            <ChevronRight size={16} />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </article>
  );
}

function JobCard({ job, onSave }) {
  const score = percent(job.match_score);
  return (
    <article className="job-card">
      <div className="score-ring" style={{ "--score": `${score}%` }}>
        <span>{score}</span>
      </div>
      <div className="job-main">
        <div className="job-title-row">
          <div>
            <h4>{job.title}</h4>
            <p>{job.company}</p>
          </div>
          <button className="icon-button" onClick={() => onSave(job)} title="Save job">
            <Bookmark size={18} />
          </button>
        </div>
        <div className="job-meta">
          <span><MapPin size={15} />{job.location}</span>
          <span><Globe2 size={15} />{job.source || "job source"}</span>
        </div>
        <p className="job-description">{job.description}</p>
        <div className="chips">
          {(job.matched_skills || []).slice(0, 5).map((skill) => <span className="chip matched" key={skill}>{skill}</span>)}
          {(job.missing_skills || []).slice(0, 4).map((skill) => <span className="chip warning" key={skill}>{skill}</span>)}
        </div>
        <a className="apply-link" href={job.apply_link} target="_blank" rel="noreferrer">
          Apply now <ChevronRight size={17} />
        </a>
      </div>
    </article>
  );
}

function SavedJobs({ jobs }) {
  return (
    <div className="quick-panel saved-panel">
      <div className="panel-title">
        <Bookmark size={18} />
        <span>Saved jobs</span>
      </div>
      {jobs.length ? (
        jobs.slice(0, 4).map((job) => (
          <a key={job.id || `${job.title}-${job.company}`} href={job.apply_link} target="_blank" rel="noreferrer">
            <strong>{job.title}</strong>
            <span>{job.company}</span>
          </a>
        ))
      ) : (
        <p className="muted">Saved roles will appear here.</p>
      )}
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
