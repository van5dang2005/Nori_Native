import { useQuery } from "@tanstack/react-query";
import { get_notifications_messages, NotificationsMessagesResponse } from "../services/notificationService";
// Notification Messages Hooks
export const useNotificationsMessages = () => {
  return useQuery<NotificationsMessagesResponse>({
    queryKey: ["notifications-messages"],
    queryFn: () => get_notifications_messages(),
    refetchOnMount: "always",
    refetchOnWindowFocus: true
  });
};