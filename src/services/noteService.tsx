import api from "./api";
import { CustomerLog, Pagination } from "@/src/types/types";
import { NoteDTO } from "@/src/types/types.DTO";
import { mapNote, mapNotes } from "@/src/mappers/note.mapper";

export type NoteCategory =  'note' | 'task' | 'alert' | 'update' | 'quick_note';
export type NoteLogType = "PO" | "Complaint" | "Document" | "Price" | "General";
export type NotePriority = 'low' | 'medium' | 'high' | 'urgent';
export type NoteStatus = 'open' | 'resolved' | 'closed';

export interface CreateNotePayload {
  content: string;
  category?: NoteCategory;
  log_type?: NoteLogType;
  priority?: NotePriority;
  status?: NoteStatus;
  is_private?: boolean;
  deadline?: string;
  assign_id?: string;
  attachments?: File[];
}

export interface UpdateNotePayload extends CreateNotePayload {}

export interface NotesListResponse {
  data: NoteDTO[];
  current_page?: number;
  last_page?: number;
  per_page?: number;
  total?: number;
  from: number;
  to: number;
}

export interface CreateNoteResponse {
  message: string;
  data: NoteDTO;
}

export interface UpdateNoteResponse {
  message: string;
  data: NoteDTO;
}

export interface NotesQueryParams {
  customerID?: string;
  category?: NoteCategory;
  priority?: string;
  status?: NoteStatus;
  userID?: string;
  isPrivate?: boolean;
  perPage?: number;
  page?: number;
  search?: string;
}

// Get all notes with optional filters
export const get_notes = async (
  params: NotesQueryParams = {}
): Promise<{ data: CustomerLog[], pagination: Pagination }> => {
  const {
    perPage = 10,
    page = 1,
  } = params;

  const queryParams = new URLSearchParams();
  queryParams.append('per_page', String(perPage));
  queryParams.append('page', String(page));
  if (params.search) {
    queryParams.append('search', params.search);
  }
  if (params.priority) {
    queryParams.append('priority', params.priority);
  }
  const res = await api.get<NotesListResponse>(`/notes?${queryParams.toString()}`);
  return {
      data : mapNotes(res.data.data),
      pagination: {
        current_page: res.data.current_page,
        per_page: res.data.per_page,
        last_page: res.data.last_page,
        from: res.data.from,
        to: res.data.to,
        total: res.data.total
      }
    }
};

// Get a single note by ID
export const get_note = async (noteID: string): Promise<CustomerLog> => {
  const res = await api.get<NoteDTO>(`/notes/${noteID}`);
  return mapNote(res.data);
};

// Create a new note for a customer
export const create_note = async (
  customerID: string,
  payload: CreateNotePayload
): Promise<CustomerLog> => {
  const formData = new FormData();
  formData.append('content', payload.content);
  if (payload.category) formData.append('category', payload.category);
  if (payload.log_type) formData.append('log_type', payload.log_type);
  if (payload.priority) formData.append('priority', payload.priority);
  if (payload.status) formData.append('status', payload.status);
  if (payload.deadline) formData.append('deadline', payload.deadline);
  if (payload.assign_id) formData.append('assign_id', payload.assign_id);
  if (payload.is_private !== undefined) {
    formData.append('is_private', payload.is_private ? '1' : '0');
  }

  if (payload.attachments && payload.attachments.length > 0) {
    payload.attachments.forEach((file, index) => {
      formData.append(`attachments[${index}]`, file);
    });
  }

  const res = await api.post<CreateNoteResponse>(
    `/customers/${customerID}/notes`,
    formData
  );
  return mapNote(res.data.data);
};

// Update an existing note
export const update_note = async (
  noteID: string,
  payload: UpdateNotePayload
): Promise<CustomerLog> => {
  // Validate content is not empty
  if (!payload.content || !payload.content.trim()) {
    throw new Error('Content is required');
  }

  const formData = new FormData();

  formData.append('content', payload.content.trim());
  if (payload.category) formData.append('category', payload.category);
  if (payload.log_type) formData.append('log_type', payload.log_type);
  if (payload.priority) formData.append('priority', payload.priority);
  if (payload.status) formData.append('status', payload.status);
  if (payload.deadline) formData.append('deadline', payload.deadline);
  if (payload.assign_id) formData.append('assign_id', payload.assign_id);
  if (payload.is_private !== undefined) {
    formData.append('is_private', payload.is_private ? '1' : '0');
  }

  if (payload.attachments && payload.attachments.length > 0) {
    payload.attachments.forEach((file, index) => {
      formData.append(`attachments[${index}]`, file);
    });
  }

  const res = await api.post<UpdateNoteResponse>(`/notes/${noteID}`, formData);
  return mapNote(res.data.data);
};
export const archive_note = async (
  id: string,
  isArchived: boolean
): Promise<UpdateNoteResponse> => {
  const res = await api.post(`notes/${id}/archive`, {
    is_archived: isArchived,
  });
  return res.data;
};
export const pin_note = async (
  id: string,
  isPinned: boolean
): Promise<UpdateNoteResponse> => {
  const res = await api.post(`notes/${id}/pin`, {
    is_pinned: isPinned,
  });
  return res.data;
};
// Delete a note
export const delete_note = async (noteID: string): Promise<void> => {
  await api.delete(`/notes/${noteID}`);
};

// Get notes for a specific customer with filters
export const get_notes_by_customer = async (
  customerID: string,
  params: {
    status?: NoteStatus;
    priority?: NotePriority;
    perPage?: number;
    page?: number;
  } = {}
): Promise<{ data: CustomerLog[]; pagination: Pagination }> => {
  const { status, priority, perPage = 10, page = 1 } = params;

  const queryParams = new URLSearchParams();

  if (status) queryParams.append('status', status);
  if (priority) queryParams.append('priority', priority);
  queryParams.append('per_page', String(perPage));
  queryParams.append('page', String(page));

  const res = await api.get<NotesListResponse>(
    `/customers/${customerID}/notes?${queryParams.toString()}`
  );
  return {
      data : res.data.data.map(mapNote),
      pagination: {
        current_page: res.data.current_page,
        per_page: res.data.per_page,
        last_page: res.data.last_page,
        from: res.data.from,
        to: res.data.to,
        total: res.data.total
      }
    }
};