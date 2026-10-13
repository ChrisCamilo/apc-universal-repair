import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { initials } from "@apc/shared/auth";
import { ITEM_LIST_PATHS } from "@apc/shared/lists";
import { TEST_USERS } from "@apc/shared/test-users";

// A stand-in for the API, on a free port of this computer, for the desktop smoke test: the health check, the login
// of the test users, an empty item list and empty item lists. Anything else gets a 404.

/** The paths of the item lists (categories, part brands…), answered with an empty list. */
const LIST_PATHS = new Set(Object.values(ITEM_LIST_PATHS));

/**
 * Starts the stand-in API.
 * @returns The server and its address, e.g. "http://127.0.0.1:51234".
 */
export async function startStubApi(): Promise<{ server: Server; url: string }> {
  const server = createServer((request, response) => {
    const { pathname } = new URL(request.url ?? "/", "http://stub");
    const reply = (status: number, body: unknown) => {
      response.writeHead(status, { "Content-Type": "application/json" });
      response.end(JSON.stringify(body));
    };
    if (request.method === "GET" && pathname === "/health") {
      return reply(200, { status: "ok", timestamp: new Date().toISOString() });
    }
    if (request.method === "POST" && pathname === "/sessions") {
      let text = "";
      request.on("data", (chunk) => (text += chunk));
      request.on("end", () => {
        const { username, password } = JSON.parse(text) as { username: string; password: string };
        const user = TEST_USERS.find((each) => each.username === username && each.password === password);
        if (!user) {
          return reply(401, { statusCode: 401, message: "Wrong username or password." });
        }
        const { id, displayName } = user;
        reply(200, { id, username, displayName, initials: initials(displayName) });
      });
      return;
    }
    if (request.method === "GET" && pathname === "/items") {
      return reply(200, { items: [], total: 0 });
    }
    if (request.method === "GET" && LIST_PATHS.has(pathname)) {
      return reply(200, []);
    }
    reply(404, { statusCode: 404, message: "Not found." });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  return { server, url: `http://127.0.0.1:${(server.address() as AddressInfo).port}` };
}
