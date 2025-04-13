// Helper to generate the layout
import { html, raw } from "hono/html";
import type { HtmlEscapedString } from "hono/utils/html";
import { marked } from "marked";
import type { AuthRequest } from "@cloudflare/workers-oauth-provider";
import { env } from "cloudflare:workers";

export const renderApproveContent = async (
  message: string,
  status: string,
  redirectUrl: string
) => {
  return html`
    <div class="max-w-md mx-auto bg-white p-8 rounded-lg shadow-md text-center">
      <div class="mb-4">
        <span
          class="inline-block p-3 ${status === "success"
            ? "bg-green-100 text-green-800"
            : "bg-red-100 text-red-800"} rounded-full"
        >
          ${status === "success" ? "✓" : "✗"}
        </span>
      </div>
      <h1 class="text-2xl font-heading font-bold mb-4 text-gray-900">
        ${message}
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
      ${raw(`
				<script>
					setTimeout(() => {
						window.location.href = "${redirectUrl}";
					}, 2000);
				</script>
			`)}
    </div>
  `;
};

export const renderAuthorizationApprovedContent = async (
  redirectUrl: string
) => {
  return renderApproveContent(
    "Authorization approved!",
    "success",
    redirectUrl
  );
};

export const renderAuthorizationRejectedContent = async (
  redirectUrl: string
) => {
  return renderApproveContent("Authorization rejected.", "error", redirectUrl);
};

export const parseApproveFormBody = async (body: {
  [x: string]: string | File;
}) => {
  const action = body.action as string;
  const email = body.email as string;
  const password = body.password as string;
  let oauthReqInfo: AuthRequest | null = null;
  try {
    oauthReqInfo = JSON.parse(body.oauthReqInfo as string) as AuthRequest;
  } catch (e) {
    oauthReqInfo = null;
  }

  return { action, oauthReqInfo, email, password };
};
