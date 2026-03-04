import { useState, useRef, useEffect } from "react";
import { AGENTS, SYNTHESISER_PROMPT } from "./agents";
import ReactMarkdown from "react-markdown";
import "./App.css";

const GEAR_PATH = "M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z";

function GearIcon({ size = 16, color = "#6B7280" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d={GEAR_PATH}/>
    </svg>
  );
}

const CLAUDE_MODELS = [
  { id: "claude-opus-4-6",           label: "Claude Opus 4.6",    desc: "Most intelligent · best for complex evaluation" },
  { id: "claude-sonnet-4-6",         label: "Claude Sonnet 4.6",  desc: "Speed + intelligence · recommended" },
  { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5",   desc: "Fastest & cheapest · good for quick checks" },
];

const MIN_DELAY_SECONDS = 10;
const DEFAULT_CONFIG = { apiKey: "", model: "claude-sonnet-4-6", agentDelay: 15 };

export default function SessionEvaluator() {
  const [title, setTitle] = useState("");
  const [abstract, setAbstract] = useState("");
  const [eventUrl, setEventUrl] = useState("");
  const [cfpUrl, setCfpUrl] = useState("");
  const [cfpText, setCfpText] = useState("");
  const [needsCfpText, setNeedsCfpText] = useState(false);
  const [phase, setPhase] = useState("idle"); // idle | running | done
  const [agentResults, setAgentResults] = useState({});
  const [synthesis, setSynthesis] = useState("");
  const [activeAgent, setActiveAgent] = useState(null);
  const [agentProgress, setAgentProgress] = useState([]);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(0);
  const resultsRef = useRef(null);
  const cfpTextResolverRef = useRef(null);

  const [config, setConfig] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("slayer-config") || "{}");
      return { ...DEFAULT_CONFIG, ...saved };
    } catch { return DEFAULT_CONFIG; }
  });
  const [configOpen, setConfigOpen] = useState(false);

  // Persist config to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("slayer-config", JSON.stringify(config));
  }, [config]);

  const exportMarkdown = () => {
    const lines = [];
    lines.push(`# CfP Evaluation: ${title || "Untitled Session"}`);
    lines.push("");
    if (abstract) {
      lines.push("## Abstract");
      lines.push(abstract);
      lines.push("");
    }
    lines.push("## Scores");
    lines.push(`- **Acceptance Likelihood:** ${acceptanceScore != null ? acceptanceScore + "%" : "—"}`);
    lines.push(`- **Audience Appeal:** ${audienceScore != null ? audienceScore + "%" : "—"}`);
    lines.push("");
    AGENTS.forEach((a) => {
      if (agentResults[a.id]) {
        lines.push(`## ${a.label}`);
        lines.push(agentResults[a.id]);
        lines.push("");
      }
    });
    if (synthesis) {
      lines.push("## Master Synthesis & Recommendations");
      lines.push(synthesis);
      lines.push("");
    }
    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `cfp-evaluation-${(title || "session").toLowerCase().replace(/\s+/g, "-")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const analyserCouldNotAccess = (text) => {
    if (!text) return false;
    const lower = text.toLowerCase();
    return [
      "cannot access", "can't access", "unable to access", "couldn't access",
      "not able to access", "i cannot browse", "don't have access",
      "could you please", "could you provide", "please provide", "please share",
      "paste the", "copy and paste",
    ].some((phrase) => lower.includes(phrase));
  };

  const waitForCfpText = () =>
    new Promise((resolve) => {
      setNeedsCfpText(true);
      cfpTextResolverRef.current = resolve;
    });

  const submitCfpText = (text) => {
    setNeedsCfpText(false);
    cfpTextResolverRef.current?.(text);
    cfpTextResolverRef.current = null;
  };

  const sleepWithCountdown = async (ms) => {
    const seconds = Math.ceil(ms / 1000);
    for (let i = seconds; i > 0; i--) {
      setCountdown(i);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    setCountdown(0);
  };

  const callClaude = async (systemPrompt, userMessage, maxTokens = 1000) => {
    const headers = {
      "Content-Type": "application/json",
      "anthropic-version": "2023-06-01",
    };
    if (config.apiKey) headers["x-user-api-key"] = config.apiKey;
    const response = await fetch("/api/messages", {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: config.model,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || "API error");
    return data.content
      .map((b) => b.text || "")
      .filter(Boolean)
      .join("\n");
  };

  const runEvaluation = async () => {
    if (!title.trim() || !abstract.trim()) {
      setError("Please provide at least a title and abstract.");
      return;
    }
    if (!config.apiKey) {
      setError("No API key configured. Open ⚙ Settings and enter your Anthropic API key.");
      return;
    }
    setError("");
    setPhase("running");
    setAgentResults({});
    setSynthesis("");
    setAgentProgress([]);

    const buildContext = (extraText) => `
SESSION TITLE: ${title}

ABSTRACT: ${abstract}

EVENT URL: ${eventUrl || "Not provided"}
CALL FOR PAPERS URL: ${cfpUrl || "Not provided"}
${extraText.trim() ? `\nCALL FOR PAPERS TEXT:\n${extraText.trim()}` : ""}
    `.trim();

    let sessionContext = buildContext(cfpText);

    const results = {};

    for (const [index, agent] of AGENTS.entries()) {
      if (index > 0) await sleepWithCountdown(config.agentDelay * 1000);
      setActiveAgent(agent.id);
      try {
        const result = await callClaude(agent.role, sessionContext);
        results[agent.id] = result;
        setAgentResults((prev) => ({ ...prev, [agent.id]: result }));
        setAgentProgress((prev) => [...prev, agent.id]);

        // After analyser: if it couldn't read the CFP URL, pause and ask user to paste the text
        if (agent.id === "analyser" && analyserCouldNotAccess(result)) {
          const pastedText = await waitForCfpText();
          // Rebuild context with the pasted text and re-run the analyser
          sessionContext = buildContext(pastedText);
          // Reset analyser card to "active" state before retrying
          setAgentProgress((prev) => prev.filter((id) => id !== "analyser"));
          setActiveAgent("analyser");
          await sleepWithCountdown(config.agentDelay * 1000); // respect rate limit before retry
          const retryResult = await callClaude(agent.role, sessionContext);
          results[agent.id] = retryResult;
          setAgentResults((prev) => ({ ...prev, [agent.id]: retryResult }));
          setAgentProgress((prev) => [...prev, "analyser"]);
        }
      } catch (e) {
        results[agent.id] = `⚠️ Agent encountered an error: ${e.message}`;
        setAgentResults((prev) => ({ ...prev, [agent.id]: results[agent.id] }));
        setAgentProgress((prev) => [...prev, agent.id]);
      }
    }

    await sleepWithCountdown(config.agentDelay * 1000); // extra gap before synthesis (largest input call)
    setActiveAgent("synthesis");
    const truncate = (text, max = 1200) =>
      text && text.length > max ? text.slice(0, max) + "\n[truncated for brevity]" : text;
    const synthesisInput = `
ORIGINAL SESSION:
${sessionContext}

---
CFP ANALYSER REPORT:
${truncate(results.analyser)}

---
CONFERENCE RESEARCHER REPORT:
${truncate(results.researcher)}

---
PROGRAMME COMMITTEE EVALUATION:
${truncate(results.committee)}

---
AUDIENCE MEMBER EVALUATION:
${truncate(results.audience)}
    `.trim();

    try {
      const synth = await callClaude(SYNTHESISER_PROMPT, synthesisInput, 4096);
      setSynthesis(synth);
    } catch (e) {
      setSynthesis(`⚠️ Synthesis failed: ${e.message}`);
    }

    setActiveAgent(null);
    setPhase("done");
    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  const reset = () => {
    setPhase("idle");
    setAgentResults({});
    setSynthesis("");
    setAgentProgress([]);
    setActiveAgent(null);
    setError("");
    setCfpText("");
    setNeedsCfpText(false);
    cfpTextResolverRef.current = null;
  };

  const extractScore = (text, label) => {
    const match = text?.match(new RegExp(`${label}[^\\d]*(\\d+)\\s*%`, "i"));
    return match ? parseInt(match[1]) : null;
  };

  const acceptanceScore = extractScore(synthesis, "Acceptance Likelihood");
  const audienceScore = extractScore(synthesis, "Audience Appeal");

  return (
    <div className="app-root">
      {/* ── Header ── */}
      <div className="app-header">
        <div className="header-logo">✏️</div>
        <div>
          <div className="header-brand-name">WILL THEY WON'T THEY</div>
          <div className="header-brand-sub">MULTI-AGENT CONFERENCE CFP (CALL FOR PAPERS) SESSION EVALUATOR</div>
        </div>
        <div className="header-right">
          <div className="agent-dots">
            {AGENTS.map((a) => (
              <div key={a.id} className="agent-dot" style={{
                background: agentProgress.includes(a.id) || activeAgent === a.id ? a.color : "#1E2030",
                boxShadow: activeAgent === a.id ? `0 0 8px ${a.color}` : "none",
              }} />
            ))}
          </div>
          <button onClick={() => setConfigOpen(true)} title="Settings" className="config-btn"
            style={{
              background: config.apiKey ? "#111320" : "#2D1A0E",
              border: config.apiKey ? "1px solid #1E2030" : "1px solid #F59E0B88",
              boxShadow: config.apiKey ? "none" : "0 0 10px #F59E0B44",
            }}
          >
            <GearIcon color={config.apiKey ? "#6B7280" : "#F59E0B"} />
          </button>
        </div>
      </div>

      <div className="page-content">
        {/* ── Idle / Form ── */}
        {phase === "idle" && (
          <div className="idle-view">
            <div className="idle-header">
              <h1 className="idle-title">
                Will your session get accepted?
              </h1>
              <p className="idle-subtitle">
                There is an audience out there that could benefit from your experience and insights. Your voice deserves to be heard. But the opaque selection process can feel like a huge barrier. This project aims to help you bring your session closer to potential attendees by simulating the evaluation process through the lens of multiple AI agents: CFP Analyser, Researcher, Committee Member, and Audience. <br></br><br></br><strong>To get started,</strong> provide your Claude API key in the settings, then enter your session title, abstract, and the conference's CFP URL. The agents will do their best to evaluate your session's chances and provide actionable feedback to improve it.
              </p>
            </div>

            {error && <div className="error-banner">{error}</div>}

            <div className="form-grid">
              <Field label="SESSION TITLE *">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. From Zero to Hero: Network Automation with Python in 45 Minutes"
                  className="input"
                />
              </Field>

              <Field label="ABSTRACT *">
                <textarea
                  value={abstract}
                  onChange={(e) => setAbstract(e.target.value)}
                  placeholder="Paste your session abstract here..."
                  rows={6}
                  className="input input--textarea"
                />
              </Field>

              <div className="form-row-2col">
                <Field label="EVENT URL" hint="Conference homepage">
                  <input
                    value={eventUrl}
                    onChange={(e) => setEventUrl(e.target.value)}
                    placeholder="https://ciscolive.com"
                    className="input"
                  />
                </Field>
                <Field label="CALL FOR PAPERS URL" hint="CFP page or PDF">
                  <input
                    value={cfpUrl}
                    onChange={(e) => setCfpUrl(e.target.value)}
                    placeholder="https://event.com/cfp"
                    className="input"
                  />
                </Field>
              </div>

              <div className="agents-section">
                <div className="section-label">ACTIVE AGENTS</div>
                <div className="agents-grid">
                  {AGENTS.map((a) => (
                    <div key={a.id} className="agent-card-idle"
                      style={{ border: `1px solid ${a.color}22` }}>
                      <span className="agent-card-idle-icon">{a.icon}</span>
                      <div>
                        <div className="agent-card-idle-name" style={{ color: a.color }}>{a.label}</div>
                        <div className="agent-card-idle-desc">{a.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button onClick={runEvaluation} className="submit-btn">
                ⚡ RUN EVALUATION
              </button>
            </div>
          </div>
        )}

        {/* ── Running ── */}
        {phase === "running" && (
          <div>
            <div className="running-header">
              <div className="running-status-label">EVALUATION IN PROGRESS</div>
              <div className="running-status-title">
                {countdown > 0
                  ? "Cooling down between agents..."
                  : activeAgent === "synthesis"
                  ? "Synthesising all agent reports..."
                  : activeAgent
                  ? `${AGENTS.find((a) => a.id === activeAgent)?.icon} ${AGENTS.find((a) => a.id === activeAgent)?.label} is analysing...`
                  : "Preparing agents..."}
              </div>
              {countdown > 0 && (
                <div className="countdown-wrapper">
                  <div className="countdown-label">RATE LIMIT PAUSE — NEXT AGENT IN</div>
                  <div className="countdown-number"
                    style={{ color: countdown <= 5 ? "#34D399" : "#F59E0B" }}>
                    {countdown}s
                  </div>
                  <div className="countdown-bar-track">
                    <div className="countdown-bar-fill"
                      style={{ width: `${((15 - countdown) / 15) * 100}%` }} />
                  </div>
                </div>
              )}
            </div>

            {/* CFP text fallback */}
            {needsCfpText && (
              <div className="cfp-fallback">
                <div className="cfp-fallback-header">
                  <span className="cfp-fallback-icon">📋</span>
                  <div>
                    <div className="cfp-fallback-title">CFP ANALYSER COULDN'T ACCESS THE URL</div>
                    <div className="cfp-fallback-subtitle">
                      Paste the Call for Papers text below and the remaining agents will use it directly.
                    </div>
                  </div>
                </div>
                <textarea
                  id="cfp-text-input"
                  value={cfpText}
                  onChange={(e) => setCfpText(e.target.value)}
                  placeholder="Paste the full Call for Papers text here..."
                  rows={7}
                  className="input input--textarea"
                  style={{ marginBottom: 12 }}
                />
                <div className="cfp-fallback-actions">
                  <button onClick={() => submitCfpText(cfpText)} className="btn-continue">
                    ▶ CONTINUE WITH REMAINING AGENTS
                  </button>
                  <button onClick={() => submitCfpText("")} className="btn-skip">
                    Skip
                  </button>
                </div>
              </div>
            )}

            <div className="agent-list">
              {AGENTS.map((a) => {
                const isDone   = agentProgress.includes(a.id);
                const isActive = activeAgent === a.id;
                return (
                  <div key={a.id} className="agent-progress-card" style={{
                    border: `1px solid ${isDone ? a.color + "55" : isActive ? a.color : "#1E2030"}`,
                    boxShadow: isActive ? `0 0 20px ${a.color}22` : "none",
                  }}>
                    <div className="agent-progress-row"
                      style={{ marginBottom: isDone && agentResults[a.id] ? 12 : 0 }}>
                      <span className="agent-progress-icon">{a.icon}</span>
                      <div className="agent-progress-info">
                        <div className="agent-progress-name"
                          style={{ color: isDone ? a.color : isActive ? a.color : "#4B5563" }}>
                          {a.label}
                        </div>
                        <div className="agent-progress-desc">
                          {isActive ? a.desc : isDone ? "Complete" : "Waiting..."}
                        </div>
                      </div>
                      <div className="agent-progress-status" style={{
                        background:  isDone ? a.color : "transparent",
                        border:      isDone ? "none" : isActive ? `2px solid ${a.color}` : "2px solid #1E2030",
                        animation:   isActive ? "spin 1s linear infinite" : "none",
                      }}>
                        {isDone ? "✓" : isActive ? "◌" : ""}
                      </div>
                    </div>
                    {isDone && agentResults[a.id] && (
                      <div className="agent-progress-preview"
                        style={{ borderTop: `1px solid ${a.color}22` }}>
                        {agentResults[a.id]}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Synthesis indicator */}
              <div className="synthesis-card" style={{
                border: `1px solid ${activeAgent === "synthesis" ? "#F59E0B" : "#1E2030"}`,
                boxShadow: activeAgent === "synthesis" ? "0 0 20px #F59E0B22" : "none",
              }}>
                <div className="synthesis-card-inner">
                  <span className="synthesis-icon">🧠</span>
                  <div>
                    <div className="synthesis-title"
                      style={{ color: activeAgent === "synthesis" ? "#F59E0B" : "#4B5563" }}>
                      Master Synthesiser
                    </div>
                    <div className="synthesis-desc">
                      {activeAgent === "synthesis"
                        ? "Compiling final report and rewrite suggestions..."
                        : "Waiting for all agents..."}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Done / Results ── */}
        {phase === "done" && (
          <div ref={resultsRef}>
            <div className="scores-grid">
              <ScoreCard label="ACCEPTANCE LIKELIHOOD" score={acceptanceScore} color="#34D399" icon="🎯" />
              <ScoreCard label="AUDIENCE APPEAL"        score={audienceScore}   color="#FB923C" icon="🙋" />
            </div>

            <div className="agent-reports-section">
              <div className="agent-reports-label">AGENT REPORTS</div>
              <div className="agent-reports-list">
                {AGENTS.map((a) => (
                  <AgentReport key={a.id} agent={a} content={agentResults[a.id]} />
                ))}
              </div>
            </div>

            {synthesis && (
              <div className="synthesis-output">
                <div className="synthesis-output-header">
                  <span className="synthesis-output-icon">🧠</span>
                  <div>
                    <div className="synthesis-output-title">MASTER SYNTHESIS &amp; RECOMMENDATIONS</div>
                    <div className="synthesis-output-sub">Compiled from all four agent analyses</div>
                  </div>
                </div>
                <div className="synthesis-output-content md-content">
                  <ReactMarkdown>{synthesis}</ReactMarkdown>
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button onClick={reset} className="btn-reset">
                ← EVALUATE ANOTHER SESSION
              </button>
              <button onClick={exportMarkdown} className="btn-export">
                ↓ EXPORT AS .MD
              </button>
            </div>
          </div>
        )}
      </div>

      {configOpen && (
        <ConfigPanel
          config={config}
          onSave={(next) => { setConfig(next); setConfigOpen(false); }}
          onClose={() => setConfigOpen(false)}
        />
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Field({ label, children, hint }) {
  return (
    <div>
      <div className="field-label-row">
        <label className="field-label">{label}</label>
        {hint && <span className="field-hint">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function ScoreCard({ label, score, color, icon }) {
  const valueColor = score >= 70 ? color : score >= 50 ? "#F59E0B" : "#F87171";
  return (
    <div className="score-card" style={{ border: `1px solid ${color}44` }}>
      <div className="score-card-icon">{icon}</div>
      <div className="score-card-label">{label}</div>
      <div className="score-card-value" style={{ color: valueColor }}>
        {score != null ? `${score}%` : "—"}
      </div>
      <div className="score-card-bar-track">
        <div className="score-card-bar-fill" style={{
          width: score != null ? `${score}%` : "0%",
          background: `linear-gradient(90deg, ${color}, ${color}88)`,
        }} />
      </div>
    </div>
  );
}

function AgentReport({ agent, content }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="agent-report"
      style={{ border: `1px solid ${open ? agent.color + "44" : "#1E2030"}` }}>
      <button onClick={() => setOpen(!open)} className="agent-report-toggle">
        <span className="agent-report-icon">{agent.icon}</span>
        <span className="agent-report-name" style={{ color: agent.color }}>
          {agent.label}
        </span>
        <span className="agent-report-toggle-label">{open ? "▲ HIDE" : "▼ VIEW"}</span>
      </button>
      {open && (
        <div className="agent-report-body md-content"
          style={{ borderTop: `1px solid ${agent.color}22` }}>
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}

// ─── Settings / Config panel ──────────────────────────────────────────────────

function ConfigPanel({ config, onSave, onClose }) {
  const [draft, setDraft] = useState({ ...config });
  const [showKey, setShowKey] = useState(false);
  const [delayError, setDelayError] = useState("");
  const [showDelayTip, setShowDelayTip] = useState(false);

  const delayTipText = `The Anthropic API enforces a rate limit of 30,000 input tokens per minute on most plans. Each agent call consumes ~800–1,200 tokens. Firing all 5 calls (4 agents + synthesis) back-to-back typically exceeds this limit within the first minute. A delay of at least ${MIN_DELAY_SECONDS}s between calls spreads them across the window and prevents "rate limit exceeded" errors. Longer delays = more headroom; 15s is the recommended default.`;

  const handleSave = () => {
    const d = parseInt(draft.agentDelay, 10);
    if (isNaN(d) || d < MIN_DELAY_SECONDS) {
      setDelayError(`Minimum is ${MIN_DELAY_SECONDS} seconds.`);
      return;
    }
    onSave({ ...draft, agentDelay: d });
  };

  return (
    <div className="config-overlay" onClick={onClose}>
      <div className="config-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="config-modal-header">
          <GearIcon size={20} color="#A78BFA" />
          <div style={{ flex: 1 }}>
            <div className="config-modal-title">SETTINGS</div>
            <div className="config-modal-sub">Stored locally in your browser</div>
          </div>
          <button onClick={onClose} className="config-modal-close">×</button>
        </div>

        <div className="config-fields">
          {/* API Key */}
          <div>
            <label className="config-label">ANTHROPIC API KEY</label>
            <div className="api-key-wrap">
              <input
                type={showKey ? "text" : "password"}
                value={draft.apiKey}
                onChange={(e) => setDraft({ ...draft, apiKey: e.target.value })}
                placeholder="sk-ant-..."
                className="config-input config-input--with-btn"
                style={{
                  fontFamily: showKey ? "'IBM Plex Mono', monospace" : "monospace",
                  letterSpacing: showKey ? "normal" : "0.1em",
                }}
              />
              <button onClick={() => setShowKey(!showKey)}
                title={showKey ? "Hide key" : "Reveal key"}
                className="api-key-reveal">
                {showKey ? "🙈" : "👁"}
              </button>
            </div>
            <div className="api-key-hint">
              Get yours at{" "}
              <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer">
                console.anthropic.com
              </a>. Never leaves your device.
            </div>
          </div>

          {/* Model */}
          <div>
            <label className="config-label">MODEL</label>
            <select
              value={draft.model}
              onChange={(e) => setDraft({ ...draft, model: e.target.value })}
              className="config-input"
              style={{ cursor: "pointer" }}
            >
              {CLAUDE_MODELS.map((m) => (
                <option key={m.id} value={m.id}>{m.label} — {m.desc}</option>
              ))}
            </select>
          </div>

          {/* Agent delay */}
          <div>
            <div className="delay-label-row">
              <label className="config-label" style={{ margin: 0 }}>
                DELAY BETWEEN AGENTS (seconds)
              </label>
              <span
                onMouseEnter={() => setShowDelayTip(true)}
                onMouseLeave={() => setShowDelayTip(false)}
                onClick={() => setShowDelayTip((v) => !v)}
                className="info-btn"
                style={{
                  background: showDelayTip ? "#A78BFA" : "#1E2030",
                  color:      showDelayTip ? "#0D0F1A" : "#6B7280",
                }}
              >
                i
                {showDelayTip && (
                  <div className="info-tooltip">
                    <div className="info-tooltip-title">WHY IS THIS NECESSARY?</div>
                    {delayTipText}
                    <div className="info-tooltip-arrow" />
                  </div>
                )}
              </span>
            </div>
            <div className="delay-input-row">
              <input
                type="number"
                min={MIN_DELAY_SECONDS}
                value={draft.agentDelay}
                onChange={(e) => { setDraft({ ...draft, agentDelay: e.target.value }); setDelayError(""); }}
                className="config-input"
                style={{ width: 100 }}
              />
              <span className="delay-hint">min {MIN_DELAY_SECONDS}s · recommended 15s</span>
            </div>
            {delayError && <div className="delay-error">{delayError}</div>}
          </div>
        </div>

        {/* Actions */}
        <div className="config-actions">
          <button onClick={handleSave} className="btn-save">SAVE SETTINGS</button>
          <button onClick={onClose}    className="btn-cancel">Cancel</button>
        </div>
      </div>
    </div>
  );
}

