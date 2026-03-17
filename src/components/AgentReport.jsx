import { useState } from "react";
import ReactMarkdown from "react-markdown";

/**
 * Collapsible card that shows an individual agent's Markdown report.
 * Starts collapsed; clicking the header row toggles visibility.
 *
 * @param {{ id: string, label: string, icon: string, color: string }} agent - Agent metadata.
 * @param {string} content - Raw Markdown text returned by the agent.
 */
export default function AgentReport({ agent, content }) {
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
