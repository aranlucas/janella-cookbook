// @vitest-environment node

import assert from "node:assert/strict";
import { createServer } from "node:http";
import { afterEach, expect, test } from "vitest";
import { deploymentSession, deploymentURL } from "../e2e/support/deployment-auth.ts";

const servers = [];

async function server(handler) {
  const instance = createServer(handler);
  servers.push(instance);
  await new Promise((resolve) => instance.listen(0, "127.0.0.1", resolve));
  return `http://127.0.0.1:${instance.address().port}`;
}

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (instance) =>
        new Promise((resolve, reject) => {
          instance.close((error) => (error ? reject(error) : resolve()));
        }),
    ),
  );
});

test("protected recipe page becomes accessible using a cookie, without forwarding the secret", async () => {
  const seen = [];
  const baseURL = await server((req, res) => {
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
  expect(state.cookies[0].value).toBe("test-session");
  expect(seen).toEqual([
    { url: "/", bypass: "test-secret" },
    { url: "/recipes/new", bypass: undefined },
  ]);
});

test("a login page containing cookbook branding is rejected immediately", async () => {
  const baseURL = await server((_req, res) => {
    res.end("<title>Login – Vercel</title><p>Continue to janella-cookbook</p>");
  });
  await expect(deploymentSession(baseURL, "invalid-secret")).rejects.toThrow(
    /authentication failed/,
  );
});

test("authentication never follows a redirect to another origin", async () => {
  let externalRequests = 0;
  const externalURL = await server((_req, res) => {
    externalRequests++;
    res.end("<h1>Add a Recipe</h1>");
  });
  const baseURL = await server((_req, res) => {
    res.writeHead(307, { location: externalURL });
    res.end();
  });
  await expect(deploymentSession(baseURL, "test-secret")).rejects.toThrow(/authentication failed/);
  expect(externalRequests).toBe(0);
});

test("missing credentials fail before making requests", async () => {
  await expect(deploymentSession("http://127.0.0.1:1", undefined)).rejects.toThrow(
    /SECRET is required/,
  );
});

test("only this project's HTTPS deployment origins are accepted", () => {
  expect(deploymentURL("https://janella-cookbook-jspd0ojn8-aranlucas-projects.vercel.app/")).toBe(
    "https://janella-cookbook-jspd0ojn8-aranlucas-projects.vercel.app",
  );
  expect(deploymentURL("https://janella-cookbook.vercel.app")).toBe(
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
    expect(() => deploymentURL(url)).toThrow();
  }
});
