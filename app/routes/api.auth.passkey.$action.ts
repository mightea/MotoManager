import { data } from "react-router";
import type { Route } from "./+types/api.auth.passkey.$action";
import { 
  generateRegistrationOptions, 
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse
} from "~/services/webauthn.server";
import { requireUser, createSession } from "~/services/auth.server";

export async function loader({ params, request }: Route.LoaderArgs) {
  const action = params.action;

  if (action === "register-options") {
    const { user } = await requireUser(request);
    const { options, challengeId } = await generateRegistrationOptions(user.id);
    return data({ options, challengeId });
  }

  if (action === "login-options") {
    const url = new URL(request.url);
    const username = url.searchParams.get("username") || undefined;
    const { options, challengeId } = await generateAuthenticationOptions(username);
    return data({ options, challengeId });
  }

  throw new Response("Not Found", { status: 404 });
}

export async function action({ params, request }: Route.ActionArgs) {
  const action = params.action;
  const body = await request.json();

  if (action === "register-verify") {
    await requireUser(request);
    const { challengeId, response } = body;
    const result = await verifyRegistrationResponse(challengeId, response);
    return data(result);
  }

  if (action === "login-verify") {
    const { challengeId, response } = body;
    const result = await verifyAuthenticationResponse(challengeId, response);
    
    if (result.verified && result.userId) {
      const { headers } = await createSession(result.userId);
      return data({ verified: true }, { headers });
    }
    
    return data({ verified: false }, { status: 400 });
  }

  throw new Response("Not Found", { status: 404 });
}
