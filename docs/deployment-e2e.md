# Deployment E2E checks

`E2E Tests` runs the full suite against a production build and an isolated database on pull requests and pushes to main. A separate `deployment-e2e` job runs after Vercel reports a successful deployment, using the exact deployment URL. This job uses test code from the deployed commit only when it is a branch tip in this repository; fork deployments and superseded commits use the trusted suite from main.

The deployment job needs the repository Actions secret `VERCEL_AUTOMATION_BYPASS_SECRET`, backed by a dedicated Janella Cookbook Vercel automation bypass credential. Deployment protection stays enabled. See [Vercel's automation authentication documentation](https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation).

The setup exchanges the credential for a cookie, checks that `/recipes/new` serves the app, and gives that session to the browser. Missing or invalid credentials fail during setup instead of causing every browser test to time out. The credential is sent only to the validated project origin; redirects never forward it. Traces are disabled for deployment checks, and CI deletes the session before uploading results.

Live checks cover browsing, search, navigation and intake form behavior. Tests tagged `@isolated` write recipes and run only in the isolated suite. Live provider imports remain opt-in. Data-dependent browsing tests can skip when the deployed database has no matching content.

To test a deployment manually, run the **E2E Tests** workflow with `deployment_url` set to its Janella Cookbook Vercel URL. Leave that input empty to run the isolated suite. Locally, export the deployment URL as `PLAYWRIGHT_BASE_URL` and the credential as `VERCEL_AUTOMATION_BYPASS_SECRET`, then run `pnpm test:e2e:deployment`. Remove `playwright/.cache/deployment.json` afterward; never commit or upload it.

`pnpm test:deployment-auth` runs the credential regression tests against a local HTTP server. It needs no real secret or deployment and runs in the ordinary E2E CI job.
