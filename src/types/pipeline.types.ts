export type PipelineStage = 'backlog' | 'todo' | 'progress' | 'review' | 'done';
export type PipelineTag = 'feature' | 'bug' | 'design' | 'urgent' | 'task';
export type PipelinePriority = 'low' | 'medium' | 'high' | 'urgent';

export interface PipelineCard {
  id: string;
  title: string;
  col: PipelineStage;
  tag: PipelineTag;
  tagLabel: string;
  priority: PipelinePriority;
  due?: string;
  assignee?: string;
  assigneeId?: string;
  customerId?: string;
  customerName?: string;
  noteId?: string;
  createdAt: number;
}

export interface PipelineColumn {
  id: PipelineStage;
  title: string;
  accent: string;
  limit?: number;
}

export const PIPELINE_COLUMNS: PipelineColumn[] = [
  { id: 'backlog', title: 'Backlog', accent: '#94a3b8' },
  { id: 'todo', title: 'To Do', accent: '#378ADD' },
  { id: 'progress', title: 'In Progress', accent: '#EF9F27' },
  { id: 'review', title: 'Review', accent: '#AFA9EC' },
  { id: 'done', title: 'Done', accent: '#10b981' },
];

export const TAG_COLORS: Record<PipelineTag, { bg: string; text: string; border: string }> = {
  feature: { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
  bug: { bg: '#fffbeb', text: '#b45309', border: '#fde68a' },
  design: { bg: '#f5f3ff', text: '#6d28d9', border: '#ddd6fe' },
  urgent: { bg: '#fff1f2', text: '#be123c', border: '#fecdd3' },
  task: { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
};

export const PRIORITY_COLORS: Record<PipelinePriority, string> = {
  urgent: '#E24B4A',
  high: '#EF9F27',
  medium: '#378ADD',
  low: '#10b981',
};
