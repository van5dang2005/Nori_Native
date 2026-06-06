import { CustomerDTO } from "@/src/types/types.DTO";
import { Customer, UserRole } from "@/src/types/types";

export const mapCustomer = (dto: CustomerDTO): Customer => {
  const roles: UserRole[] = [];

  if (dto.is_viewer) roles.push(UserRole.VIEWER);
  if (dto.is_sale) roles.push(UserRole.SALE);
  if (dto.is_logistics) roles.push(UserRole.LOGISTICS);
  return {
    id: dto.id.toString(),
    name: dto.name,
    company: dto.company,
    email: dto.email,
    status: dto.is_archived ? 'inactive' : 'active',

    isPublic: dto.is_public,
    allowedRoles: roles,
    isArchived: dto.is_archived,
    allowedUserIds: dto.assign_users.map(user => `id-${user.user_id}`),
    lastActivity: new Date(dto.updated_at).getTime(),
  };
};
