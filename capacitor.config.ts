import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.voicetonotes.app',
  appName: 'Voice to Notes',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    FirebaseAuthentication: {
      skipNativeAuth: false,
      providers: ["google.com"]
    }
  }
};

export default config;
