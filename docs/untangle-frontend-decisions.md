# Frontend untangle decisions

Recorded before edits after reading the exact requested skill, AGENTS.md,
README.md, ROADMAP.md and recipe workflow constraints. Tests cleanup remains last.

## Inventory and redesign

- Keep recent-search storage key, schema, deduplication and limits in one feature
  module. SearchBar and SearchDiscovery independently encode that contract;
  SearchBar exposes a storage-key extension point with no callers. Retain the
  existing eight stored / six displayed limits and storage-failure navigation.
- Make the session store own subscriptions and notify after writes. Provider
  currently must remember a separate emit call; direct setters silently leave
  React stale. Keep the browser-memory fallback and stable server snapshot.
- Remove the unused `useVoiceInput` hook in speech-recognition; VoiceInput already
  implements the live flow including recoverable provider errors. Keep browser
  recognition interfaces and SSR capability detection.
- Remove unreferenced filter-panel, filter-chips and quick-filters. Current search
  results implement their own actual filter UI, with no imports of these files.
- Remove unreachable AI component families. A local import graph rooted at every
  source outside components/ai-elements finds only attachments, code-block,
  conversation, loader, message, prompt-input-context, prompt-input, suggestion,
  tool-status-badge and tool reachable. The other 41 modules have no product,
  test, or primitive consumers. These are unused library inventory, not features.
  Keep all components/ui files, including unreferenced primitives per AGENTS.md.
- Trim unused haptic wrappers and patterns: live chat consumers use light, medium
  and success. Retain capability checks and failures returning false.

## Deliberately retained special cases

Browser storage can fail, SSR has no window, Web Speech support differs by browser,
and microphone denial/network errors require specific recovery. These reflect
external requirements. Manual ingredient pipe syntax differs deliberately from
free-text imports. Draft intake recovery, photo persistence limits, shopping item
identity, and chat streaming state are retained. No schema, provider, deployment
or user-visible redesign is required.

## Validation

Parent runs sequential lint, formatting, typecheck, tests and independent review.
No tests removed during implementation. Dependency pruning is left to parent
following repository-wide reference inspection.
