# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic
Versioning](https://semver.org/spec/v2.0.0.html).

<!-- textlint-disable -->
## [0.2.1] - 2025-03-20

### Added

* Alignment of all templates, docs and headers with the oss-template provided by cisco-ospo
* This is in the hopes of turning this project part of the Cisco Open Source catalogue

## [0.2.0] - 2025-03-16

### Added

* Support for LLM API key of other vendors: Now the user can choose between Gemini, OpenAI and Anthropic.
* Changes in the setup pop-up to enable this
* Hardcoded available model names based on each vendor's official documentation
* Usage of Vercel's libraries for abstracting each vendor's API calling. We only send the payload, token in the header and model of choice. No hardcoded URLs

## [0.1.1] - 2025-03-17

### Added

* Pull Request Template: A consistent structure for describing changes, motivation, and testing steps, so reviewers always have the context they need.
* Issue Templates: Dedicated forms for Bug Reports, Feature Requests, and General Questions, making it easier to triage and prioritize contributions from the community.

## [0.0.1] - 2025-03-06

### Added

* Working containerised architecture
* Stable Web UI workflow. Tested setup and paths
* Integration with Anthropic API key
* Smooth handover between agents with cooling-off timer
* Working submission of a new session on same event