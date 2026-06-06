import { NotificationDTO } from '@/src/types/types.DTO.ts';
import { Notification } from '@/src/types/types.ts';


export const mapNotification = (dto: NotificationDTO): Notification => {
  const data = dto.data || ({} as any);
  const msg = dto.data?.type == 'assignment' ? `${data.sender?.name || 'Unknown'} assigned you a ${data.log_type || 'log'} with ${data.priority || 'normal'} priority for customer ${data.customer_name || 'Unknown Customer'}.` 
                : `${data.sender?.name || 'Unknown'} mentioned you in a comment.`;
  const id = dto.data?.type == 'assignment' ?  'note-' + dto.data.note_id : 'comment-' + dto.data.comment_id;
  return {
    id: id,
    type: dto.data.type as Notification['type'],
    text: msg,         
    timestamp: new Date(dto.created_at).getTime(),
    read: dto.read_at !== null,
    recipientId: dto.notifiable_id ? 'id-' + dto.notifiable_id.toString() : '',
    senderName: data.sender?.name || 'System',
    senderId: data.sender?.id ? data.sender.id.toString() : undefined,
    link: 'customers',
    targetCustomerId: data.customer_id ? data.customer_id.toString() : undefined,
    targetLogId: undefined,
    targetChatId: undefined,
  };
};