// hooks/useUsers.tsx
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { create_user, create_manager, update_role, update_role_manager, get_users, CreateUser, RoleResponse, update_user_archived_status, get_me_notifications, markAsRead, config, ReadNotificationResponse, markAsReadAll, get_report} from "../services/userService";
import { TeamMember, Notification, Pagination } from "@/src/types/types";
import { AuthResponse } from "@/src/services/authService";

// =========================
// Query: get all users
// =========================
export const useUsers = (page: number = 1, search?: string, allowedUserIds?: string[], is_sale?: boolean, is_viewer?: boolean, is_logistic?: boolean) => {
  const { data, isLoading } = useQuery<{ data: TeamMember[] }>({
    queryKey: ["users", page, search, allowedUserIds, is_sale, is_viewer, is_logistic],
    queryFn: () => get_users(page, search, allowedUserIds, is_sale, is_viewer, is_logistic),
  });
  return {
    data: data?.data,
    isLoading: isLoading,
  };
};
export const useFilterUsers = (page: number = 1, search?: string, allowedUserIds?: string[], is_sale?: boolean, is_viewer?: boolean, is_logistic?: boolean) => {
  const { data, isLoading } = useQuery<{ data: TeamMember[] }>({
    queryKey: ["filter_users", page, search, allowedUserIds, is_sale, is_viewer, is_logistic],
    queryFn: () => get_users(page, search, allowedUserIds, is_sale, is_viewer, is_logistic),
  });
  return {
    data: data?.data,
    isLoading: isLoading,
  };
};
export const useDashboardUsers = (page: number = 1, search?: string) => {
  const { data, isLoading } = useQuery<{ data: TeamMember[] }>({
    queryKey: ["dashboard_users", page, search],
    queryFn: () => get_users(page, search),
  });
  return {
    data: data?.data,
    isLoading: isLoading,
  };
};
// =========================
// Query: get all users
// =========================
export const useMeNotifications = () => {
  return useQuery<Notification[]>({
    queryKey: ["me_notifications"],
    queryFn: get_me_notifications,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });
};
export const useMarkAsRead = () => {
  const queryClient = useQueryClient();
  return useMutation<ReadNotificationResponse, Error, { noticeId: string, type: string }>({
      mutationFn: ({ noticeId, type }) => markAsRead(noticeId, type),
      onSuccess: (message) => {
        // Invalidate all notes queries
        queryClient.invalidateQueries({ queryKey: ["markAsRead"] });
      },
    });
}
export const useMarkAsReadAll = () => {
  const queryClient = useQueryClient();
  return useMutation<ReadNotificationResponse, Error, { }>({
      mutationFn: ({}) => markAsReadAll(),
      onSuccess: (message) => {
        // Invalidate all notes queries
        queryClient.invalidateQueries({ queryKey: ["markAsReadAll"] });
      },
    });
}
// =========================
// Mutation: create user
// =========================
export const useCreateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateUser) => create_user(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
};

// =========================
// Mutation: create manager
// =========================
export const useCreateManager = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateUser) => create_manager(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
};

// =========================
// Mutation: update role
// =========================
export const useUpdateRole = () => {
  const queryClient = useQueryClient();

  return useMutation<RoleResponse, unknown, { email: string; role: string }>({
    mutationFn: ({ email, role }) => update_role(email, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
};

// =========================
// Mutation: update role manager
// =========================
export const useUpdateRoleManager = () => {
  const queryClient = useQueryClient();

  return useMutation<RoleResponse, unknown, { email: string; role: string }>({
    mutationFn: ({ email, role }) => update_role_manager(email, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
};

// =========================
// Mutation: update archived status
// =========================
export const useUpdateArchivedStatus = () => {
  const queryClient = useQueryClient();

  return useMutation<AuthResponse, unknown, { id: number; isArchived: boolean }>({
    mutationFn: ({ id, isArchived }) => update_user_archived_status(id, isArchived),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
};

export const useConfig = () => {
  const queryClient = useQueryClient();

  return useMutation<AuthResponse, Error, { userID: string; name: string, img?: File }>({
    mutationFn: ({ userID, name, img }) => config(userID, name, img),
    onSuccess: (updatedUser) => {
      // Invalidate all user queries
      queryClient.invalidateQueries({ queryKey: ["users"] });

      // Update cache detail if it exists
      queryClient.setQueryData(["users", updatedUser.user.id], updatedUser);
    },
  });
};
// =========================
// Query: get report
// =========================
export const useGetReport = (userID: string) => {
  return useQuery<any>({
    queryKey: ["get_report", userID],
    queryFn: () => get_report(userID),
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });
};
