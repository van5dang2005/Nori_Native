import { NoteDTO, Attachment as AttachmentDTO } from "@/src/types/types.DTO";
import { CustomerLog, Attachment, UserRole, LogStatus, LogCategory, LogType, LogPriority } from "@/src/types/types";
import { mapComments } from "./comment.mapper";
/**
 * Map NoteDTO from backend to CustomerLog domain model
 */
export const mapNote = (dto: NoteDTO): CustomerLog => {
  return {
    id: dto.id.toString(),
    customerId: dto.customer_id.toString(),
    authorId: 'id-' + dto.user_id.toString(),
    authorName: dto.user.name,
    authorRole: UserRole.SUPERVISOR,
    content: dto.content,
    category: mapCategory(dto.category),
    logType: mapLogType(dto.log_type),
    timestamp: new Date(dto.created_at).getTime(),
    dueDate: dto.deadline ? new Date(dto.deadline).getTime() : null,
    deadline: dto.deadline,
    assigneeId: dto.assign_id ? 'id-' + dto.assign_id.toString() : null,
    updatedAt: new Date(dto.updated_at).getTime(),
    isPrivate: dto.is_private == '1' ? true : false,
    isPinned: dto.is_pinned == '1' ? true : false,
    isArchived: dto.is_archived == '1' ? true : false,
    priority: dto.priority as LogPriority,
    status: mapStatus(dto.status),
    attachments: mapAttachments(dto.attachments),
    customer: dto.customer ? {
      id: dto.customer.id.toString(),
      company: dto.customer.company,
      name: dto.customer.name,
      email: dto.customer.email,
      status: dto.customer.status,
      lastActivity: new Date(dto.updated_at).getTime(),
      isPublic: dto.customer.is_public,
    } : null,
    comments: dto.comments ? mapComments(dto.comments) : null,
  };
};

/**
 * Map multiple NoteDTO objects to CustomerLog objects
 */
export const mapNotes = (dtos: NoteDTO[]): CustomerLog[] => {
  return dtos.map(mapNote);
};

/**
 * Map backend status to domain status
 */
const mapStatus = (status: 'open' | 'closed' | 'resolved'): LogStatus => {
  const statusMap: Record<'open' | 'closed' | 'resolved', LogStatus> = {
    open: 'open',
    closed: 'closed',
    resolved: 'resolved',
  };
  return statusMap[status] || 'open';
};

/**
 * Map backend category to domain category
 */
const mapCategory = (category: 'update' | 'note' | 'quick_note'): LogCategory => {
  const categoryMap: Record<'update' | 'note' | 'quick_note', LogCategory> = {
    update: 'update',
    note: 'note',
    quick_note: 'quick_note',
  };
  return categoryMap[category] || 'note';
};

/**
 * Map backend log type to domain log type
 */
const mapLogType = (logType: 'General' | 'Document' | 'Price' | 'PO' | 'Complaint'): LogType => {
  const logTypeMap: Record<'General' | 'Document' | 'Price' | 'PO' | 'Complaint', LogType> = {
    General: 'General',
    Document: 'Document',
    Price: 'Price',
    PO: 'PO',
    Complaint: 'Complaint',
  };
  return logTypeMap[logType] || 'General';
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
const getAttachmentType = (
  mimeType: string,
  fileName?: string
): 'image' | 'file' | 'video' | 'pdf' | 'txt' | 'word' | 'excel' | 'ppt' => {

  const ext = fileName?.split('.').pop()?.toLowerCase();

  // IMAGE
  if (mimeType?.startsWith('image/')) {
    return 'image';
  }

  // VIDEO
  if (mimeType?.startsWith('video/')) {
    return 'video';
  }

  // PDF
  if (mimeType === 'application/pdf' || ext === 'pdf') {
    return 'pdf';
  }

  // TXT
  if (
    mimeType === 'text/plain' ||
    mimeType === 'application/json' ||
    ext === 'txt' ||
    ext === 'json'
  ) {
    return 'txt';
  }

  // WORD
  if (
    mimeType?.includes('word') ||
    mimeType?.includes('wordprocessingml') ||
    ['doc','docx','docm','dot','dotx','dotm'].includes(ext || '')
  ) {
    return 'word';
  }

  // EXCEL
  if (
    mimeType?.includes('spreadsheet') ||
    mimeType?.includes('excel') ||
    mimeType === 'text/csv' ||
    ['xls','xlsx','xlsm','xltx','xltm','csv'].includes(ext || '')
  ) {
    return 'excel';
  }

  // POWERPOINT
  if (
    mimeType?.includes('presentation') ||
    mimeType?.includes('powerpoint') ||
    ['ppt','pptx','pps','ppsx'].includes(ext || '')
  ) {
    return 'ppt';
  }

  return 'file';
};