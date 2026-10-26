# Janella Cookbook feature roadmap

Updated 2026-10-26. Proposed release order, not delivery dates or evidence of customer demand. Targets below are pilot decision gates, not measured results.

## User and outcome

A home cook who wants saved recipes to become meals they actually make, including when using an assistant through MCP.

## Current baseline

The app already imports recipes, searches, records cooking history and builds shopping lists. The MCP endpoint currently lists, retrieves and adds recipes; the next work should connect discovery to cooking rather than duplicate import modes.

Planning evidence: [README](README.md), [recipe MCP tools](lib/recipe-mcp.ts) and [MCP route](app/api/mcp/route.ts) at `fa2fa2a2d26c`. This focused product pass does not claim a complete new code audit or live-provider validation.

## Prioritized releases

| Order | Feature                                          | User value and scope                                                                                                                   | Release acceptance                                                                                                               |
| ----- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Now   | Find a cookable choice from the saved collection | Extend MCP search with the same useful time, cuisine and ingredient constraints as the app, returning reasons and missing ingredients. | A user can choose among three relevant saved recipes and open the exact recipe without the assistant inventing ingredients.      |
| Next  | Plan servings and a reviewed grocery handoff     | Build a small meal plan with serving adjustments, ingredient consolidation and an explicit review before list export.                  | Units and ambiguous ingredients stay visible; importing the approved plan into Shopping MCP does not double quantities on retry. |
| Next  | A cooking session that remembers progress        | Provide a step-focused mode with recoverable position, timers and a final note/rating prompt, exposed appropriately to an assistant.   | A cook resumes after an interruption and records what changed without altering the original recipe accidentally.                 |
| Later | A trusted family collection                      | Offer explicitly invited sharing of selected recipes/collections with clear read/edit rights and attribution.                          | An invited member can find a shared recipe; removing access prevents further reads and edits without deleting the owner’s copy.  |

## Measure value before expanding

Track saved-to-cooked conversion within the pilot, time to choose dinner, corrections to imported/scaled ingredients and repeat cooking. Initial gate: five recipe-to-meal journeys preserve exact ingredients and produce a usable reviewed list.

Collect the baseline before building the first slice. Use voluntary pilot feedback and minimal aggregate events; do not log private content or credentials to measure adoption. If the first workflow is not used again, revisit the problem before adding the later features. Revenue impact is unvalidated.

## Next shippable slice

Extend existing list/search MCP behavior with constrained recipe discovery and clear match reasons.

## Dependencies and deliberate limits

Do not claim dietary/allergen safety from AI parsing. Preserve original ingredient text and make corrections easy. Coordinate inventory with Pantry Pulse and cart preparation with Shopping MCP.

Engineering work belongs in the milestone only when it enables that acceptance criterion. Prefer existing native libraries and test runners. Update this roadmap when a user-visible increment ships, recording the outcome and remaining limits rather than checking off implementation activity alone.
