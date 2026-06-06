import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, login, logout, AuthResponse, register } from '../services/authService';
import { Language, TeamMember, UserRole } from '@/src/types/types';
import { MOCK_TEAM_MEMBERS } from '@/src/constants/constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  current_user_id: string;
  current_user: TeamMember | null;
  accessToken: string | null;
  isLoading: boolean;
  language: Language;
  registerUser: (name: string, email: string, password: string) => Promise<void>;
  loginUser: (email: string, password: string) => Promise<void>;
  logoutUser: () => void;
  update_currentUser: (updatedUser: TeamMember) => void;
  update_language: (lang: string) => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [language, setLanguage] = useState<Language>('en');
  const [role, setRole] = useState<UserRole | null>(UserRole.ONBOARD);
  const [current_user_id, setCurrentUserId] = useState<string>('');
  const [current_user, setCurrentUser] = useState<TeamMember | null>(null);
  useEffect(() => {
    const loadData = async () => {
      const storedUser = await AsyncStorage.getItem('user');
      const storedToken = await AsyncStorage.getItem('accessToken');
      const storedRole = await AsyncStorage.getItem('role');
      const storedCurrentUserId = await AsyncStorage.getItem('current_user_id');
      const storedCurrentUser = await AsyncStorage.getItem('current_user');
      const storedLanguage = await AsyncStorage.getItem('language');
      if (storedUser && storedToken && storedRole && storedCurrentUserId && storedCurrentUser) {
        setUser(JSON.parse(storedUser));
        setAccessToken(storedToken);
        setRole(storedRole as UserRole);
        setCurrentUserId(storedCurrentUserId || '');
        setCurrentUser(storedCurrentUser ? JSON.parse(storedCurrentUser) : null);
        if (storedLanguage) {
          setLanguage(storedLanguage as Language);
        }
      }
      setIsLoading(false);
    };
    loadData();
  }, []);

  const loginUser = async (email: string, password: string) => {
    const data: AuthResponse = await login({ email, password });

    let rawRole = data.user.roles[0]?.name?.toUpperCase();
    const role: UserRole | undefined = rawRole && Object.values(UserRole).includes(rawRole as UserRole)
      ? (rawRole as UserRole)
      : UserRole.ONBOARD;
    const currentUser: TeamMember = {
      id: `id-${data.user.id}`,  // Changed from user.id to data.user.id
      name: data.user.name,       // Changed from user.name to data.user.name
      email: data.user.email,     // Changed from user.email to data.user.email
      role: role,
      status: 'online' as const,
      avatar: data.user.img || MOCK_TEAM_MEMBERS[0].avatar,
      sidebarPrefs: MOCK_TEAM_MEMBERS[0].sidebarPrefs,
      isArchived: false
    };
    setUser(data.user);
    setRole(role);
    setCurrentUserId(`id-${data.user.id}`);
    setCurrentUser(currentUser);
    setAccessToken(data.token);
    await AsyncStorage.setItem('user', JSON.stringify(data.user));
    await AsyncStorage.setItem('role', role);
    await AsyncStorage.setItem('current_user_id', `id-${data.user.id}`);
    await AsyncStorage.setItem('current_user', JSON.stringify(currentUser));
    await AsyncStorage.setItem('accessToken', data.token);
  };
  const registerUser = async (name: string, email: string, password: string) => {
    const data: AuthResponse = await register({ name, email, password });
    const currentUser: TeamMember = {
      id: `id-${data.user.id}`,  // Changed from user.id to data.user.id
      name: data.user.name,       // Changed from user.name to data.user.name
      email: data.user.email,     // Changed from user.email to data.user.email
      role: role,
      status: 'online' as const,
      avatar: data.user.img || MOCK_TEAM_MEMBERS[0].avatar,
      sidebarPrefs: MOCK_TEAM_MEMBERS[0].sidebarPrefs,
      isArchived: false
    };
    setUser(data.user);
    setCurrentUserId(`id-${data.user.id}`);
    setCurrentUser(currentUser);
    setAccessToken(data.token);
    setRole(UserRole.ONBOARD);
    await AsyncStorage.setItem('user', JSON.stringify(data.user));
    await AsyncStorage.setItem('accessToken', data.token);
  };
  const logoutUser = async () => {
    await logout();
    setUser(null);
    setAccessToken(null);
    await AsyncStorage.removeItem('user');
    await AsyncStorage.removeItem('accessToken');
    await AsyncStorage.removeItem('role');
    await AsyncStorage.removeItem('current_user_id');
    await AsyncStorage.removeItem('current_user');
    await AsyncStorage.removeItem('language');
  };
  const update_currentUser = async (updatedUser: TeamMember) => {
    setCurrentUser(updatedUser);
    await AsyncStorage.setItem('current_user', JSON.stringify(updatedUser));
  };
  const update_language = (lang: Language) => {
    setLanguage(lang);
    AsyncStorage.setItem('language', lang);
  };
  return (
    <AuthContext.Provider value={{ user, accessToken, loginUser, logoutUser, registerUser, update_currentUser, update_language, isAuthenticated: !!accessToken, isLoading, role, current_user_id, current_user, language }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
