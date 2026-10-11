const DEFAULT_MAPBOX_TOKEN =
  typeof atob !== 'undefined'
    ? atob(
        'cGsuZXlKMUlqb2llV0Z6YUdob01EVWlMQ0poSWpvaVkyMTFiMlJxZDJScU1EUjNOeko2Y3pkc2NUWXljMjFxTmlKOS5mdWV0R09SdFpJSHVjaUlPN2xsNTRn'
      )
    : typeof Buffer !== 'undefined'
    ? Buffer.from(
        'cGsuZXlKMUlqb2llV0Z6YUdob01EVWlMQ0poSWpvaVkyMTFiMlJxZDJScU1EUjNOeko2Y3pkc2NUWXljMjFxTmlKOS5mdWV0R09SdFpJSHVjaUlPN2xsNTRn',
        'base64'
      ).toString('utf-8')
    : '';

export function getMapboxToken(): string {
  const envToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.trim();
  if (
    envToken &&
    envToken.startsWith('pk.') &&
    !envToken.includes('YOUR_') &&
    !envToken.includes('<') &&
    envToken.length > 30
  ) {
    return envToken;
  }
  return DEFAULT_MAPBOX_TOKEN;
}

export const hasValidToken: boolean = Boolean(
  getMapboxToken().startsWith('pk.') && getMapboxToken().length > 30
);
