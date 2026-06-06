import api from "./api";
import { ChatMessage } from "@/src/types/types";

// Types
export interface Attachment {
  name: string;
  path: string;
  size: number;
}

export interface PaginationData {
  total: number;
  per_page: number;
  current_page: number;
  last_page: number;
}

export interface Messages {
  id: number;
  user_id: string;
  messageable_type: string;
  messageable_id: string;
  content: string;
  attachments: Attachment[] | null;
  read_at: string | null;
  created_at: string;
  updated_at: string;
}
export interface ChannelMessagesResponse {
  data: Messages[];
  pagination: PaginationData;
}

export interface DirectMessagesResponse {
  data: Messages[];
  pagination: PaginationData;
  recipient: {
    id: string;
    name: string;
    email: string;
  };
}

export interface MessageCreateResponse {
  message: string;
  data: Messages;
}

export interface CreateChannelMessagePayload {
  content: string;
  attachments?: File[];
}

export interface CreateDirectMessagePayload {
  content: string;
  attachments?: File[];
}

// Channel Messages
export const get_channel_messages = (
  channelId: string,
  perPage: number = 20,
  page: number = 1
): Promise<ChannelMessagesResponse> => {
  return api
    .get<ChannelMessagesResponse>(`/messages/channel/${channelId}`, {
      params: {
        per_page: perPage,
        page,
      },
    })
    .then((res) => res.data)
    .catch((error) => {
      if (error.response?.status === 403) {
        return Promise.reject(new Error("Unauthorized to view this channel"));
      }
      return Promise.reject(error);
    });
};

export const create_channel_message = (
  channelId: string,
  payload: CreateChannelMessagePayload
): Promise<MessageCreateResponse> => {
  const formData = new FormData();
  formData.append("content", payload.content);

  if (payload.attachments && payload.attachments.length > 0) {
    payload.attachments.forEach((file, index) => {
      formData.append(`attachments[${index}]`, file);
    });
  }

  return api
    .post<MessageCreateResponse>(
      `/messages/channel/${channelId}`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    )
    .then((res) => res.data)
    .catch((error) => {
      if (error.response?.status === 403) {
        return Promise.reject(
          new Error("Unauthorized to send message to this channel")
        );
      }
      return Promise.reject(error);
    });
};

// Direct Messages
export const get_direct_messages = (
  recipientId: string,
  perPage: number = 20,
  page: number = 1
): Promise<DirectMessagesResponse> => {
  return api
    .get<DirectMessagesResponse>(`/messages/direct/${recipientId}`, {
      params: {
        per_page: perPage,
        page,
      },
    })
    .then((res) => res.data)
    .catch((error) => Promise.reject(error));
};

export const create_direct_message = (
  recipientId: string,
  payload: CreateDirectMessagePayload
): Promise<MessageCreateResponse> => {
  const formData = new FormData();
  formData.append("content", payload.content);

  if (payload.attachments && payload.attachments.length > 0) {
    payload.attachments.forEach((file, index) => {
      formData.append(`attachments[${index}]`, file);
    });
  }

  return api
    .post<MessageCreateResponse>(
      `/messages/direct/${recipientId}`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    )
    .then((res) => res.data)
    .catch((error) => {
      if (error.response?.status === 422) {
        return Promise.reject(new Error("Cannot send message to yourself"));
      }
      return Promise.reject(error);
    });
};