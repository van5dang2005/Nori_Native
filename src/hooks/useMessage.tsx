import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { ChatMessage } from "@/src/types/types";
import {
  get_channel_messages,
  create_channel_message,
  get_direct_messages,
  create_direct_message,
  ChannelMessagesResponse,
  DirectMessagesResponse,
  CreateChannelMessagePayload,
  CreateDirectMessagePayload,
  MessageCreateResponse,
} from "../services/messageService";

// Channel Messages Hooks
export const useChannelMessages = (
  channelId: string,
  perPage: number = 20,
  page: number = 1
) => {
  return useQuery<ChannelMessagesResponse>({
    queryKey: ["channel-messages", channelId, page, perPage],
    queryFn: () => get_channel_messages(channelId, perPage, page),
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    enabled: !!channelId,
  });
};

export const useCreateChannelMessage = () => {
  const queryClient = useQueryClient();

  return useMutation<
    MessageCreateResponse,
    Error,
    { channelId: string; payload: CreateChannelMessagePayload }
  >({
    mutationFn: ({ channelId, payload }) =>
      create_channel_message(channelId, payload),
    onSuccess: (data, { channelId }) => {
      // Invalidate channel messages list
      queryClient.invalidateQueries({
        queryKey: ["channel-messages", channelId],
      });
    },
    onError: (error) => {
      console.error("Failed to create channel message:", error.message);
    },
  });
};

// Direct Messages Hooks
export const useDirectMessages = (
  recipientId: string,
  perPage: number = 20,
  page: number = 1
) => {
  return useQuery<DirectMessagesResponse>({
    queryKey: ["direct-messages", recipientId, page, perPage],
    queryFn: () => get_direct_messages(recipientId, perPage, page),
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    enabled: !!recipientId,
  });
};

export const useCreateDirectMessage = () => {
  const queryClient = useQueryClient();

  return useMutation<
    MessageCreateResponse,
    Error,
    { recipientId: string; payload: CreateDirectMessagePayload }
  >({
    mutationFn: ({ recipientId, payload }) =>
      create_direct_message(recipientId, payload),
    onSuccess: (data, { recipientId }) => {
      // Invalidate direct messages list
      queryClient.invalidateQueries({
        queryKey: ["direct-messages", recipientId],
      });
    },
    onError: (error) => {
      console.error("Failed to create direct message:", error.message);
    },
  });
};