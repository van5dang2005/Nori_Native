import api from "./api";
import { CustomerDTO } from "@/src/types/types.DTO";
import { Customer, Pagination, PaginatedResponse } from "@/src/types/types";
import { mapCustomer } from "@/src/mappers/customer.mapper";

export interface CustomerPayload {
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
  assign_users: number[];
  created_at: string;
  updated_at: string;
}
export interface CustomerResponse {
  data: CustomerDTO;
  message: string;
}

export const get_customers = async (page: number, search?: string, isArchived?: boolean): Promise<{ data: Customer[], pagination: Pagination }> => {
  const res = await api.get<PaginatedResponse<CustomerDTO>>(`/customers?page=${page}&search=${search || ''}${isArchived !== undefined ? `&is_archived=${isArchived}` : ''}`);
  return {
    data : res.data.data.map(mapCustomer),
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

export const create_customer = async (
  payload: Partial<CustomerPayload>
): Promise<Customer> => {
  const res = await api.post<CustomerDTO>("/customers", payload);
  return mapCustomer(res.data);
};
export const update_customer = async (
  id: string,
  payload: Partial<CustomerPayload>
): Promise<Customer> => {
  const res = await api.put<CustomerDTO>(`/customers/${id}`, payload);
  return mapCustomer(res.data);
};
export const archive_customer = async (
  id: string,
  is_archive: boolean
): Promise<CustomerDTO> => {
  const res = await api.post<CustomerResponse>(`/customers/${id}/archive`, { is_archived: is_archive });
  return res.data.data;
};
export const delete_customer = async (id: string): Promise<void> => {
  await api.delete(`/customers/${id}`);
};

export const get_customer_by_id = async (id: string): Promise<Customer> => {
  const res = await api.get<CustomerDTO>(`/customers/${id}`);
  return mapCustomer(res.data);
};

export const search_customers = async (
  query: string
): Promise<Customer[]> => {
  const res = await api.get<PaginatedResponse<CustomerDTO>>(
    `/customers/search?query=${encodeURIComponent(query)}`
  );
  return res.data.data.map(mapCustomer);
};