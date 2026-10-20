import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.syllabusshelf.app',
  appName: 'Notes Shelf',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
