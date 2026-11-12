# Recipe workflow constraints

The product journey is **bring in a recipe → check it → save it → find it → cook it**. Keep collection and cooking usable without an AI or grocery connection. Dashboard and static pages are secondary navigation.

These are design requirements and acceptance criteria, not a record of completed verification. The source of truth for implementation is `components/forms/recipe-intake.tsx`, `components/forms/manual-recipe-form.tsx`, `lib/imports/actions.ts` and `lib/actions.ts`. Product priorities beyond intake are in the [roadmap](../../ROADMAP.md).

## Intake and review

Website and YouTube links share one entry point so users need not choose a parser. Photo intake means a readable recipe card, page or screenshot; a dish photo is insufficient evidence for ingredients or measurements. The current supported photo formats are single JPEG, PNG and WebP images up to 4 MB. PDF support requires a separate design for page selection, limits and multiple recipes.

Extraction produces an editable draft without saving a recipe. Preserve quantities as written, ingredient/step groups, provenance and uncertainty; missing measurements must not be invented. Keep source content available when extraction fails, with pasted text or manual entry as recovery paths. Use truthful progress states rather than fabricated parsing percentages.

Source selection, file picking and any drag-and-drop affordance must work by keyboard. Show formats and limits before selection, and provide a preview and remove control. Review prioritizes ingredients, steps, times and servings; optional metadata must not obstruct saving. Validation must focus a reachable invalid field, including when its section is collapsed.

Switching sources, returning from review and retrying a failed save must preserve edits. Draft recovery should tolerate unavailable browser storage. Original photo bytes are not restored after refresh; do not promise that they are. Source images and recipe cover images have separate purposes. If uploads are retained in future, define storage retention and cleanup; temporary blob URLs are not durable image URLs.

## Identity, persistence and search

A repeated source must offer opening the saved recipe or explicitly reviewing an update. Preserve personal notes, favorites and cooking history. A reviewed update uses an expected version so concurrent edits cannot be silently overwritten. Canonicalize YouTube links by video ID; preserve website query parameters that may identify a recipe. Reconcile existing duplicates before introducing a unique source constraint.

A client-generated unique save key makes retries after a lost response return the same recipe. Disabling the submit button alone cannot guarantee this. Validate and save recipe content and keyword search text transactionally; invalidate views only after commit. Semantic indexing is best effort and must not turn a successful save into a user-visible failure or leave old vectors describing edited content.

External fetching must exclude private/local destinations, validate every redirect and pin the validated DNS result. Bound fetch time, response bytes, decoded image dimensions and extraction time. Validate image bytes on the server rather than trusting browser MIME types. See `lib/imports/fetch-source.ts` and `lib/imports/actions.ts` for enforced limits.

Keep bounded synchronous extraction while it fits deployment timeouts. Persisted import jobs need measured latency or resumability requirements before adding infrastructure; retries must never create an extra recipe.

## Acceptance criteria

| Area                         | Required behavior evidence                                                                                                                                                                     |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Website import               | Extract, review without a recipe write, change a quantity, save and reopen persisted content. Timeout, blocked source and non-recipe failures retain input.                                    |
| YouTube                      | A valid video yields a draft; unavailable transcripts give an actionable error; equivalent video URLs identify the same source.                                                                |
| Photo and text files         | Real fixtures yield draft fields; unsupported, oversized, empty and unreadable inputs fail before saving. Pasted and file text produce equivalent fields.                                      |
| Manual and review recovery   | Required fields have reachable errors. Source switching, back navigation, refresh and failed-save retry preserve drafts where storage is available.                                            |
| Duplicates and edits         | Double submission and lost-response retry create one recipe. Re-import/regeneration requires review; atomic updates preserve ordering, provenance and personal metadata.                       |
| Collection and search        | Newly saved recipes appear in browsing and ingredient-only keyword search without embedding credentials. Filters and pagination compose correctly. Mutations update affected counts and views. |
| Cooking and printing         | Ingredient checks and steps work on mobile; cooked count persists; print output excludes app controls.                                                                                         |
| Shopping                     | Add, adjust, check and remove ingredients, then reopen the drawer to verify intended persistence.                                                                                              |
| Assistant and nutrition      | Stream/tool errors, grocery OAuth failure and microphone denial are recoverable. Nutrition distinguishes stored, estimated and missing values; failures leave cooking usable.                  |
| Accessibility and navigation | Verify 390 px and desktop layouts, keyboard-only intake/review/save, status announcements and errors, no nested controls, reachable routes and legible light/dark themes.                      |

Use deterministic fixtures and an isolated test database for required CI. Live-provider checks are opt-in and establish provider availability separately from application correctness. See [local checks](../../README.md#checks) and the [deployment test procedure](../deployment-e2e.md).
