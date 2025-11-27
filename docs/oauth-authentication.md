# Wix App Authentication Options

This guide summarizes the two authentication approaches for Wix app API calls and highlights how to work with permissions.

## OAuth (Recommended)
- Uses the OAuth Client Credentials grant; no per-install handshake is required.
- Required inputs: **App ID**, **App secret**, and **App instance ID** (instanceId).
- Advantages:
  - Prevents corrupted installs and avoids refresh-token management.
  - Simpler implementation (no redirect server or database for tokens).
  - Avoids consent issues with cloned sites that can affect refresh tokens.
- Getting the instanceId:
  - Capture it from the **App Instance Installed** webhook payload (recommended to store during installation).
  - Use instanceId included in webhook payloads, service plugin metadata, or the `appInstance` query parameter on external/iframe pages.
- Requesting a token (REST): send a POST request to `https://www.wixapis.com/oauth2/token` with `grant_type=client_credentials`, app ID, app secret, and instanceId. The returned `access_token` lasts 4 hours.
- SDK usage: create a client with `AppStrategy` and the app credentials; the SDK fetches and sends the access token automatically.

## Custom Authentication (Legacy)
- Implements the OAuth 2.0 authorization code flow with redirects.
- Needed only when you must redirect users outside Wix during installation.
- Responsibilities:
  - Host redirect endpoints and complete the OAuth handshake for each install.
  - Persist the refresh token for each app instance.
  - Use the refresh token to obtain access tokens; if saving fails, the site owner may need to reinstall or you can fall back to Create Access Token.
- Drawbacks:
  - More complex setup (redirect server + refresh token storage).
  - Cloned sites can bypass consent flows, risking refresh-token issues.

## Authenticating on Behalf of a Wix User (Dashboard Pages)
- Supported via the JavaScript SDK in dashboard extensions; not available for REST.
- Create a client with `dashboard.host()` and `dashboard.auth()` to combine app and user permissions, then call APIs (for example, query products).

## Elevating Permissions in Backends
- Use backend code to make elevated API calls when frontend code authenticates as visitors/members.
- The frontend calls your authenticated backend endpoint; the backend performs the elevated Wix app API call and returns the result.

## Permissions Overview
- Each API/webhook lists required permission scopes; request only what the app needs.
- Add scopes in the app dashboard under **Permissions > Add Permissions**.
- High-level scopes (for example, *Read Stores - All Read Permissions*) already include lower-level scopes (such as *Read Products*).
- App Market compliance requires avoiding redundant permission requests.

## Identity Handling in Backends
- Backend extensions can inspect the active token using `getTokenInfo()` from `@wix/essentials` to:
  - Associate data with the caller’s identity.
  - Authenticate and authorize requests based on roles or attributes.
  - Audit or personalize responses.
  - Support usage-based billing tied to the caller.
