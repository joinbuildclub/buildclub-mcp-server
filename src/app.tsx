import { Hono } from "hono";
import type { FC } from "hono/jsx";
import { OAuthHelpers } from "@cloudflare/workers-oauth-provider";
import type { AuthRequest } from "@cloudflare/workers-oauth-provider";
import { parseApproveFormBody } from "./utils";

export type Bindings = Env & {
  OAUTH_PROVIDER: OAuthHelpers;
};

const app = new Hono<{
  Bindings: Bindings;
}>();

// Render a basic homepage placeholder to make sure the app is up
app.get("/", async (c) => {
  return c.html(
    <Layout>
      <Home />
    </Layout>
  );
});

// Render an authorization page
// If the user is logged in, we'll show a form to approve the appropriate scopes
// If the user is not logged in, we'll show a form to both login and approve the scopes
app.get("/authorize", async (c) => {
  // We don't have an actual auth system, so to demonstrate both paths, you can
  // hard-code whether the user is logged in or not. We'll default to true
  // const isLoggedIn = false;
  const isLoggedIn = true;

  const oauthReqInfo = await c.env.OAUTH_PROVIDER.parseAuthRequest(c.req.raw);

  const oauthScopes = [
    {
      name: "read_profile",
      description: "Read your basic profile information",
    },
    { name: "read_data", description: "Access your stored data" },
    { name: "write_data", description: "Create and modify your data" },
  ];

  if (isLoggedIn) {
    return c.html(
      <Layout>
        <LoggedInAuthorizeScreen
          oauthScopes={oauthScopes}
          oauthReqInfo={oauthReqInfo}
        />
      </Layout>
    );
  }

  return c.html(
    <Layout>
      <LoggedOutAuthorizeScreen
        oauthScopes={oauthScopes}
        oauthReqInfo={oauthReqInfo}
      />
    </Layout>
  );
});

// The /authorize page has a form that will POST to /approve
// This endpoint is responsible for validating any login information and
// then completing the authorization request with the OAUTH_PROVIDER
app.post("/approve", async (c) => {
  const data = await c.req.parseBody();
  console.log("__approve__", data);
  const { action, oauthReqInfo, email, password } = await parseApproveFormBody(
    data
  );

  if (!oauthReqInfo) {
    return c.html("INVALID LOGIN", 401);
  }

  // If the user needs to both login and approve, we should validate the login first
  if (action === "login_approve") {
    // We'll allow any values for email and password for this demo
    // but you could validate them here
    // Ex:
    if (email !== "user@example.com" || password !== "password") {
      // biome-ignore lint/correctness/noConstantCondition: This is a demo
      // if (false) {
      return c.html(
        <Layout>
          <ApproveContent
            message="Authorization rejected."
            status="error"
            redirectUrl="/"
          />
        </Layout>
      );
    }
  }

  // The user must be successfully logged in and have approved the scopes, so we
  // can complete the authorization request
  const { redirectTo } = await c.env.OAUTH_PROVIDER.completeAuthorization({
    request: oauthReqInfo,
    userId: email,
    metadata: {
      label: "Test User",
    },
    scope: oauthReqInfo.scope,
    props: {
      userEmail: email,
    },
  });

  return c.html(
    <Layout>
      <ApproveContent
        message="Authorization approved!"
        status="success"
        redirectUrl={redirectTo}
      />
    </Layout>
  );
});

export const Layout: FC = (props) => {
  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>BuildClub.io MCP Server</title>
        <link href="/styles.css" rel="stylesheet"></link>
      </head>
      <body class="bg-gray-50 text-gray-800 font-sans leading-relaxed flex flex-col min-h-screen">
        <header class="bg-white shadow-sm mb-8">
          <div class="container mx-auto px-4 py-4 flex justify-between items-center">
            <a
              href="/"
              class="text-xl font-heading font-bold text-primary hover:text-primary/80 transition-colors"
            >
              <img src="/logo.png" alt="BuildClub.io Logo" class="h-12" />
            </a>
          </div>
        </header>
        <main class="container mx-auto px-4 pb-12 flex-grow">
          {props.children}
        </main>
        <footer class="bg-gray-100 py-6 mt-12">
          <div class="container mx-auto px-4 text-center text-gray-600">
            <p>
              &copy; {new Date().getFullYear()} BuildClub.io. All rights
              reserved.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
};

