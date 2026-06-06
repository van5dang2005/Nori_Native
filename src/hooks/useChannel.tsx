import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { ChatChannel } from "@/src/types/types";
import { create_channel, get_channels, update_channel, delete_channel, ChannelPayload } from "../services/channelService";
export const useChannel = () => {
  return useQuery<ChatChannel[]>({
    queryKey: ["channels"],
    queryFn: get_channels,
    refetchOnMount: "always",
    refetchOnWindowFocus: true, // tùy chọn
  });
};
export const useCreateChannel = () => {
  const queryClient = useQueryClient();
  return useMutation<ChatChannel, Error, Partial<ChannelPayload>>({
    mutationFn: create_channel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["channels"] });
    },
  });
};
export const useUpdateChannel = () => {
  const queryClient = useQueryClient();

  return useMutation<ChatChannel, Error, { id: string; payload: Partial<ChannelPayload> }>({
    mutationFn: ({ id, payload }) => update_channel(id, payload),
    onSuccess: (updatedChannel) => {
      // Refetch list
      queryClient.invalidateQueries({ queryKey: ["channels"] });

      // (optional) update cache detail nếu có
      queryClient.setQueryData(
        ["channels", updatedChannel.id],
        updatedChannel
      );
    },
  });
};
export const useDeleteChannel = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (id: string) => delete_channel(id),
    onSuccess: (_data, id) => {
      // Refetch list
      queryClient.invalidateQueries({ queryKey: ["channels"] });

      // Xoá cache detail nếu có
      queryClient.removeQueries({ queryKey: ["channels", id] });
    },
  });
};