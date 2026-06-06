import 'dotenv/config';
import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  return {
    ...config,
    name: process.env.APP_NAME || "Nori",
    slug: "nori",
    scheme: "nori",
    version: "1.0.19",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: process.env.BUNDLE_ID || "com.trungtrinh.nori",
      buildNumber: "1.0.19",
      icon: "./assets/adaptive-icon.png",
      infoPlist: {
        NSCameraUsageDescription: "This app uses camera",
        NSMicrophoneUsageDescription: "This app uses microphone",
        NSPhotoLibraryUsageDescription: "This app requires access to your photo library so you can select and upload a profile picture or share images directly in your newsfeed posts."
      }
    },
    android: {
      package: process.env.BUNDLE_ID || "com.trungtrinh.nori",
      versionCode: 5,
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff"
      }
    },
    web: {
      favicon: "./assets/favicon.png",
      bundler: "metro"
    },
    extra: {
      API_BASE_URL: process.env.API_URL,
      SOCKET_SERVER_URL: process.env.SOCKET_URL,
      MODE_APP: process.env.APP_VARIANT || "dev",
      SOCKET_URL: process.env.SOCKET_URL,
      eas: {
        projectId: "2e77db02-6ba3-4b0f-ac50-b738a10b3fb6"
      }
    },
  };
};