import axios from "axios";
import { ENV } from "../config/env";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from "expo-router";

const api = axios.create({
  baseURL: ENV.API_BASE_URL,
});
// Sử dụng async interceptor cho request
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Sử dụng async interceptor cho response
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const keys = ["accessToken", "user", "role", "current_user_id", "current_user"];
      await AsyncStorage.multiRemove(keys);
      router.replace("(auth)/login");   
    }
    return Promise.reject(error);
  }
);

export default api;