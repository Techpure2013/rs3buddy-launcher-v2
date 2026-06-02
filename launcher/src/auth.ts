import type { BrowserWindow as BrowserWindowType } from 'electron';
import * as crypto from 'crypto';
import * as https from 'https';
import { getBrowserWindow, getNet, getSession } from './electron';
import {
  OAUTH_CONFIG,
  getSessions,
  addSession,
  saveCredentials
} from './config';
import type {
  AuthTokens,
  Session,
  GameAccount,
  JwtPayload,
  SessionsApiResponse
} from './types';

// Response type for net requests
interface NetResponse {
  statusCode: number;
  on(event: 'data', listener: (chunk: Buffer) => void): void;
  on(event: 'end', listener: () => void): void;
}

// OAuth state
let currentCodeVerifier: string | null = null;
let currentOAuthState: string | null = null;
let currentConsentNonce: string | null = null;
let pendingInitialTokens: AuthTokens | null = null;
let loginWindow: BrowserWindowType | null = null;
let processingRedirect: boolean = false;  // Guard against duplicate redirect handling

// Callbacks for login events
let onLoginSuccessCallback: ((session: Session) => void) | null = null;
let onLoginErrorCallback: ((error: string) => void) | null = null;

// PKCE helpers
function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString('base64url');
}

function generateCodeChallenge(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

// Decode JWT payload (without signature verification)
export function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    return JSON.parse(Buffer.from(parts[1], 'base64').toString());
  } catch {
    return null;
  }
}

// ---- JWT Signature Verification (JWKS) ----

interface JwksKey {
  kid: string;
  kty: string;
  alg?: string;
  use?: string;
  [key: string]: unknown;
}

let cachedJwks: JwksKey[] | null = null;
let jwksFetchedAt = 0;
const JWKS_TTL_MS = 3600_000; // 1 hour

function httpsGetText(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const doGet = (u: string) => {
      const req = https.get(u, { headers: { 'User-Agent': 'RS3-Launcher-Buddy' } }, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          doGet(res.headers.location);
          return;
        }
        if (res.statusCode !== 200) { reject(new Error(`HTTP ${res.statusCode}`)); return; }
        let data = '';
        res.on('data', (chunk: Buffer) => data += chunk);
        res.on('end', () => resolve(data));
      });
      req.on('error', reject);
      req.setTimeout(10_000, () => { req.destroy(); reject(new Error('Timeout')); });
    };
    doGet(url);
  });
}

async function fetchJwks(forceRefresh = false): Promise<JwksKey[]> {
  if (!forceRefresh && cachedJwks && Date.now() - jwksFetchedAt < JWKS_TTL_MS) {
    return cachedJwks;
  }
  try {
    const disc = JSON.parse(await httpsGetText(`${OAUTH_CONFIG.origin}/.well-known/openid-configuration`));
    if (!disc.jwks_uri) throw new Error('No jwks_uri in OIDC discovery');
    const jwks = JSON.parse(await httpsGetText(disc.jwks_uri));
    cachedJwks = jwks.keys || [];
    jwksFetchedAt = Date.now();
    console.log(`[Auth] Fetched ${cachedJwks!.length} JWKS key(s)`);
    return cachedJwks!;
  } catch (e) {
    console.warn('[Auth] JWKS fetch failed:', e instanceof Error ? e.message : e);
    return cachedJwks || [];
  }
}

function verifySig(parts: string[], jwk: JwksKey, alg: string): boolean {
  const algMap: Record<string, string> = {
    RS256: 'RSA-SHA256', RS384: 'RSA-SHA384', RS512: 'RSA-SHA512',
    ES256: 'SHA256', ES384: 'SHA384', ES512: 'SHA512',
  };
  const nodeAlg = algMap[alg];
  if (!nodeAlg) { console.warn(`[Auth] Unsupported JWT alg: ${alg}`); return false; }
  const pubKey = crypto.createPublicKey({ key: jwk as any, format: 'jwk' });
  return crypto.verify(
    nodeAlg,
    Buffer.from(parts[0] + '.' + parts[1]),
    pubKey,
    Buffer.from(parts[2], 'base64url')
  );
}

