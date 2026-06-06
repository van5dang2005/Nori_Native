import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { CustomerLog, Pagination } from "@/src/types/types";
import {
  get_notes,
  get_note,
  get_notes_by_customer,
  create_note,
  update_note,
  archive_note,
  pin_note,
  delete_note,
  CreateNotePayload,
  UpdateNotePayload,
  UpdateNoteResponse,
  NotesQueryParams,
} from "@/src/services/noteService";

/**
 * Hook to fetch all notes with optional filters
 */
export const useNotes = (params: NotesQueryParams = {}) => {
  const { data, isLoading } =  useQuery<{ data: CustomerLog[], pagination: Pagination }>({
    queryKey: ["notes", params],
    queryFn: () => get_notes(params),
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });
  return {
    data: data?.data,
    pagination: data?.pagination,
    isLoading: isLoading,
  };
};

/**
 * Hook to fetch a single note by ID
 */
export const useNote = (noteID: string) => {
  return useQuery<CustomerLog>({
    queryKey: ["notes", noteID],
    queryFn: () => get_note(noteID),
    enabled: !!noteID,
    refetchOnWindowFocus: true,
  });
};

/**
 * Hook to fetch notes for a specific customer
 */
export const useNotesByCustomer = (
  customerID: string,
  params: {
    status?: 'open' | 'resolved' | 'closed';
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    perPage?: number;
    page?: number;
  } = {}
) => {
   const { data, isLoading } = useQuery<{ data: CustomerLog[], pagination: Pagination }>({
    queryKey: ["notes", "customer", customerID, params],
    queryFn: () => get_notes_by_customer(customerID, params),
    enabled: !!customerID,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });
  return {
    data: data?.data ?? null,
    pagination: data?.pagination ?? null,
    isLoading,
  };
};

/**
 * Hook to create a new note
 */
export const useCreateNote = () => {
  const queryClient = useQueryClient();

  return useMutation<CustomerLog, Error, { customerID: string; payload: CreateNotePayload }>({
    mutationFn: ({ customerID, payload }) => create_note(customerID, payload),
    onSuccess: (newNote) => {
      // Invalidate all notes queries
      queryClient.invalidateQueries({ queryKey: ["notes"] });

      // Update cache with new note
      queryClient.setQueryData(["notes", newNote.id], newNote);
    },
  });
};

/**
 * Hook to update an existing note
 */
export const useUpdateNote = () => {
  const queryClient = useQueryClient();

  return useMutation<CustomerLog, Error, { noteID: string; payload: UpdateNotePayload }>({
    mutationFn: ({ noteID, payload }) => update_note(noteID, payload),
    onSuccess: (updatedNote) => {
      // Invalidate all notes queries
      queryClient.invalidateQueries({ queryKey: ["notes"] });

      // Update cache detail if it exists
      queryClient.setQueryData(["notes", updatedNote.id], updatedNote);
    },
  });
};
// =========================
// Mutation: update archived 
// =========================
export const useUpdateNoteArchivedStatus = () => {
  const queryClient = useQueryClient();

  return useMutation<UpdateNoteResponse, Error, { id: string; isArchived: boolean }>({
    mutationFn: ({ id, isArchived }) => archive_note(id, isArchived),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
    },
  });
};
// =========================
// Mutation: update archived 
// =========================
export const useUpdateNotePinStatus = () => {
  const queryClient = useQueryClient();

  return useMutation<UpdateNoteResponse, unknown, { id: string; isPinned: boolean }>({
    mutationFn: ({ id, isPinned }) => pin_note(id, isPinned),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
    },
  });
};
/**
 * Hook to delete a note
 */
export const useDeleteNote = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (noteID) => delete_note(noteID),
    onSuccess: () => {
      // Invalidate all notes queries
      queryClient.invalidateQueries({ queryKey: ["notes"] });
    },
  });
};