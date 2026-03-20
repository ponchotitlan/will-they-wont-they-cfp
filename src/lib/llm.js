// Copyright 2026 Cisco Systems, Inc. and its affiliates
//
// SPDX-License-Identifier: Apache-2.0

/**
 * Call the configured LLM provider via the local proxy at /api/chat.
 *
 * @param {object} config        - { provider, apiKey, model }
 * @param {string} systemPrompt  - Role / system instruction
 * @param {string} userMessage   - User turn content
 * @param {number} maxTokens     - Maximum output tokens (default 1000)
 * @returns {Promise<string>}    - Plain text response from the model
 */
export async function callLLM(config, systemPrompt, userMessage, maxTokens = 1000) {
  const headers = { "Content-Type": "application/json" };
  if (config.apiKey) headers["x-user-api-key"] = config.apiKey;

  const response = await fetch("/api/chat", {
    method: "POST",
    headers,
    body: JSON.stringify({
      provider: config.provider || "anthropic",
      model: config.model,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
      max_tokens: maxTokens,
    }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || "API error");
  return data.text;
}
