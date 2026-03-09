import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../lib/prisma/prisma.service';
import {
  CreateAttendanceDto,
  AttendanceStatus,
} from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters: {
    teamId?: string;
    userId?: string;
    date?: string;
    status?: AttendanceStatus;
  }) {
    const where: Record<string, unknown> = {};
    if (filters.teamId) where.teamId = filters.teamId;
    if (filters.userId) where.userId = filters.userId;
    if (filters.status) where.status = filters.status;
    if (filters.date) {
      const day = new Date(filters.date);
      if (isNaN(day.getTime())) throw new BadRequestException('Date invalide');
      where.date = day;
    }

    return this.prisma.attendance.findMany({
      where,
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      include: {
        team: { select: { id: true, name: true } },
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async findOne(id: string) {
    const record = await this.prisma.attendance.findUnique({
      where: { id },
      include: {
        team: { select: { id: true, name: true } },
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (!record) throw new NotFoundException(`Pointage ${id} introuvable`);
    return record;
  }

  async create(dto: CreateAttendanceDto) {
    const day = new Date(dto.date);
    if (isNaN(day.getTime())) throw new BadRequestException('Date invalide');

    const existing = await this.prisma.attendance.findUnique({
      where: {
        teamId_userId_date: {
          teamId: dto.teamId,
          userId: dto.userId,
          date: day,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        'Un pointage existe déjà pour cet utilisateur dans cette équipe à cette date',
      );
    }

    return this.prisma.attendance.create({
      data: {
        teamId: dto.teamId,
        userId: dto.userId,
        date: day,
        status: dto.status,
        checkIn: dto.checkIn ? new Date(dto.checkIn) : null,
        checkOut: dto.checkOut ? new Date(dto.checkOut) : null,
        minutesLate: dto.minutesLate ?? null,
        notes: dto.notes ?? null,
      },
      include: {
        team: { select: { id: true, name: true } },
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async update(id: string, dto: UpdateAttendanceDto) {
    await this.findOne(id);
    return this.prisma.attendance.update({
      where: { id },
      data: {
        status: dto.status,
        checkIn: dto.checkIn !== undefined ? (dto.checkIn ? new Date(dto.checkIn) : null) : undefined,
        checkOut: dto.checkOut !== undefined ? (dto.checkOut ? new Date(dto.checkOut) : null) : undefined,
        minutesLate: dto.minutesLate,
        notes: dto.notes,
      },
      include: {
        team: { select: { id: true, name: true } },
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.attendance.delete({ where: { id } });
    return { message: 'Pointage supprimé' };
  }

  async getDailySummary(teamId: string, date: string) {
    const day = new Date(date);
    if (isNaN(day.getTime())) throw new BadRequestException('Date invalide');

    const records = await this.prisma.attendance.findMany({
      where: { teamId, date: day },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    const summary = {
      teamId,
      date,
      total: records.length,
      presents: records.filter((r) => r.status === AttendanceStatus.PRESENT).length,
      absents: records.filter((r) => r.status === AttendanceStatus.ABSENT).length,
      retards: records.filter((r) => r.status === AttendanceStatus.RETARD).length,
      conges: records.filter((r) => r.status === AttendanceStatus.CONGE).length,
      records,
    };

    return summary;
  }
}
