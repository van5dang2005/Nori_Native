import { useChannelMessages, useDirectMessages } from '../hooks/useMessage';

interface UseChatMessagesResult<T> {
  data: T | undefined;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  refetch: () => void;
}

export function useChatMessages(
  activeTargetId: string,
  isChannel: boolean,
  limit = 20,
  page = 1
): UseChatMessagesResult<any> {
  const channelId = activeTargetId.startsWith('ch-')
    ? activeTargetId.replace('ch-', '')
    : '';

  const userId = activeTargetId.startsWith('id-')
    ? activeTargetId.replace('id-', '')
    : '';

  const channelQuery = useChannelMessages(
    channelId,
    limit,
    page
  );

  const directQuery = useDirectMessages(
    userId,
    limit,
    page
  );

  return {
    data: isChannel ? channelQuery.data : directQuery.data,
    isLoading: isChannel
      ? channelQuery.isLoading
      : directQuery.isLoading,
    isFetching: isChannel
      ? channelQuery.isFetching
      : directQuery.isFetching,
    isError: isChannel
      ? channelQuery.isError
      : directQuery.isError,
    refetch: isChannel
      ? channelQuery.refetch
      : directQuery.refetch,
  };
}
