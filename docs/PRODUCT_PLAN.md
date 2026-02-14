# Product Plan: iPhone-first Coding Explorations

## Mission

Enable developers to launch and continue coding explorations from an iPhone with minimal friction, including cases where no repository or prepared environment exists.

## Primary User Outcome

A user on iPhone can:

1. Create a new Sprite quickly.
2. Start coding immediately with CLI coding agents.
3. Connect through native terminal apps (Prompt on iOS, Terminal on macOS).
4. Resume later using checkpoints or persistent Sprite state.

## Current Gaps

- The dashboard experience is strong for listing and managing existing Sprites, but creation paths are not explicitly framed around "start from scratch right now".
- Sprite detail emphasizes in-browser terminal actions; native terminal (SSH) guidance is not a first-class journey.
- The current messaging still reflects general management rather than a rapid mobile exploration workflow.

## Prioritized Roadmap

### Phase 1: Clarify product intent in app copy (now)

- Update top-level copy to emphasize iPhone-first, on-the-go coding explorations.
- Make "no repo required" explicit in user-facing language.
- Keep existing management capabilities while prioritizing launch speed in wording.

### Phase 2: Zero-setup exploration flow (next)

- Add a "Quick Start Exploration" flow from `/app` that creates a Sprite with sensible defaults.
- Include options:
  - Start empty workspace (no repository).
  - Clone a repository if available.
- Automatically route users to the terminal after creation.

### Phase 3: Native terminal app handoff (next)

- Add an "SSH from your terminal app" section to sprite details.
- Provide copy-ready connection snippets for:
  - macOS Terminal
  - Prompt on iOS
- Include key setup instructions and troubleshooting for mobile terminal clients.

### Phase 4: Exploration presets for coding agents

- Add one-click presets for common agent stacks (e.g., Claude Code, Gemini CLI, Codex CLI).
- Scaffold baseline environment files and useful shell aliases.
- Offer optional starter templates for greenfield projects.

### Phase 5: Reliability and resume workflows

- Promote checkpoint creation/restoration as "save progress" for mobile users.
- Add health/status indicators that are clear on small screens.
- Improve reconnect and session persistence behavior for intermittent mobile networks.

## Success Metrics

- Time from sign-in to first terminal command from iPhone.
- Percentage of sessions that start without an existing repository.
- Percentage of users who successfully connect via Prompt/iOS or Terminal/macOS.
- Session continuation rate (users returning to the same exploration within 7 days).

## Implementation Notes

- Reuse existing Sprite APIs and auth model.
- Maintain backward compatibility with current in-browser terminal workflow.
- Prefer incremental UI changes in existing screens (`/app`, sprite detail, deploy/creation forms) before introducing new major routes.
