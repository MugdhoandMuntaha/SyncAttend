import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.syncattend.app',
  appName: 'SyncAttend',
  webDir: 'public',
  server: {
    url: 'https://sync-attend.vercel.app',
    cleartext: true
  }
};

export default config;