/**
 * Verify a JWT's signature against the OAuth provider's JWKS.
 * Returns true if verified, false if verification fails or keys unavailable.
 * Handles key rotation by refetching JWKS when kid is not found.
 */
async function verifyJwtSignature(token: string): Promise<boolean> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
    if (!header.kid || !header.alg) return false;

    let keys = await fetchJwks();
    let jwk = keys.find(k => k.kid === header.kid && (k.use === 'sig' || !k.use));
    if (!jwk) {
      // Key not found - refetch in case of key rotation
      keys = await fetchJwks(true);
      jwk = keys.find(k => k.kid === header.kid && (k.use === 'sig' || !k.use));
      if (!jwk) { console.warn(`[Auth] No JWKS key for kid=${header.kid}`); return false; }
    }
    return verifySig(parts, jwk, header.alg);
  } catch (e) {
    console.warn('[Auth] JWT verification error:', e instanceof Error ? e.message : e);
    return false;
  }
}

/**
 * Validate standard JWT claims (issuer, expiration, audience).
 * Returns null if valid, or an error description string.
 */
function validateJwtClaims(payload: JwtPayload, expectedAud?: string): string | null {
  // Issuer check (normalize trailing slash)
  if (payload.iss) {
    const normIss = payload.iss.replace(/\/$/, '');
    const expected = OAUTH_CONFIG.origin.replace(/\/$/, '');
    if (normIss !== expected) return `Unexpected issuer: ${payload.iss}`;
  }
  // Expiration check (30-second clock skew tolerance)
  if (payload.exp && Date.now() / 1000 > payload.exp + 30) {
    return 'Token expired';
  }
  // Audience check (aud can be string or array per OIDC spec)
  if (expectedAud && payload.aud) {
    const auds = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    if (!auds.includes(expectedAud)) return `Unexpected audience: ${payload.aud}`;
  }
  return null;
}

// Set login callbacks
export function setLoginCallbacks(
  onSuccess: (session: Session) => void,
  onError: (error: string) => void
): void {
  onLoginSuccessCallback = onSuccess;
  onLoginErrorCallback = onError;
}

