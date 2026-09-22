import assert from "node:assert/strict";
import { createServer } from "node:http";
import { test } from "node:test";
import { deploymentSession, deploymentURL } from "../e2e/support/deployment-auth.ts";

async function server(t, handler) {
  const instance = createServer(handler);
  await new Promise((resolve) => instance.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => instance.close(resolve)));
  return `http://127.0.0.1:${instance.address().port}`;
}

test("protected recipe page becomes accessible using a cookie, without forwarding the secret", async (t) => {
  const seen = [];
  const baseURL = await server(t, (req, res) => {
    seen.push({ url: req.url, bypass: req.headers["x-vercel-protection-bypass"] });
    if (req.url === "/" && req.headers["x-vercel-protection-bypass"] === "test-secret") {
      assert.equal(req.headers["x-vercel-set-bypass-cookie"], "true");
      res.writeHead(307, {
        location: "/",
        "set-cookie": "_vercel_jwt=test-session; Path=/; HttpOnly",
      });
    } else if (req.url === "/recipes/new" && req.headers.cookie === "_vercel_jwt=test-session") {
      res.writeHead(200, { "content-type": "text/html" });
      res.write("<h1>Add a Recipe</h1>");
    } else {
      res.writeHead(302, { location: "/login" });
    }
    res.end();
  });
  const state = await deploymentSession(baseURL, "test-secret");
  assert.equal(state.cookies[0].value, "test-session");
  assert.deepEqual(seen, [
    { url: "/", bypass: "test-secret" },
    { url: "/recipes/new", bypass: undefined },
  ]);
});

test("a login page containing cookbook branding is rejected immediately", async (t) => {
  const baseURL = await server(t, (_req, res) => {
    res.end("<title>Login – Vercel</title><p>Continue to janella-cookbook</p>");
  });
  await assert.rejects(deploymentSession(baseURL, "invalid-secret"), /authentication failed/);
});

test("authentication never follows a redirect to another origin", async (t) => {
  let externalRequests = 0;
  const externalURL = await server(t, (_req, res) => {
    externalRequests++;
    res.end("<h1>Add a Recipe</h1>");
  });
  const baseURL = await server(t, (_req, res) => {
    res.writeHead(307, { location: externalURL });
    res.end();
  });
  await assert.rejects(deploymentSession(baseURL, "test-secret"), /authentication failed/);
  assert.equal(externalRequests, 0);
});

test("missing credentials fail before making requests", async () => {
  await assert.rejects(deploymentSession("http://127.0.0.1:1", undefined), /SECRET is required/);
});

test("only this project's HTTPS deployment origins are accepted", () => {
  assert.equal(
    deploymentURL("https://janella-cookbook-jspd0ojn8-aranlucas-projects.vercel.app/"),
    "https://janella-cookbook-jspd0ojn8-aranlucas-projects.vercel.app",
  );
  assert.equal(
    deploymentURL("https://janella-cookbook.vercel.app"),
    "https://janella-cookbook.vercel.app",
  );
  for (const url of [
    undefined,
    "http://janella-cookbook.vercel.app",
    "https://example.com",
    "https://janella-cookbook.vercel.app.evil.example",
    "https://other-project.vercel.app",
    "https://user:pass@janella-cookbook.vercel.app",
    "https://janella-cookbook.vercel.app/login",
    "https://janella-cookbook.vercel.app?redirect=example.com",
  ]) {
    assert.throws(() => deploymentURL(url));
  }
});
