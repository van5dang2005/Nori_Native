import api from "./api";
import { CommentDTO } from "@/src/types/types.DTO";
import { mapComment, mapComments } from "@/src/mappers/comment.mapper";
import { LogComment } from "@/src/types/types";

export interface CreateCommentPayload {
  text: string;
  mentionIds?: string[];
  parent_id?: string
  attachments?: File[];
}
export interface CreateCommentResponse {
  message: string;
  data: CommentDTO;
}
// Create a new note for a customer
export const create_comment = async (
  noteID: string,
  payload: CreateCommentPayload
): Promise<LogComment> => {
  const formData = new FormData();

  formData.append('text', payload.text);
  
  if (payload.mentionIds && payload.mentionIds.length > 0) {
    payload.mentionIds.forEach((id) => {
      formData.append(
        'mentionIds[]',
        id.replace(/id-/g, '')
      );
    });
  }
  if (payload.parent_id) formData.append('parent_id', payload.parent_id.toString());
  

  if (payload.attachments && payload.attachments.length > 0) {
    payload.attachments.forEach((file, index) => {
      formData.append(`attachments[${index}]`, file);
    });
  }

  const res = await api.post<CreateCommentResponse>(
    `/comments/${noteID}`,
    formData
  );
  return mapComment(res.data.data);
};