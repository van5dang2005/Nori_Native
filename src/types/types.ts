
export enum UserRole {
  SUPERVISOR = 'SUPERVISOR',
  MANAGER = 'MANAGER',
  SALE = 'SALE',
  LOGISTICS = 'LOGISTICS',
  ONBOARD = 'ONBOARD',
  VIEWER = 'VIEWER'
}

export type Language = 'en' | 'vi';
export type Theme = 'emerald' | 'sapphire' | 'midnight' | 'ruby' | 'pink-pastel' | 'panda-soft' | 'cyber-circuit' | 'sakura-dream';

export type LogPriority = 'low' | 'medium' | 'high' | 'urgent';
export type LogStatus = 'open' | 'resolved' | 'closed';
export type LogCategory = 'note' | 'task' | 'alert' | 'update' | 'quick_note';
export type LogType = 'PO' | 'Complaint' | 'Document' | 'Price' | 'General';

export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'file' | 'video' | 'pdf' | 'txt' | 'word' | 'excel' | 'ppt';
  size?: number;
  file?: File;
}

export interface LogComment {
  id: string;
  parentId?: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  text: string;
  timestamp: number;
  attachments?: Attachment[];
}

export interface LogHistoryItem {
  content: string;
  timestamp: number;
  authorId: string;
  priority?: LogPriority;
  status?: LogStatus;
  dueDate?: number;
  assigneeId?: string;
  logType?: LogType;
}

export interface CustomerLog {
  id: string;
  customerId: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  lastEditorId?: string;
  content: string;
  category: LogCategory;
  logType: LogType;
  timestamp: number;
  updatedAt?: number;
  history?: LogHistoryItem[];
  isPrivate: boolean;
  isPinned?: boolean;
  isArchived?: boolean;
  priority?: LogPriority;
  status: LogStatus;
  dueDate?: number;
  deadline?: string;
  assigneeId?: string;
  attachments?: Attachment[];
  comments?: LogComment[];
  customer?: Customer;
}

export interface Customer {
  id: string;
  name: string;
  company: string;
  email: string;
  status: 'active' | 'inactive' | 'pending';
  lastActivity: number;
  allowedRoles?: UserRole[];
  allowedUserIds?: string[];
  isPublic?: boolean;
  isArchived?: boolean;
}

export interface DashboardPrefs {
  showStats: boolean;
  showPinnedSection: boolean;
  showRecentActivity: boolean;
  showActivePersonnel: boolean;
  showDeadlines: boolean;
  order: string[];
}

export interface SidebarPrefs {
  showShortcuts: boolean;
  showChannels: boolean;
  showDMs: boolean;
  order: string[];
  dashboardPrefs?: DashboardPrefs;
  theme: Theme;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: 'online' | 'offline' | 'away';
  avatar: string;
  sidebarPrefs?: SidebarPrefs;
  isArchived?: boolean;
}

export interface Notification {
  id: string;
  recipientId: string;
  senderName: string;
  senderId?: string;
  type: 'mention' | 'reply' | 'system' | 'message' | 'urgent' | 'assignment' | 'channel';
  text: string;
  timestamp: number;
  read: boolean;
  link?: string;
  targetCustomerId?: string;
  targetLogId?: string;
  targetChatId?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model' | 'system';
  authorId: string;
  authorName?: string;
  authorRole?: UserRole;
  avatar?: string;
  text: string;
  timestamp: number;
  channelId?: string;
  recipientId?: string;
}

export interface ChatChannel {
  id: string;
  name: string;
  description: string;
  type: 'general' | 'support' | 'urgent';
  allowedRoles?: UserRole[];
  is_private?: boolean;
  allowedUserIds?: string[];
  user_ids?: string[];
}
export interface Pagination {
  current_page: number;
  per_page: number;
  last_page: number;
  from: number;
  to: number;
  total: number;
}
export interface PaginatedResponse<T> {
  data: T[];

  current_page: number;
  last_page: number;
  per_page: number;
  from: number;
  to: number;
  total: number;
}