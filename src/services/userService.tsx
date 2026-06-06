import api from "./api";
import { AuthResponse, User } from "./authService";
import { mapUser } from "@/src/mappers/user.mapper";
import { MeDTO, UserDTO } from "@/src/types/types.DTO";
import { TeamMember, Notification } from "@/src/types/types";
import { mapNotification } from "@/src/mappers/notificaton.mapper";
export interface CreateUser {
  name: string;
  email: string;
  role: string;
}
export interface RoleResponse {
  user: User;
  message: string;
}
export interface UsersResponse {
  users: UserDTO[];
}
export interface ReadNotificationResponse {
  status: string;
  message: string;
}
export const create_user = async (data: CreateUser): Promise<AuthResponse> => {
  const res = await api.post("/users", data);
  return res.data;
};
export const create_manager = async (data: CreateUser): Promise<AuthResponse> => {
  const res = await api.post("/store_manager", data);
  return res.data;
};
export const update_role = async (email: string, role: string): Promise<RoleResponse> => {
  const res = await api.put("/update_role", { email, role });
  return res.data;
}
export const update_role_manager = async (email: string, role: string): Promise<RoleResponse> => {
  const res = await api.put("/update_role_manager", { email, role });
  return res.data;
}
export const update_user_archived_status = async (
  id: number,
  isArchived: boolean
): Promise<AuthResponse> => {
  const res = await api.put(`/update_archived/${id}`, {
    is_archived: isArchived,
  });
  return res.data;
};
export const config = async (
  id: string,
  name: string,
  img: File
): Promise<AuthResponse> => {
  if (!name || !name.trim()) {
    throw new Error('Content is required');
  }
  const formData = new FormData();
  formData.append('name', name.trim());
  if (img) {
    formData.append('img', img);
  }
  const res = await api.post<AuthResponse>(`/user/${id}/config`, formData);
  return res.data;
};
export const get_users = async (page: number, search?: string, ids?: string[], is_sale?: boolean, is_viewer?: boolean,is_logistic?: boolean ): Promise<{ data: TeamMember[] }> => {
  const params: any = { page };
  if (search) params.search = search;
  if (ids && ids.length > 0) {
    params.ids = ids.map(id => id.replace('id-', '')).join(',');
  }
  if (is_sale !== undefined) params.is_sale = is_sale;
  if (is_viewer !== undefined) params.is_viewer = is_viewer;
  if (is_logistic !== undefined) params.is_logistic = is_logistic;

  const res = await api.get<UsersResponse>('/users', { params });

  return {
    data: res.data.users.map(mapUser),
  };
};
export const get_me_notifications = async (): Promise<Notification[]> => {
  const res = await api.get<MeDTO>("/me");
  return res.data.notifications.map(mapNotification);
};
export const markAsRead = async (noticeId: string, typeNotice: string): Promise<ReadNotificationResponse> => {
  const res = await api.post<ReadNotificationResponse>(`/notifications/read`, { type: typeNotice, target_id: noticeId });
  return res.data;
};
export const markAsReadAll = async (): Promise<ReadNotificationResponse> => {
  const res = await api.post<ReadNotificationResponse>(`/notifications/clear`);
  return res.data;
};
export const get_report = async (userID: string): Promise<any> => {
  const res = await api.get<any>("/user/" + userID + "/report");
  return res.data;
};
