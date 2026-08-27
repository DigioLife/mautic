import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

export interface Tag {
  id: string;
  name: string;
  color: string | null;
}

export interface Contact {
  id: string;
  email: string | null;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  company: string | null;
  jobTitle: string | null;
  leadScore: number;
  lifecycleStage: string;
  isSubscribed: boolean;
  createdAt: string;
  tags: { tag: Tag }[];
}

export interface ContactsListParams {
  page?: number;
  limit?: number;
  q?: string;
  tagId?: string;
}

export interface ContactInput {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  jobTitle?: string;
  lifecycleStage?: string;
}

interface ListResponse {
  success: boolean;
  data: Contact[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export function useContactsList(params: ContactsListParams) {
  return useQuery({
    queryKey: ['contacts', params],
    queryFn: async () => {
      const { data } = await api.get<ListResponse>('/contacts', { params });
      return data;
    },
    placeholderData: (prev) => prev,
  });
}

export function useCreateContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ContactInput) => {
      const { data } = await api.post('/contacts', input);
      return data.data as Contact;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });
}

export function useUpdateContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: ContactInput }) => {
      const { data } = await api.put(`/contacts/${id}`, input);
      return data.data as Contact;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });
}

export function useDeleteContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/contacts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });
}

export function useTags() {
  return useQuery({
    queryKey: ['tags'],
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: Tag[] }>('/contacts/tags');
      return data.data;
    },
  });
}
