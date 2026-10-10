export interface DecodedToken {
  sub: string;
  email?: string;
  'cognito:groups'?: string[];
  exp: number;
}

export function parseJwt(token: string): DecodedToken | null {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload) as DecodedToken;
  } catch {
    return null;
  }
}

export function isModeratorToken(token: string): boolean {
  const decoded = parseJwt(token);
  if (!decoded) return false;
  // Check if token has expired
  if (Date.now() >= decoded.exp * 1000) return false;
  // Check if user belongs to 'Moderators' group
  return Boolean(decoded['cognito:groups']?.includes('Moderators'));
}

export function getCognitoLoginUrl(): string {
  const domain =
    process.env.NEXT_PUBLIC_COGNITO_DOMAIN ||
    'https://heatflood-prod.auth.ap-south-1.amazoncognito.com';
  const clientId =
    process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || '2lujrf79hedrp17ojn6ng8gaj2';
  const redirectUri =
    process.env.NEXT_PUBLIC_COGNITO_REDIRECT_URI ||
    (typeof window !== 'undefined'
      ? `${window.location.origin}/auth/callback`
      : 'http://localhost:3000/auth/callback');

  return `${domain}/login?client_id=${clientId}&response_type=token&scope=openid+email&redirect_uri=${encodeURIComponent(
    redirectUri
  )}`;
}