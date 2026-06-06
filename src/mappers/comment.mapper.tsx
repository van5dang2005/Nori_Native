import { LogComment, Attachment, UserRole } from "@/src/types/types";
import { CommentDTO, Attachment as AttachmentDTO } from "@/src/types/types.DTO";

/**
 * Map NoteDTO from backend to CustomerLog domain model
 */
export const mapComment = (dto: CommentDTO): LogComment => {
  return {
    id: 'c-' + dto.id,
    authorId: 'id-' + dto.user_id.toString(),
    authorName: dto.user.name,
    authorRole: UserRole.MANAGER,
    text: dto.text,
    parentId: dto.parent_id ? 'c-' + dto.parent_id : undefined,
    timestamp: new Date(dto.updated_at).getTime()
  };
};

/**
 * Map multiple NoteDTO objects to CustomerLog objects
 */
export const mapComments = (dtos: CommentDTO[]): LogComment[] => {
  return dtos.map(mapComment);
};


/**
 * Map attachments from DTO format to domain format
 */
const mapAttachments = (dtoAttachments: AttachmentDTO[] | null): Attachment[] | undefined => {
  if (!dtoAttachments || dtoAttachments.length === 0) {
    return undefined;
  }

  return dtoAttachments.map((att) => ({
    id: att.url || `${att.name}-${Date.now()}`,
    name: att.name,
    url: att.url,
    type: getAttachmentType(att.type),
    size: att.size,
  }));
};

/**
 * Map MIME type to attachment type for UI rendering
 */
const getAttachmentType = (mimeType: string): 'image' | 'file' | 'video' | 'pdf' => {
  if (mimeType.startsWith('image/')) {
    return 'image';
  }
  if (mimeType.startsWith('video/')) {
    return 'video';
  }
  if (mimeType === 'application/pdf') {
    return 'pdf';
  }
  return 'file';
};