import { UserDTO } from "@/src/types/types.DTO";
import { TeamMember, UserRole } from "@/src/types/types";
import { MOCK_TEAM_MEMBERS } from "@/src/constants/constants";

export const mapUser = (dto: UserDTO): TeamMember => {
    const randomIndex = Math.floor(Math.random() * MOCK_TEAM_MEMBERS.length);
    const randomAvatar = MOCK_TEAM_MEMBERS[randomIndex].avatar;
    return {
        id: `id-${dto.id}`,
        name: dto.name,
        email: dto.email,
        role: dto.roles?.[0]?.name?.toUpperCase()  as UserRole || UserRole.ONBOARD,
        status: 'offline' as const,
        avatar: dto.img || randomAvatar,
        sidebarPrefs: MOCK_TEAM_MEMBERS[randomIndex].sidebarPrefs,
        isArchived: dto.is_archived == '1' ? true : false,
    };
};
