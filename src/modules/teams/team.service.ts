import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../lib/prisma/prisma.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { AddMemberDto, TeamMemberRole } from './dto/add-member.dto';
import { AttendanceStatus } from '@prisma/client';

interface TeamMemberDetail {
  id: string;
  teamId: string;
  specialite: string;
  name: string;
  email: string;
  dateDebut: string;
  status: string;
  initials: string;
  color: string;
  starred: boolean;
}

@Injectable()
export class TeamService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertSiteAccess(siteId: string, organizationId?: string | null) {
    if (!organizationId) throw new NotFoundException(`Chantier ${siteId} introuvable`);
    const site = await this.prisma.site.findFirst({
      where: { id: siteId, organizationId },
    });
    if (!site) throw new NotFoundException(`Chantier ${siteId} introuvable`);
  }

  async findAll(siteId?: string, organizationId?: string | null) {
    if (!organizationId) return [];
    return this.prisma.team.findMany({
      where: siteId
        ? { siteId, site: { organizationId } }
        : { site: { organizationId } },
      orderBy: { createdAt: 'desc' },
      include: {
        site: { select: { id: true, name: true } },
        leader: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { members: true } },
      },
    });
  }

  async findOne(id: string, organizationId?: string | null) {
    const team = await this.prisma.team.findFirst({
      where: { id, site: { organizationId: organizationId ?? '__no_org__' } },
      include: {
        site: { select: { id: true, name: true } },
        leader: { select: { id: true, firstName: true, lastName: true } },
        members: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
              },
            },
          },
          orderBy: { joinedAt: 'asc' },
        },
      },
    });
    if (!team) throw new NotFoundException(`Équipe ${id} introuvable`);
    return team;
  }

  async create(dto: CreateTeamDto, organizationId?: string | null) {
    await this.assertSiteAccess(dto.siteId, organizationId);
    return this.prisma.team.create({
      data: {
        siteId: dto.siteId,
        name: dto.name,
        leaderId: dto.leaderId ?? null,
      },
      include: {
        site: { select: { id: true, name: true } },
        leader: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async update(id: string, dto: UpdateTeamDto, organizationId?: string | null) {
    await this.findOne(id, organizationId);
    return this.prisma.team.update({
      where: { id },
      data: {
        name: dto.name,
        leaderId: dto.leaderId,
      },
      include: {
        site: { select: { id: true, name: true } },
        leader: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async remove(id: string, organizationId?: string | null) {
    await this.findOne(id, organizationId);
    await this.prisma.team.delete({ where: { id } });
    return { message: 'Équipe supprimée' };
  }

  async getMembers(teamId: string, organizationId?: string | null) {
    await this.findOne(teamId, organizationId);
    return this.prisma.teamMember.findMany({
      where: { teamId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });
  }

  async addMember(teamId: string, dto: AddMemberDto, organizationId?: string | null) {
    await this.findOne(teamId, organizationId);
    const user = await this.prisma.user.findFirst({
      where: { id: dto.userId, organizationId: organizationId ?? '__no_org__' },
    });
    if (!user) throw new NotFoundException('Utilisateur introuvable');

    const existing = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: dto.userId } },
    });

    if (existing) {
      throw new ConflictException(
        'Cet utilisateur est déjà membre de cette équipe',
      );
    }

    return this.prisma.teamMember.create({
      data: {
        teamId,
        userId: dto.userId,
        role: dto.role ?? TeamMemberRole.WORKER,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },
    });
  }

  async removeMember(teamId: string, userId: string, organizationId?: string | null) {
    await this.findOne(teamId, organizationId);
    const user = await this.prisma.user.findFirst({
      where: { id: userId, organizationId: organizationId ?? '__no_org__' },
    });
    if (!user) throw new NotFoundException('Utilisateur introuvable');

    const member = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
    });

    if (!member)
      throw new NotFoundException(
        'Ce membre est introuvable dans cette équipe',
      );

    await this.prisma.teamMember.delete({
      where: { teamId_userId: { teamId, userId } },
    });

    return { message: "Membre retiré de l'équipe" };
  }

  async getTeamStats(siteId: string, organizationId?: string | null) {
    await this.assertSiteAccess(siteId, organizationId);
    const teams = await this.prisma.team.findMany({
      where: { siteId },
    });
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startOfWeek = new Date(today);
    const dayOfWeek = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 4);
    endOfWeek.setHours(23, 59, 59, 999);

    const allAttendances = await this.prisma.attendance.findMany({
      where: {
        teamId: { in: teams.map((t) => t.id) },
        date: {
          gte: startOfWeek,
          lte: endOfWeek,
        },
      },
      orderBy: { date: 'desc' },
    });
    let selectedDate = today;
    let dayAttendances = allAttendances.filter(
      (a) => a.date.getTime() === today.getTime(),
    );
    if (dayAttendances.length === 0 && allAttendances.length > 0) {
      selectedDate = allAttendances[0].date;
      dayAttendances = allAttendances.filter(
        (a) => a.date.getTime() === selectedDate.getTime(),
      );
    }
    const total = dayAttendances.length;
    const presents = dayAttendances.filter(
      (a) => a.status === AttendanceStatus.PRESENT,
    ).length;
    const retards = dayAttendances.filter(
      (a) => a.status === AttendanceStatus.RETARD,
    ).length;
    const absents = dayAttendances.filter(
      (a) => a.status === AttendanceStatus.ABSENT,
    ).length;
    const conges = dayAttendances.filter(
      (a) => a.status === AttendanceStatus.CONGE,
    ).length;
    const surSite = dayAttendances.filter(
      (a) => a.status === AttendanceStatus.PRESENT && a.checkOut === null,
    ).length;
    const totalNonPresents = absents + conges;
    return {
      total: total,
      complete: presents,
      enCours: surSite,
      retards,
      enAttente: 0,
      annule: absents,
      pctPresents: total > 0 ? Math.round((presents / total) * 100) : 0,
      pctAbsents: total > 0 ? Math.round((totalNonPresents / total) * 100) : 0,
      pctComplete: total > 0 ? Math.round((presents / total) * 100) : 0,
      pctEnCours: total > 0 ? Math.round((retards / total) * 100) : 0,
    };
  }

  async getTeamMembersDetails(siteId: string, organizationId?: string | null): Promise<TeamMemberDetail[]> {
    await this.assertSiteAccess(siteId, organizationId);
    const teams = await this.prisma.team.findMany({
      where: { siteId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
              },
            },
          },
        },
      },
    });

    if (teams.length === 0) {
      return [];
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendances = await this.prisma.attendance.findMany({
      where: {
        teamId: { in: teams.map((t) => t.id) },
        date: today,
      },
    });

    const attendanceMap = new Map(attendances.map((a) => [a.userId, a.status]));

    const colors = [
      '#f97316',
      '#6366f1',
      '#10b981',
      '#f43f5e',
      '#8b5cf6',
      '#0ea5e9',
      '#ec4899',
      '#14b8a6',
    ];

    const statusMap: Record<string, string> = {
      PRESENT: 'Présent',
      ABSENT: 'Absent',
      RETARD: 'En retard',
      CONGE: 'En congé',
    };

    const membersMap = new Map<string, TeamMemberDetail>();

    teams.forEach((team, teamIndex) => {
      team.members.forEach((member, memberIndex) => {
        if (!membersMap.has(member.userId)) {
          const user = member.user;
          const initials =
            `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
          const colorIndex =
            (teamIndex * teams.length + memberIndex) % colors.length;
          const attendanceStatus = attendanceMap.get(user.id);
          const status = attendanceStatus
            ? statusMap[attendanceStatus] || 'En attente'
            : 'En attente';

          const specialite =
            member.role === 'CHEF_EQUIPE'
              ? "Chef d'équipe"
              : this.getRoleDisplayName(user.role);

          membersMap.set(member.userId, {
            id: user.id,
            teamId: team.id,
            specialite,
            name: `${user.firstName} ${user.lastName}`,
            email: user.email,
            dateDebut: member.joinedAt.toISOString().split('T')[0],
            status,
            initials,
            color: colors[colorIndex],
            starred: false,
          });
        }
      });
    });

    return Array.from(membersMap.values());
  }

  async getAttendanceWeek(siteId: string, startDate?: string, organizationId?: string | null) {
    await this.assertSiteAccess(siteId, organizationId);
    const teams = await this.prisma.team.findMany({
      where: { siteId },
    });

    if (teams.length === 0) {
      return { days: [], dates: [], attendances: {} };
    }

    const start = startDate ? new Date(startDate) : new Date();
    start.setHours(0, 0, 0, 0);

    if (!startDate) {
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1);
      start.setDate(diff);
    }

    const days: string[] = [];
    const dates: Date[] = [];
    const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

    for (let i = 0; i < 5; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      dates.push(date);
      const dayName = dayNames[date.getDay()];
      const dayNum = date.getDate();
      days.push(`${dayName} ${dayNum}`);
    }

    const endDate = new Date(dates[4]);
    endDate.setHours(23, 59, 59, 999);

    const attendances = await this.prisma.attendance.findMany({
      where: {
        teamId: { in: teams.map((t) => t.id) },
        date: {
          gte: dates[0],
          lte: endDate,
        },
      },
      orderBy: { date: 'asc' },
    });

    const attendanceMap: Record<string, string[]> = {};

    const members = await this.prisma.teamMember.findMany({
      where: {
        teamId: { in: teams.map((t) => t.id) },
      },
      select: {
        userId: true,
      },
    });

    const uniqueUserIds = [...new Set(members.map((m) => m.userId))];

    const statusMap: Record<string, string> = {
      PRESENT: 'present',
      ABSENT: 'absent',
      RETARD: 'retard',
      CONGE: 'conge',
    };

    uniqueUserIds.forEach((userId) => {
      const userAttendances: string[] = [];

      dates.forEach((date) => {
        const dateStr = date.toISOString().split('T')[0];
        const attendance = attendances.find(
          (a) =>
            a.userId === userId &&
            a.date.toISOString().split('T')[0] === dateStr,
        );

        userAttendances.push(
          attendance
            ? statusMap[attendance.status] || 'en-attente'
            : 'en-attente',
        );
      });

      attendanceMap[userId] = userAttendances;
    });

    return {
      days,
      dates: dates.map((d) => d.toISOString().split('T')[0]),
      attendances: attendanceMap,
    };
  }

  private getRoleDisplayName(role: string): string {
    const roleMap: Record<string, string> = {
      ADMIN: 'Administrateur',
      CHEF_PROJET: 'Chef de projet',
      CONDUCTEUR_TRAVAUX: 'Conducteur de travaux',
      COLLABORATEUR: 'Collaborateur',
      CLIENT: 'Client',
    };
    return roleMap[role] || 'Collaborateur';
  }
}
