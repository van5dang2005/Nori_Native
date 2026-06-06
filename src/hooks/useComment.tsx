import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { LogComment } from "@/src/types/types";
import {create_comment, CreateCommentPayload} from "@/src/services/commentService";

/**
 * Hook to create a new note
 */
export const useCreateComment = () => {
  const queryClient = useQueryClient();

  return useMutation<LogComment, Error, { noteID: string; payload: CreateCommentPayload }>({
    mutationFn: ({ noteID, payload }) => create_comment(noteID, payload),
    onSuccess: (newComment) => {
      // Invalidate all notes queries
      queryClient.invalidateQueries({ queryKey: ["comments"] });

      // Update cache with new note
      queryClient.setQueryData(["comment", newComment.id], newComment);
    },
  });
};


