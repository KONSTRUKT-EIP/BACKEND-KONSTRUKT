import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../lib/prisma/prisma.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { AddMemberDto } from './dto/add-member.dto';

@Injectable()
export class TeamService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(siteId?: string) {
    return this.prisma.team.findMany({
      where: siteId ? { siteId } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        site: { select: { id: true, name: true } },
        leader: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { members: true } },
      },
    });
  }

  async findOne(id: string) {
    const team = await this.prisma.team.findUnique({
      where: { id },
      include: {
        site: { select: { id: true, name: true } },
        leader: { select: { id: true, firstName: true, lastName: true } },
        members: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
          },
          orderBy: { joinedAt: 'asc' },
        },
      },
    });
    if (!team) throw new NotFoundException(`Équipe ${id} introuvable`);
    return team;
  }

  async create(dto: CreateTeamDto) {
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

  async update(id: string, dto: UpdateTeamDto) {
    await this.findOne(id);
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

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.team.delete({ where: { id } });
    return { message: 'Équipe supprimée' };
  }

  // ─── Members ────────────────────────────────────────────────────────────────

  async getMembers(teamId: string) {
    await this.findOne(teamId);
    return this.prisma.teamMember.findMany({
      where: { teamId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
      },
      orderBy: { joinedAt: 'asc' },
    });
  }

  async addMember(teamId: string, dto: AddMemberDto) {
    await this.findOne(teamId);

    const existing = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: dto.userId } },
    });

    if (existing) {
      throw new ConflictException('Cet utilisateur est déjà membre de cette équipe');
    }

    return this.prisma.teamMember.create({
      data: {
        teamId,
        userId: dto.userId,
        role: dto.role ?? 'WORKER',
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
      },
    });
  }

  async removeMember(teamId: string, userId: string) {
    await this.findOne(teamId);

    const member = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
    });

    if (!member) throw new NotFoundException('Ce membre est introuvable dans cette équipe');

    await this.prisma.teamMember.delete({
      where: { teamId_userId: { teamId, userId } },
    });

    return { message: 'Membre retiré de l\'équipe' };
  }
}