export const LoggedInAuthorizeScreen: FC<{
  oauthScopes: { name: string; description: string }[];
  oauthReqInfo: AuthRequest;
}> = ({ oauthScopes, oauthReqInfo }) => {
  return (
    <div class="max-w-md mx-auto bg-white p-8 rounded-lg shadow-md">
      <h1 class="text-2xl font-heading font-bold mb-6 text-gray-900">
        Authorization Request
      </h1>

      <div class="mb-8">
        <h2 class="text-lg font-semibold mb-3 text-gray-800">
          MCP Remote Auth Demo would like permission to:
        </h2>
        <ul class="space-y-2">
          {oauthScopes.map((scope) => (
            <li class="flex items-start">
              <span class="inline-block mr-2 mt-1 text-secondary">✓</span>
              <div>
                <p class="font-medium">{scope.name}</p>
                <p class="text-gray-600 text-sm">{scope.description}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <form action="/approve" method="post" class="space-y-4">
        <input
          type="hidden"
          name="oauthReqInfo"
          value={JSON.stringify(oauthReqInfo)}
        />
        <input type="hidden" name="email" value="user@example.com" />
        <input type="hidden" name="password" value="password" />
        <button
          type="submit"
          name="action"
          value="approve"
          class="w-full py-3 px-4 bg-green-500 text-white rounded-md font-medium hover:bg-green-400 transition-colors"
        >
          Approve
        </button>
        <button
          type="submit"
          name="action"
          value="reject"
          class="w-full py-3 px-4 border border-gray-300 text-gray-700 rounded-md font-medium hover:bg-gray-50 transition-colors"
        >
          Reject
        </button>
      </form>
    </div>
  );
};

export const LoggedOutAuthorizeScreen: FC<{
  oauthScopes: { name: string; description: string }[];
  oauthReqInfo: AuthRequest;
}> = ({ oauthScopes, oauthReqInfo }) => {
  return (
    <div class="max-w-md mx-auto bg-white p-8 rounded-lg shadow-md">
      <h1 class="text-2xl font-heading font-bold mb-6 text-gray-900">
        Authorization Request
      </h1>

      <div class="mb-8">
        <h2 class="text-lg font-semibold mb-3 text-gray-800">
          MCP Remote Auth Demo would like permission to:
        </h2>
        <ul class="space-y-2">
          {oauthScopes.map((scope) => (
            <li class="flex items-start">
              <span class="inline-block mr-2 mt-1 text-secondary">✓</span>
              <div>
                <p class="font-medium">${scope.name}</p>
                <p class="text-gray-600 text-sm">${scope.description}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <form action="/approve" method="post" class="space-y-4">
        <input
          type="hidden"
          name="oauthReqInfo"
          value={`${JSON.stringify(oauthReqInfo)}`}
        />
        <div class="space-y-4">
          <div>
            <label
              for="email"
              class="block text-sm font-medium text-gray-700 mb-1"
            >
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
            />
          </div>
          <div>
            <label
              for="password"
              class="block text-sm font-medium text-gray-700 mb-1"
            >
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
            />
          </div>
        </div>
        <button
          type="submit"
          name="action"
          value="login_approve"
          class="w-full py-3 px-4 bg-primary text-white rounded-md font-medium hover:bg-primary/90 transition-colors"
        >
          Log in and Approve
        </button>
        <button
          type="submit"
          name="action"
          value="reject"
          class="w-full py-3 px-4 border border-gray-300 text-gray-700 rounded-md font-medium hover:bg-gray-50 transition-colors"
        >
          Reject
        </button>
      </form>
    </div>
  );
};

export const ApproveContent: FC<{
  message: string;
  status: string;
  redirectUrl: string;
}> = ({ message, status, redirectUrl }) => {
  return (
    <div class="max-w-md mx-auto bg-white p-8 rounded-lg shadow-md text-center">
      <div class="mb-4">
        <span
          class={`inline-block p-3 ${
            status === "success"
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          } rounded-full`}
        >
          {status === "success" ? "✓" : "✗"}
        </span>
      </div>
      <h1 class="text-2xl font-heading font-bold mb-4 text-gray-900">
        {message}
      </h1>
      <p class="mb-8 text-gray-600">
        You will be redirected back to the application shortly.
      </p>
      <a
        href="/"
        class="inline-block py-2 px-4 bg-primary text-white rounded-md font-medium hover:bg-primary/90 transition-colors"
      >
        Return to Home
      </a>
      <script
        dangerouslySetInnerHTML={{
          __html: `
            setTimeout(() => {
              window.location.href = "${redirectUrl}";
            }, 2000);
          `,
        }}
      />
    </div>
  );
};

export const Home: FC = () => {
  return (
    <div class="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-md">
      <div>
        <a href="https://buildclub.io?ref=buildclub-mcp-server" target="_blank">
          <img
            src="/logo-square.png"
            alt="BuildClub.io Logo"
            class="flex mx-auto justify-center h-48 w-48"
          />
        </a>
      </div>
      <h2 class="mb-8 text-gray-600 text-center font-bold">
        Official BuildClub.io MCP Server
      </h2>
      <p class="mb-8 text-gray-600 text-center max-w-xl mx-auto">
        This is the official MCP server for BuildClub.io. It is used to
        authenticate users and provide them with access to the BuildClub.io
        platform.
      </p>
      <h3 class="mb-2 text-gray-600 font-bold text-lg">Installation</h3>
      <h4 class="mb-2 text-gray-600 font-bold">Claude Desktop</h4>
      <p class="mb-2 text-gray-600">
        The easiest way to install the MCP server is to use Claude Desktop.
      </p>
      <ol class="mb-2 text-gray-600 list-decimal list-inside">
        <li>
          Navigate to <code>{"Settings > Developer > Edit Config"}</code>
        </li>
        <li>Open the config file and paste this snippet below.</li>
      </ol>
      <pre>
        {`
{
  mcpServers: {
    buildclub: {
      command: "npx",
      args: [
        "mcp-remote",
        "https://buildclub-mcp-server.timwheeler.workers.dev/sse",
      ],
    },
  },
}`}
      </pre>
      <h3 class="mb-2 text-gray-600 font-bold text-lg">Capabilities</h3>
      <h4 class="mb-2 text-gray-600 font-bold">Tools</h4>
      <ul class="mb-2 text-gray-600 list-disc list-inside">
        <li>
          <code>list_events</code> - Retrieve a list of BuildClub.io events
        </li>
        <li>
          <code>get_event</code> - Retrieve a BuildClub.io event by UUID
        </li>
        <li>
          <code>event_registration</code> - Register for a BuildClub.io event
        </li>
      </ul>
    </div>
  );
};

export { app };
export default app;
