# Wix Access Token Endpoints

This reference outlines how to create and refresh access tokens for Wix apps using both legacy custom authentication and OAuth client credentials. Use the flow that matches your app’s authentication model.

## Custom Authentication (Legacy)

### Request an Access Token (creates refresh + initial access token)
- **Endpoint:** `POST https://www.wixapis.com/oauth/access`
- **Use when:** Exchanging an authorization code received after the user installs the app.
- **Body:**
  ```json
  {
    "grant_type": "authorization_code",
    "client_id": "<APP_ID>",
    "client_secret": "<APP_SECRET_KEY>",
    "code": "<AUTH_CODE>"
  }
  ```
- **Response:**
  ```json
  {
    "access_token": "<ACCESS_TOKEN>",
    "refresh_token": "<REFRESH_TOKEN>"
  }
  ```

### Refresh an Access Token
- **Endpoint:** `POST https://www.wixapis.com/oauth/access`
- **Use when:** You already have a refresh token and need a new access token.
- **Body:**
  ```json
  {
    "grant_type": "refresh_token",
    "client_id": "<APP_ID>",
    "client_secret": "<APP_SECRET_KEY>",
    "refresh_token": "<REFRESH_TOKEN>"
  }
  ```
- **Response:**
  ```json
  {
    "access_token": "<ACCESS_TOKEN>",
    "refresh_token": "<REFRESH_TOKEN>"
  }
  ```
- **Notes:** The refresh token does not expire; the access token expires after 5 minutes.

## OAuth Client Credentials (Recommended for Wix apps)

### Create an Access Token
- **Endpoint:** `POST https://www.wixapis.com/oauth2/token`
- **Use when:** Your app is using OAuth client credentials (no per-install redirect flow).
- **Body (raw JSON bytes):**
  ```json
  {
    "grant_type": "client_credentials",
    "client_id": "<APP_ID>",
    "client_secret": "<APP_SECRET_KEY>",
    "instance_id": "<APP_INSTANCE_ID>"
  }
  ```
- **Response:**
  ```json
  {
    "access_token": "<ACCESS_TOKEN>",
    "token_type": "Bearer",
    "expires_in": 14400
  }
  ```
- **Notes:** The access token is valid for 4 hours (14,400 seconds).

## Token Inspection

### Token Info
- **Endpoint:** `POST https://www.wixapis.com/oauth2/token-info`
- **Body:**
  ```json
  {
    "token": "<ACCESS_TOKEN>"
  }
  ```
- **Response fields:**
  - `active` (boolean): Whether the token is currently valid.
  - `subjectType` / `subjectId`: What the token was issued for.
  - `exp` / `iat`: Expiration and issued-at timestamps.
  - `clientId`: App ID that created the token.
  - `siteId` / `instanceId`: Site and app instance identifiers.

## Quick cURL Examples

```bash
# Exchange authorization code for refresh + access tokens (custom auth)
curl -X POST 'https://www.wixapis.com/oauth/access' \
  -H 'Content-Type: application/json' \
  -d '{
    "grant_type": "authorization_code",
    "client_id": "<APP_ID>",
    "client_secret": "<APP_SECRET_KEY>",
    "code": "<AUTH_CODE>"
  }'

# Refresh an access token
curl -X POST 'https://www.wixapis.com/oauth/access' \
  -H 'Content-Type: application/json' \
  -d '{
    "grant_type": "refresh_token",
    "client_id": "<APP_ID>",
    "client_secret": "<APP_SECRET_KEY>",
    "refresh_token": "<REFRESH_TOKEN>"
  }'

# Create an OAuth client-credentials access token
curl -X POST 'https://www.wixapis.com/oauth2/token' \
  -H 'Content-Type: application/json' \
  -d '{
    "grant_type": "client_credentials",
    "client_id": "<APP_ID>",
    "client_secret": "<APP_SECRET_KEY>",
    "instance_id": "<APP_INSTANCE_ID>"
  }'

# Inspect a token
curl -X POST 'https://www.wixapis.com/oauth2/token-info' \
  -H 'Content-Type: application/json' \
  -d '{
    "token": "<ACCESS_TOKEN>"
  }'
```

## Error Handling

These endpoints return standard Wix error responses (4XX/5XX) if something goes wrong—no custom error payloads are provided. Ensure the request body matches the required grant type and credentials.
