import Constants from "expo-constants";

const extra = Constants.expoConfig?.extra;

export const ENV = {
  API_BASE_URL: extra?.API_BASE_URL ?? "",
  SOCKET_SERVER_URL: extra?.SOCKET_SERVER_URL ?? "",
  SOCKET_URL: extra?.SOCKET_URL ?? "",
  MODE_APP: extra?.MODE_APP ?? "dev"
};