import api from "./api";
import { ChatChannel } from "@/src/types/types";

export interface ChannelResponse {
  data: ChatChannel[];
}
export interface ChannelPayload {
  name: string;
  description: string;
  type: 'general' | 'support' | 'urgent';
  is_private: boolean,
  user_ids: string[]
}
export const get_channels = async (): Promise<ChatChannel[]> => {
  const res = await api.get<ChannelResponse>("/channels");
  return res.data.data;
};

export const create_channel = async (
  payload: Partial<ChannelPayload>
): Promise<ChatChannel> => {
  const res = await api.post<ChatChannel>("/channels", payload);
  return res.data;
};
export const update_channel = async (
  id: string,
  payload: Partial<ChannelPayload>
): Promise<ChatChannel> => {
  const res = await api.put<ChatChannel>(`/channels/${id}`, payload);
  return res.data;
};

export const delete_channel = async (id: string): Promise<void> => {
  await api.delete(`/channels/${id}`);
};

export const get_channel_by_id = async (id: string): Promise<ChatChannel> => {
  const res = await api.get<ChatChannel>(`/channels/${id}`);
  return res.data;
};

export const search_channels = async (
  query: string
): Promise<ChatChannel[]> => {
  const res = await api.get<ChatChannel[]>(
    `/channels/search?query=${encodeURIComponent(query)}`
  );
  return res.data;
};