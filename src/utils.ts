import type { AuthRequest } from "@cloudflare/workers-oauth-provider";

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
