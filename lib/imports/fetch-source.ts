import { lookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";
import http from "node:http";
import https from "node:https";

const blocked = new BlockList();
for (const [address, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 3],
] as const)
  blocked.addSubnet(address, prefix, "ipv4");
const publicV6 = new BlockList();
publicV6.addSubnet("2000::", 3, "ipv6");
blocked.addSubnet("2001::", 23, "ipv6");
blocked.addSubnet("2002::", 16, "ipv6");
blocked.addSubnet("2001:db8::", 32, "ipv6");
blocked.addSubnet("3fff::", 20, "ipv6");

export function isPublicAddress(address: string): boolean {
  const family = isIP(address);
  return family === 4
    ? !blocked.check(address, "ipv4")
    : family === 6 && publicV6.check(address, "ipv6") && !blocked.check(address, "ipv6");
}

/** Pin each request to a validated DNS answer, including every redirect. */
export async function fetchRecipeSource(input: string): Promise<string> {
  const signal = AbortSignal.timeout(20000);
  let url = new URL(input);
  for (let redirect = 0; redirect <= 4; redirect++) {
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      (url.port && !["80", "443"].includes(url.port))
    )
      throw new Error("Use a public HTTP or HTTPS recipe link.");
    const hostname = url.hostname.replace(/^\[|\]$/g, "");
    const addresses = await lookup(hostname, { all: true });
    if (!addresses.length || addresses.some(({ address }) => !isPublicAddress(address)))
      throw new Error("Recipe links must point to a public website.");
    const result = await new Promise<{ location?: string; body: string }>((resolve, reject) => {
      const req = (url.protocol === "https:" ? https : http).get(
        url,
        {
          signal,
          headers: { "User-Agent": "Cookbook/1.0", Accept: "text/html,application/xhtml+xml" },
          lookup: (_hostname, options, callback) => {
            if (options.all) callback(null, addresses);
            else callback(null, addresses[0]!.address, addresses[0]!.family);
          },
        },
        (res) => {
          if (
            res.statusCode &&
            res.statusCode >= 300 &&
            res.statusCode < 400 &&
            res.headers.location
          ) {
            res.resume();
            resolve({ location: res.headers.location, body: "" });
            return;
          }
          if (res.statusCode !== 200) {
            res.resume();
            reject(new Error(`Website returned ${res.statusCode}. Try pasting the recipe text.`));
            return;
          }
          const chunks: Buffer[] = [];
          let length = 0;
          res.on("data", (chunk: Buffer) => {
            length += chunk.length;
            if (length > 2 * 1024 * 1024) {
              res.destroy(new Error("Recipe page is too large. Paste its text instead."));
              return;
            }
            chunks.push(chunk);
          });
          res.on("end", () => resolve({ body: Buffer.concat(chunks).toString("utf8") }));
          res.on("error", reject);
        },
      );
      req.on("error", reject);
    });
    if (!result.location) return result.body;
    url = new URL(result.location, url);
  }
  throw new Error("Too many redirects. Paste the recipe text instead.");
}
