export const rpName = 'SyncAttend';

export const getRpID = (req: Request) => {
  const host = req.headers.get('host') || 'localhost';
  return host.split(':')[0];
};

export const getExpectedOrigin = (req: Request) => {
  const host = req.headers.get('host') || 'localhost:3000';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  return `${protocol}://${host}`;
};