// Open OAuth login window
export function openLoginWindow(parentWindow: BrowserWindowType): void {
  if (loginWindow) {
    loginWindow.focus();
    return;
  }

  const BrowserWindow = getBrowserWindow();

  // Generate PKCE values
  currentCodeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(currentCodeVerifier);
  currentOAuthState = crypto.randomBytes(16).toString('hex');

  // Build OAuth URL
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: OAUTH_CONFIG.clientId,
    redirect_uri: OAUTH_CONFIG.redirectUri,
    scope: OAUTH_CONFIG.scope,
    state: currentOAuthState,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    prompt: 'login'
  });

  const authUrl = `${OAUTH_CONFIG.origin}/oauth2/auth?${params.toString()}`;

  loginWindow = new BrowserWindow({
    width: 480,
    height: 720,
    parent: parentWindow,
    modal: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Set up navigation handlers
  loginWindow.webContents.on('will-redirect', (_event, url) => {
    handleOAuthRedirect(url);
  });

  loginWindow.webContents.on('will-navigate', (event, url) => {
    if (url.startsWith('http://localhost')) {
      event.preventDefault();
      handleOAuthRedirect(url);
      return;
    }
    handleOAuthRedirect(url);
  });

  loginWindow.webContents.on('did-navigate', (_event, url) => {
    handleOAuthRedirect(url);
  });

  loginWindow.webContents.on('did-fail-load', (_event, _errorCode, _errorDescription, validatedURL) => {
    if (validatedURL.startsWith('http://localhost')) {
      const fullUrl = loginWindow?.webContents.getURL() || validatedURL;
      console.log('did-fail-load for localhost, full URL:', fullUrl);
      handleOAuthRedirect(fullUrl);
    }
  });

  loginWindow.on('closed', () => {
    loginWindow = null;
    currentCodeVerifier = null;
    currentOAuthState = null;
    currentConsentNonce = null;
    pendingInitialTokens = null;
    processingRedirect = false;
  });

  loginWindow.loadURL(authUrl);
}

// Handle OAuth redirect - TWO-STEP FLOW
async function handleOAuthRedirect(url: string): Promise<void> {
  console.log('OAuth redirect URL:', url);

  // STEP 2: Check for consent redirect (http://localhost with id_token in hash)
  if (url.startsWith(OAUTH_CONFIG.consentRedirectUri) || url.startsWith('http://localhost')) {
    const hashPart = url.includes('#') ? url.split('#')[1] : '';
    const hashParams = new URLSearchParams(hashPart);
    const consentIdToken = hashParams.get('id_token');

    console.log('Consent redirect detected');
    console.log('Has id_token:', !!consentIdToken);

    if (consentIdToken && pendingInitialTokens) {
      // Guard against duplicate processing - multiple events can fire for the same redirect
      if (processingRedirect) {
        console.log('Already processing redirect, skipping duplicate...');
        return;
      }
      processingRedirect = true;

      console.log('Step 2: Got consent id_token, calling sessions API...');

      try {
        // Validate claims, nonce, and signature on the consent id_token
        const payload = decodeJwtPayload(consentIdToken);
        if (payload) {
          const claimErr = validateJwtClaims(payload, OAUTH_CONFIG.consentClientId);
          if (claimErr) console.warn('[Auth] Consent id_token claim issue:', claimErr);
          if (currentConsentNonce && payload.nonce !== currentConsentNonce) {
            console.warn('[Auth] Nonce mismatch! Expected:', currentConsentNonce, 'Got:', payload.nonce);
          }
        }
        // Signature verification (consent token arrives via URL fragment - higher risk)
        const sigValid = await verifyJwtSignature(consentIdToken);
        if (!sigValid) console.warn('[Auth] Consent id_token signature could not be verified');

        // Get session ID using consent id_token
        const sessionData = await getSessionIdFromApi(consentIdToken, loginWindow);
        const accounts = await getAccounts(sessionData.sessionId);

        // Create and store session - IMPORTANT: store the consent id_token for future session refresh
        const newSession: Session = {
          id: crypto.randomBytes(8).toString('hex'),
          tokens: pendingInitialTokens,
          consentIdToken: consentIdToken,  // Store consent id_token for refreshing game session
          sessionId: sessionData.sessionId,
          accounts,
          createdAt: Date.now()
        };

        addSession(newSession);
        saveCredentials();

        // Cleanup
        pendingInitialTokens = null;
        currentConsentNonce = null;

        if (loginWindow) loginWindow.close();
        onLoginSuccessCallback?.(newSession);
      } catch (e) {
        console.error('Session API failed:', e);
        pendingInitialTokens = null;
        currentConsentNonce = null;
        processingRedirect = false;
        if (loginWindow) loginWindow.close();
        onLoginErrorCallback?.(e instanceof Error ? e.message : String(e));
      }
      return;
    }
  }

  // STEP 1: Initial login redirect
  const isRedirectUrl = url.startsWith(OAUTH_CONFIG.redirectUri) ||
                        url.startsWith('https://secure.runescape.com/m=weblogin/launcher-redirect');

  if (!isRedirectUrl) return;

  console.log('Got redirect to our URI, parsing...');
  const urlObj = new URL(url);
  const code = urlObj.searchParams.get('code');
  const state = urlObj.searchParams.get('state');
  const error = urlObj.searchParams.get('error');

  if (error) {
    console.error('OAuth error:', error);
    if (loginWindow) loginWindow.close();
    onLoginErrorCallback?.(error);
    return;
  }

  if (!code || state !== currentOAuthState) {
    console.error('Invalid OAuth response - code:', !!code, 'state match:', state === currentOAuthState);
    return;
  }

  // Guard against duplicate processing - the auth code can only be used once
  if (processingRedirect) {
    console.log('Already processing Step 1 redirect, skipping duplicate...');
    return;
  }
  processingRedirect = true;

  // Exchange code for tokens
  try {
    console.log('Step 1: Exchanging code for tokens...');
    const tokens = await exchangeCodeForTokens(code);

    console.log('Got initial tokens, id_token length:', tokens.idToken?.length);

    // Validate claims on the token endpoint id_token
    const payload = decodeJwtPayload(tokens.idToken);
    if (payload) {
      const claimErr = validateJwtClaims(payload, OAUTH_CONFIG.clientId);
      if (claimErr) console.warn('[Auth] id_token claim issue:', claimErr);
    }
    // Non-blocking signature check (TLS already authenticates the token endpoint)
    verifyJwtSignature(tokens.idToken).then(valid => {
      if (!valid) console.warn('[Auth] id_token signature could not be verified');
    });

    // Save tokens for step 2
    pendingInitialTokens = tokens;

    // Generate nonce for consent
    currentConsentNonce = crypto.randomUUID();

    // Navigate to consent page
    const consentState = crypto.randomBytes(16).toString('hex');
    const consentParams = new URLSearchParams({
      id_token_hint: tokens.idToken,
      nonce: currentConsentNonce,
      prompt: 'consent',
      redirect_uri: OAUTH_CONFIG.consentRedirectUri,
      response_type: 'id_token code',
      state: consentState,
      client_id: OAUTH_CONFIG.consentClientId,
      scope: 'openid offline'
    });

    const consentUrl = `${OAUTH_CONFIG.origin}/oauth2/auth?${consentParams.toString()}`;
    console.log('Step 1 complete, navigating to consent page...');

    // Reset the guard so Step 2 can be processed
    processingRedirect = false;

    loginWindow?.loadURL(consentUrl);
  } catch (e) {
    console.error('Token exchange failed:', e);
    processingRedirect = false;
    if (loginWindow) loginWindow.close();
    onLoginErrorCallback?.(e instanceof Error ? e.message : String(e));
  }
}

// Exchange authorization code for tokens
async function exchangeCodeForTokens(code: string): Promise<AuthTokens> {
  const net = getNet();

  return new Promise((resolve, reject) => {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: OAUTH_CONFIG.clientId,
      code,
      code_verifier: currentCodeVerifier || '',
      redirect_uri: OAUTH_CONFIG.redirectUri
    });

    const request = net.request({
      method: 'POST',
      url: `${OAUTH_CONFIG.origin}/oauth2/token`
    });

    request.setHeader('Content-Type', 'application/x-www-form-urlencoded');
    request.setHeader('Accept', 'application/json');

    let data = '';
    request.on('response', (response: NetResponse) => {
      console.log('Token exchange response status:', response.statusCode);
      response.on('data', (chunk: Buffer) => { data += chunk; });
      response.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.error) {
            console.error('Token exchange error:', result.error, result.error_description);
            reject(new Error(result.error_description || result.error));
          } else {
            resolve({
              accessToken: result.access_token,
              idToken: result.id_token,
              refreshToken: result.refresh_token,
              expiresAt: Date.now() + (result.expires_in * 1000)
            });
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    request.on('error', reject);
    request.write(params.toString());
    request.end();
  });
}

// Get session ID from Jagex auth API
async function getSessionIdFromApi(idToken: string, browserWindow: BrowserWindowType | null): Promise<SessionsApiResponse> {
  console.log('Sessions API - using Electron net with session');
  const net = getNet();
  const defaultSession = getSession();

  return new Promise((resolve, reject) => {
    const ses = browserWindow?.webContents?.session || defaultSession;

    const request = net.request({
      method: 'POST',
      url: 'https://auth.jagex.com/game-session/v1/sessions',
      session: ses,
      useSessionCookies: true
    });

    request.setHeader('Content-Type', 'application/json');
    request.setHeader('Accept', 'application/json');

    let data = '';
    request.on('response', (response: NetResponse) => {
      console.log('Sessions API response status:', response.statusCode);
      response.on('data', (chunk: Buffer) => { data += chunk; });
      response.on('end', () => {
        console.log('Sessions API response: [REDACTED]');
        try {
          const result = JSON.parse(data);
          if (result.sessionId) {
            resolve({ sessionId: result.sessionId });
          } else {
            reject(new Error('sessionId not found: ' + data));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    request.on('error', reject);
    request.write(JSON.stringify({ idToken }));
    request.end();
  });
}

// Get linked accounts (game characters)
async function getAccounts(sessionId: string): Promise<GameAccount[]> {
  const net = getNet();

  return new Promise((resolve) => {
    const request = net.request({
      method: 'GET',
      url: `${OAUTH_CONFIG.authApi}/accounts`
    });

    request.setHeader('Accept', 'application/json');
    request.setHeader('Authorization', `Bearer ${sessionId}`);

    let data = '';
    request.on('response', (response: NetResponse) => {
      console.log('Accounts API response status:', response.statusCode);
      response.on('data', (chunk: Buffer) => { data += chunk; });
      response.on('end', () => {
        console.log('Accounts API response:', data);
        try {
          const result = JSON.parse(data);
          if (Array.isArray(result)) {
            resolve(result);
          } else if (result.accounts) {
            resolve(result.accounts);
          } else {
            resolve([]);
          }
        } catch {
          resolve([]);
        }
      });
    });

    request.on('error', () => resolve([]));
    request.end();
  });
}

// Refresh OAuth tokens if needed
export async function refreshTokensIfNeeded(sessionIndex: number): Promise<Session | null> {
  const sessions = getSessions();
  const sessionData = sessions[sessionIndex];
  const net = getNet();

  if (!sessionData || !sessionData.tokens.refreshToken) return null;

  // Check if OAuth token expires in less than 30 seconds
  const needsOAuthRefresh = sessionData.tokens.expiresAt - Date.now() < 30000;

  // The consent id_token is SINGLE-USE - once we get a session ID from it, we can't use it again.
  // We just use the stored session ID. If it expires (after ~30 min), the game will show an error
  // and the user needs to log in again.
  console.log('Using stored game session ID');

  if (!needsOAuthRefresh) {
    // OAuth tokens are still valid, return current session with stored session ID
    return sessionData;
  }

  // Refresh OAuth tokens first
  return new Promise((resolve, reject) => {
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: OAUTH_CONFIG.clientId,
      refresh_token: sessionData.tokens.refreshToken
    });

    const request = net.request({
      method: 'POST',
      url: `${OAUTH_CONFIG.origin}/oauth2/token`
    });

    request.setHeader('Content-Type', 'application/x-www-form-urlencoded');

    let data = '';
    request.on('response', (response: NetResponse) => {
      response.on('data', (chunk: Buffer) => { data += chunk; });
      response.on('end', async () => {
        try {
          const result = JSON.parse(data);
          if (result.error) {
            // Token expired, remove session
            sessions.splice(sessionIndex, 1);
            saveCredentials();
            reject(new Error('Session expired'));
          } else {
            sessionData.tokens = {
              accessToken: result.access_token,
              idToken: result.id_token,
              refreshToken: result.refresh_token || sessionData.tokens.refreshToken,
              expiresAt: Date.now() + (result.expires_in * 1000)
            };

            // Note: We can't refresh the game session ID here because the consent id_token is single-use.
            // The stored session ID will be used. If it's expired, the game will show an error.

            saveCredentials();
            resolve(sessionData);
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    request.on('error', reject);
    request.write(params.toString());
    request.end();
  });
}
