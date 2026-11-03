# Janella Cookbook feature roadmap

Updated 2026-10-26. Proposed release order, not delivery dates or evidence of customer demand. Targets below are pilot decision gates, not measured results.

## User and outcome

A home cook who wants saved recipes to become meals they actually make, including when using an assistant through MCP.

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

## Dependencies and deliberate limits

Do not claim dietary/allergen safety from AI parsing. Preserve original ingredient text and make corrections easy. Coordinate inventory with Pantry Pulse and cart preparation with Shopping MCP.

## Access and abuse constraints

Before opening the cookbook beyond a protected deployment:

- Add authentication and authorization to recipe writes and private reads. See the current [access boundary](README.md#access-boundary).
- Bound per-user or per-IP import and chat traffic. Public-address validation on source fetching does not provide rate limiting.
- Replace unrestricted HTTP/HTTPS image-host patterns in `next.config.mjs` with an explicit image-source policy appropriate to imported recipes.

Update this roadmap when a user-visible increment ships, recording the outcome and remaining limits.
