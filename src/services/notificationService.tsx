import api from "./api";
import { Messages } from './messageService';

export interface NotificationsMessagesResponse {
  direct_messages: Messages[];
  channel_messages: Messages[];
  unread_dm_count: number;
  unread_channel_count: number;
}
// Notifications Messages
export const get_notifications_messages = (): Promise<NotificationsMessagesResponse> => {
  return api
    .get<NotificationsMessagesResponse>(`/messages/notifications`)
    .then((res) => res.data)
    .catch((error) => Promise.reject(error));
};