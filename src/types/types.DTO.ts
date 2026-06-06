import { Role } from '../services/authService';
export interface CustomerDTO {
  id: number;
  name: string;
  company: string;
  email: string;
  status: 'active' | 'inactive' | 'pending';

  is_public: boolean;
  is_viewer: boolean;
  is_sale: boolean;
  is_logistics: boolean;
  is_archived: boolean;
  assign_users: {
    user_id: number;
    id: number;
    customer_id: number;
  }[];
  created_at: string;
  updated_at: string;
}
export interface UserDTO {
  id: number;
  name: string;
  email: string;
  roles: Role[];
  is_archived?: string;
  created_at: string;
  updated_at: string;
  img: string;
}
export interface MeDTO{
  id: number;
  name: string;
  email: string;
  roles: Role[];
  is_archived?: string;
  created_at: string;
  updated_at: string;
  notifications: NotificationDTO[];
}
export interface NotificationDataDTO {
  note_id?: number;
  comment_id?: number;
  customer_id: string | number;
  customer_name: string;
  content: string;
  type: string;
  category: 'note' | 'quick_note' | 'update' | 'task' | 'alert';
  sender: {
    id: string | number;
    name: string;
  };
  created_at: string;
}
export interface NotificationDTO {
  id: string;
  type: string;
  notifiable_type: string;
  notifiable_id: string | number;
  data: NotificationDataDTO;
  read_at: string | null;
  created_at: string;
  updated_at: string;
}
export interface NoteDTO {
  id: number;
  customer_id: number;
  user_id: number;
  content: string;
  category: 'update' | 'note' | 'quick_note';
  log_type: 'General' | 'Document' | 'Price' | 'PO' | 'Complaint';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'closed' | 'resolved';
  is_private: string;
  is_pinned: string;
  is_archived: string;
  deadline: string | null;
  assign_id: number | null;
  attachments: Attachment[] | null;
  user: {
    id: number;
    name: string;
    email: string;
  };
  customer: {
    id: number;
    name: string;
    company: string;
    email: string;
    is_public: boolean;
    is_viewer: boolean;
    is_sale: boolean;
    status: 'active' | 'inactive' | 'pending';
  };
  comments: CommentDTO[];
  created_at: string;
  updated_at: string;
}
export interface CommentDTO{
    id: string;
    parent_id: number;
    note_id: number
    user_id: number;
    text: string;
    created_at: string;
    updated_at: string;
    attachments?: Attachment[];
    user: {
      id: number;
      name: string;
      email: string;
    };
}
export interface Attachment {
  name: string;
  url: string;
  size: number;
  type: string;
}
