# Repository instructions

- Do not modify `components/ui/` unless the user explicitly asks in the current thread.
- For local setup and provider configuration, read [README.md](README.md). Use a local development database for schema changes. For protected deployment tests, read [docs/deployment-e2e.md](docs/deployment-e2e.md).
- Before changing intake, saving or draft recovery, read the [workflow constraints](docs/design/recipe-workflow.md). For product priorities, read [ROADMAP.md](ROADMAP.md).

## Implementation conventions

- Validate server inputs with Zod before database operations; reuse `lib/validations.ts`. Client forms use React Hook Form with `@hookform/resolvers`.
- Use typed inputs; use `unknown` and narrow when the type is unknown. Do not add `any`. If inference requires suppression, use `@ts-expect-error` with the reason.
- Use `lib/errors.ts` for application errors. Server Actions return `ActionResult`; API routes use `withApiErrorHandler()` from `lib/api-response.ts`.
- UI primitives use Base UI. Check the local component contract before assuming Radix-style `asChild` support.

## Scripts and libraries

Before adding a script file or a package script that invokes one, take the first rung that works:

1. An existing tool's native flag or subcommand.
2. Declarative configuration for that tool.
3. A maintained plugin.
4. A one-line package script calling a native command.
5. An assertion in the existing Vitest or Playwright runner.
6. A custom script for repository-specific behavior only. Its first comment names the native rung that could not be used and why; cover it in the existing test runner and quote that comment in the PR.

For general-purpose code, prefer a maintained, typed library already in dependencies. A new dependency needs a reason for its selection; custom code overlapping a library needs a reason that library did not fit. Keep domain logic and necessary integration glue local.

## Tests

- Before adding a test, identify the behavior, a credible mistake it should catch, and an independently justified expected result.
- Prefer small, fast, reliable tests whose failures identify the broken behavior. Use integration/E2E tests for interactions isolated tests cannot establish.
- Protect contracts rather than incidental structure; do not reproduce implementation logic in assertions or mocks.
- Distinguish temporary development scaffolding from checks worth maintaining. Never delete or weaken a failing test just to make the suite pass.
- Use Vitest for synchronous components; cover async Server Component behavior in Playwright.
