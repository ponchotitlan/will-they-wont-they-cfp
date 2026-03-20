// Copyright 2026 Cisco Systems, Inc. and its affiliates
//
// SPDX-License-Identifier: Apache-2.0

import prompts from "./prompts.yaml";

export const AGENTS = [
  {
    id: "analyser",
    label: "CFP Analyser",
    icon: "🔍",
    color: "#00C2FF",
    desc: "Extracting key requirements from the Call for Papers",
    role: prompts.agents.analyser,
  },
  {
    id: "researcher",
    label: "Conference Researcher",
    icon: "📚",
    color: "#A78BFA",
    desc: "Researching past accepted sessions and conference DNA",
    role: prompts.agents.researcher,
  },
  {
    id: "committee",
    label: "Programme Committee Member",
    icon: "🎯",
    color: "#34D399",
    desc: "Evaluating from the committee's perspective",
    role: prompts.agents.committee,
  },
  {
    id: "audience",
    label: "Audience Member",
    icon: "🙋",
    color: "#FB923C",
    desc: "Evaluating from the attendee's perspective",
    role: prompts.agents.audience,
  },
];

export const SYNTHESISER_PROMPT = prompts.synthesiser;
