import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.syllabusshelf.app',
  appName: 'SyllabusShelf',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
