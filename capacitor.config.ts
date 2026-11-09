import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.zeshtech.store',
  appName: 'ZESH-TECH',
  webDir: 'public',
  server: {
    // Keep the existing production storefront, admin portal and API on the
    // same HTTPS origin while the Android shell is being built and tested.
    url: 'https://www.zeshtech.in',
    cleartext: false,
    allowNavigation: ['www.zeshtech.in', 'zeshtech.in']
  },
  android: {
    allowMixedContent: false
  }
};

export default config;
