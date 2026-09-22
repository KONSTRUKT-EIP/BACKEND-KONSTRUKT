import {
  AlertSeverity,
  AlertType,
  AttendanceStatus,
  DeliveryStatus,
  DocumentType,
  Prisma,
  PrismaClient,
  ReportType,
  ResourceType,
  SiteStatus,
  TaskStatus,
  TaskType,
  UserRole,
} from '@prisma/client';
import bcrypt from 'bcrypt';
import { createHash } from 'node:crypto';

const prisma = new PrismaClient();

const DEMO_PASSWORD = 'Demo1234!';
const BASE_DATE = new Date('2026-01-05T08:00:00.000Z');

type SeedUser = {
  key: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
};

type SeedSite = {
  name: string;
  address: string;
  city: string;
  postalCode: string;
  status: SiteStatus;
  budget: string;
  startOffsetDays: number;
  endOffsetDays: number;
};

type SeedTeamMember = {
  userId: string;
  role: string;
};

type SiteContext = {
  site: { id: string; name: string; city: string };
  zones: Array<{ id: string; name: string }>;
  resources: Array<{ id: string; name: string }>;
  teamMembers: Array<{ userId: string; role: string }>;
};

const userSeeds: SeedUser[] = [
  {
    key: 'admin',
    email: 'admin@konstrukt.demo',
    firstName: 'Alice',
    lastName: 'Martin',
    role: UserRole.ADMIN,
  },
  {
    key: 'chef-1',
    email: 'marie.dupont@konstrukt.demo',
    firstName: 'Marie',
    lastName: 'Dupont',
    role: UserRole.CHEF_PROJET,
  },
  {
    key: 'chef-2',
    email: 'thomas.lefevre@konstrukt.demo',
    firstName: 'Thomas',
    lastName: 'Lefevre',
    role: UserRole.CHEF_PROJET,
  },
  {
    key: 'conducteur-1',
    email: 'sophie.martin@konstrukt.demo',
    firstName: 'Sophie',
    lastName: 'Martin',
    role: UserRole.CONDUCTEUR_TRAVAUX,
  },
  {
    key: 'conducteur-2',
    email: 'julien.petit@konstrukt.demo',
    firstName: 'Julien',
    lastName: 'Petit',
    role: UserRole.CONDUCTEUR_TRAVAUX,
  },
  {
    key: 'collab-1',
    email: 'lea.bernard@konstrukt.demo',
    firstName: 'Lea',
    lastName: 'Bernard',
    role: UserRole.COLLABORATEUR,
  },
  {
    key: 'collab-2',
    email: 'nicolas.robert@konstrukt.demo',
    firstName: 'Nicolas',
    lastName: 'Robert',
    role: UserRole.COLLABORATEUR,
  },
  {
    key: 'collab-3',
    email: 'emma.durand@konstrukt.demo',
    firstName: 'Emma',
    lastName: 'Durand',
    role: UserRole.COLLABORATEUR,
  },
  {
    key: 'client-1',
    email: 'client@acme.demo',
    firstName: 'Paul',
    lastName: 'Roche',
    role: UserRole.CLIENT,
  },
];

const siteSeeds: SeedSite[] = [
  {
    name: 'Residence Les Amandiers',
    address: '12 rue des Chantiers',
    city: 'Marseille',
    postalCode: '13008',
    status: SiteStatus.PLANIFIE,
    budget: '1250000.00',
    startOffsetDays: 12,
    endOffsetDays: 180,
  },
  {
    name: 'Campus Horizon',
    address: '45 avenue des Sciences',
    city: 'Lyon',
    postalCode: '69003',
    status: SiteStatus.EN_COURS,
    budget: '2100000.00',
    startOffsetDays: -90,
    endOffsetDays: 75,
  },
  {
    name: 'Centre Medical Azur',
    address: '8 boulevard de la Mer',
    city: 'Nice',
    postalCode: '06000',
    status: SiteStatus.SUSPENDU,
    budget: '830000.00',
    startOffsetDays: -45,
    endOffsetDays: 120,
  },
  {
    name: 'Hall Logistique Nord',
    address: '90 route du Port',
    city: 'Lille',
    postalCode: '59000',
    status: SiteStatus.EN_COURS,
    budget: '1750000.00',
    startOffsetDays: -150,
    endOffsetDays: 40,
  },
  {
    name: 'Immeuble Quai Central',
    address: '3 quai des Architectes',
    city: 'Bordeaux',
    postalCode: '33000',
    status: SiteStatus.TERMINE,
    budget: '980000.00',
    startOffsetDays: -240,
    endOffsetDays: -20,
  },
  {
    name: 'Aire Services Sud',
    address: '77 chemin des Pins',
    city: 'Montpellier',
    postalCode: '34000',
    status: SiteStatus.ANNULE,
    budget: '640000.00',
    startOffsetDays: -60,
    endOffsetDays: 30,
  },
];

const zoneTemplates = [
  { name: 'Sous-sol', level: 'SS', description: 'Travaux de gros oeuvre et reseaux techniques' },
  { name: 'RDC', level: 'RDC', description: 'Zone principale de circulation et reception' },
  { name: 'Etage 1', level: 'R+1', description: 'Plateau bureaux et logements principaux' },
  { name: 'Etage 2', level: 'R+2', description: 'Lots secondaires et finitions' },
];

const resourceTemplates = [
  {
    name: 'Beton pret a lemploi',
    type: ResourceType.MATERIAU,
    unit: 'm3',
    quantity: '120.000',
    unitPrice: '145.00',
    supplier: 'Beton Express',
  },
  {
    name: 'Acier de renfort',
    type: ResourceType.MATERIAU,
    unit: 'kg',
    quantity: '9500.000',
    unitPrice: '1.20',
    supplier: 'MetalPro',
  },
  {
    name: 'Echafaudage',
    type: ResourceType.MATERIEL,
    unit: 'set',
    quantity: '8.000',
    unitPrice: '1200.00',
    supplier: 'Locamat',
  },
  {
    name: 'Casques de securite',
    type: ResourceType.EQUIPEMENT,
    unit: 'piece',
    quantity: '80.000',
    unitPrice: '22.50',
    supplier: 'SafeBuild',
  },
];

const documentTemplates = [
  { type: DocumentType.PLAN, label: 'Plan execution', mimeType: 'application/pdf', fileSize: 2100450 },
  { type: DocumentType.CCTP, label: 'CCTP detaille', mimeType: 'application/pdf', fileSize: 1877004 },
  { type: DocumentType.CONTRAT, label: 'Contrat entreprise', mimeType: 'application/pdf', fileSize: 1540022 },
  { type: DocumentType.FACTURE, label: 'Facture lot principal', mimeType: 'application/pdf', fileSize: 980450 },
  { type: DocumentType.RAPPORT, label: 'Rapport mensuel', mimeType: 'application/pdf', fileSize: 1356000 },
  { type: DocumentType.SECURITE, label: 'Registre securite', mimeType: 'application/pdf', fileSize: 770230 },
  { type: DocumentType.AUTRE, label: 'Note de service', mimeType: 'application/pdf', fileSize: 540120 },
];

const reportTemplates = [
  { type: ReportType.DAILY, periodLabel: '2026-01-06' },
  { type: ReportType.WEEKLY, periodLabel: '2026-W02' },
  { type: ReportType.MONTHLY, periodLabel: '2026-02' },
  { type: ReportType.OTHER, periodLabel: 'Phase lancement' },
];

const taskTypes = [
  TaskType.GROS_OEUVRE,
  TaskType.SECOND_OEUVRE,
  TaskType.VRD,
  TaskType.ELECTRICITE,
  TaskType.PLOMBERIE,
  TaskType.MENUISERIE,
  TaskType.PEINTURE,
];

const taskStatuses = [
  TaskStatus.EN_ATTENTE,
  TaskStatus.EN_COURS,
  TaskStatus.EN_PAUSE,
  TaskStatus.TERMINEE,
  TaskStatus.ANNULEE,
];

const alertTypes = [AlertType.RETARD, AlertType.SECURITE, AlertType.QUALITE, AlertType.BUDGET, AlertType.AUTRE];
const alertSeverities = [AlertSeverity.LOW, AlertSeverity.MEDIUM, AlertSeverity.HIGH, AlertSeverity.CRITICAL];
const attendanceStatuses = [AttendanceStatus.PRESENT, AttendanceStatus.ABSENT, AttendanceStatus.RETARD, AttendanceStatus.CONGE];

const teamMemberRoles = ['LEADER', 'WORKER', 'TECHNICIAN', 'SPECIALIST'];
const workerCategories = ['Main d oeuvre', 'Second oeuvre', 'Sous traitance', 'Logistique'];
const tradeLabels = ['Gros oeuvre', 'Electricite', 'Plomberie', 'Menuiserie', 'Peinture', 'VRD'];

const dec = (value: string) => new Prisma.Decimal(value);

function addDaysUTC(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function addHoursUTC(date: Date, hours: number) {
  const next = new Date(date);
  next.setUTCHours(next.getUTCHours() + hours);
  return next;
}

function cycle<T>(items: readonly T[], index: number) {
  return items[index % items.length];
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

async function resetDatabase() {
  await prisma.attendance.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.team.deleteMany();
  await prisma.genericTableRow.deleteMany();
  await prisma.genericTable.deleteMany();
  await prisma.resourceUsage.deleteMany();
  await prisma.taskAlert.deleteMany();
  await prisma.taskProgress.deleteMany();
  await prisma.taskAssignment.deleteMany();
  await prisma.workforceEntry.deleteMany();
  await prisma.workforceDay.deleteMany();
  await prisma.report.deleteMany();
  await prisma.document.deleteMany();
  await prisma.delivery.deleteMany();
  await prisma.task.deleteMany();
  await prisma.resource.deleteMany();
  await prisma.siteZone.deleteMany();
  await prisma.site.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();
}

async function seedUsers(organizationId: string) {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const createdUsers = new Map<string, { id: string; email: string; firstName: string; lastName: string; role: UserRole }>();

  for (const userSeed of userSeeds) {
    const createdUser = await prisma.user.create({
      data: {
        organizationId,
        email: userSeed.email,
        password: passwordHash,
        role: userSeed.role,
        firstName: userSeed.firstName,
        lastName: userSeed.lastName,
      },
    });

    createdUsers.set(userSeed.key, createdUser);
  }

  return createdUsers;
}

async function seedRefreshTokens(users: Map<string, { id: string; email: string }>) {
  const tokenKeys = ['admin', 'chef-1', 'conducteur-1', 'collab-1', 'client-1'];

  for (let index = 0; index < tokenKeys.length; index += 1) {
    const user = users.get(tokenKeys[index]);
    if (!user) {
      continue;
    }

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: sha256(`refresh-token-${user.email}`),
        expiresAt: addDaysUTC(BASE_DATE, 45 + index * 5),
      },
    });
  }
}

async function seedSite(siteSeed: SeedSite, siteIndex: number, users: Map<string, { id: string; email: string; role: UserRole }>) {
  const site = await prisma.site.create({
    data: {
      organizationId: (await prisma.organization.findFirstOrThrow()).id,
      name: siteSeed.name,
      address: siteSeed.address,
      city: siteSeed.city,
      postalCode: siteSeed.postalCode,
      startDate: addDaysUTC(BASE_DATE, siteSeed.startOffsetDays),
      endDate: addDaysUTC(BASE_DATE, siteSeed.endOffsetDays),
      status: siteSeed.status,
      budget: dec(siteSeed.budget),
    },
  });

  const zones: Array<{ id: string; name: string }> = [];
  for (let zoneIndex = 0; zoneIndex < zoneTemplates.length; zoneIndex += 1) {
    const zoneTemplate = zoneTemplates[zoneIndex];
    const zone = await prisma.siteZone.create({
      data: {
        siteId: site.id,
        name: `${site.name} - ${zoneTemplate.name}`,
        level: zoneTemplate.level,
        description: zoneTemplate.description,
      },
    });

    zones.push(zone);
  }

  const resources: Array<{ id: string; name: string }> = [];
  for (let resourceIndex = 0; resourceIndex < resourceTemplates.length; resourceIndex += 1) {
    const resourceTemplate = resourceTemplates[resourceIndex];
    const resource = await prisma.resource.create({
      data: {
        siteId: site.id,
        name: `${site.name} - ${resourceTemplate.name}`,
        type: resourceTemplate.type,
        unit: resourceTemplate.unit,
        quantity: dec(resourceTemplate.quantity),
        unitPrice: dec(resourceTemplate.unitPrice),
        supplier: resourceTemplate.supplier,
      },
    });

    resources.push(resource);
  }

  for (let resourceIndex = 0; resourceIndex < resources.length; resourceIndex += 1) {
    const resource = resources[resourceIndex];
    const deliveryStatus = cycle(
      [
        DeliveryStatus.PLANIFIEE,
        DeliveryStatus.EN_TRANSIT,
        DeliveryStatus.LIVREE,
        DeliveryStatus.PARTIELLE,
        DeliveryStatus.ANNULEE,
      ],
      siteIndex + resourceIndex,
    );
    const expectedDate = addDaysUTC(BASE_DATE, siteIndex * 7 + resourceIndex * 2);
    const receivedDate =
      deliveryStatus === DeliveryStatus.LIVREE || deliveryStatus === DeliveryStatus.PARTIELLE
        ? addDaysUTC(expectedDate, 1)
        : null;

    await prisma.delivery.create({
      data: {
        siteId: site.id,
        resourceId: resource.id,
        expectedDate,
        receivedDate,
        quantity: dec((35 + siteIndex * 4 + resourceIndex * 2).toFixed(3)),
        status: deliveryStatus,
        supplier: `${resource.name} Supplier`,
      },
    });
  }

  for (let documentIndex = 0; documentIndex < documentTemplates.length; documentIndex += 1) {
    const documentTemplate = documentTemplates[(siteIndex + documentIndex) % documentTemplates.length];
    const documentDate = addDaysUTC(BASE_DATE, siteIndex * 11 + documentIndex);

    await prisma.document.create({
      data: {
        siteId: site.id,
        uploadedById: cycle(
          [
            users.get('admin'),
            users.get('chef-1'),
            users.get('chef-2'),
            users.get('conducteur-1'),
            users.get('conducteur-2'),
          ],
          siteIndex + documentIndex,
        )!.id,
        type: documentTemplate.type,
        name: `${site.name} ${documentTemplate.label}`,
        path: `documents/${slugify(site.name)}/${slugify(documentTemplate.label)}-${documentDate.toISOString().slice(0, 10)}.pdf`,
        fileSize: documentTemplate.fileSize + siteIndex * 1200 + documentIndex * 320,
        mimeType: documentTemplate.mimeType,
      },
    });
  }

  for (let reportIndex = 0; reportIndex < 2; reportIndex += 1) {
    const reportTemplate = cycle(reportTemplates, siteIndex + reportIndex);
    const reporter = cycle([users.get('admin'), users.get('chef-1'), users.get('chef-2'), users.get('conducteur-1')], siteIndex + reportIndex)!
      ;

    await prisma.report.create({
      data: {
        siteId: site.id,
        generatedById: reporter.id,
        type: reportTemplate.type,
        period: reportTemplate.periodLabel,
        path: `reports/${slugify(site.name)}/${slugify(reportTemplate.periodLabel)}.pdf`,
        generatedAt: addDaysUTC(BASE_DATE, siteIndex * 9 + reportIndex * 7),
      },
    });
  }

  const table = await prisma.genericTable.create({
    data: {
      siteId: site.id,
      name: `${site.name} - Suivi chantier`,
      columns: [
        { key: 'date', label: 'Date', type: 'date' },
        { key: 'planned', label: 'Prevu', type: 'number' },
        { key: 'actual', label: 'Reel', type: 'number' },
        { key: 'note', label: 'Note', type: 'text' },
      ],
    },
  });

  for (let rowIndex = 0; rowIndex < 3; rowIndex += 1) {
    await prisma.genericTableRow.create({
      data: {
        tableId: table.id,
        data: {
          date: addDaysUTC(BASE_DATE, siteIndex * 3 + rowIndex).toISOString().slice(0, 10),
          planned: 100 + siteIndex * 15 + rowIndex * 10,
          actual: 94 + siteIndex * 13 + rowIndex * 11,
          note: `Point chantier ${rowIndex + 1} pour ${site.city}`,
        },
      },
    });
  }

  const leaderCandidates = [users.get('chef-1'), users.get('conducteur-1'), users.get('chef-2'), users.get('conducteur-2'), users.get('admin')] as Array<
    { id: string; email: string; role: UserRole } | undefined
  >;
  const leader = cycle(leaderCandidates, siteIndex)!;

  const teamMemberCandidates = [
    leader,
    cycle([users.get('collab-1'), users.get('collab-2'), users.get('collab-3'), users.get('conducteur-1')], siteIndex)!,
    cycle([users.get('collab-2'), users.get('collab-3'), users.get('collab-1'), users.get('conducteur-2')], siteIndex + 1)!,
    cycle([users.get('collab-3'), users.get('collab-1'), users.get('collab-2'), users.get('chef-1')], siteIndex + 2)!,
  ];

  const teamMemberUsers: Array<{ id: string; email: string; role: UserRole }> = [];
  const seenTeamMemberIds = new Set<string>();

  for (const candidate of teamMemberCandidates) {
    if (!seenTeamMemberIds.has(candidate.id)) {
      seenTeamMemberIds.add(candidate.id);
      teamMemberUsers.push(candidate);
    }
  }

  const fallbackCandidates = [
    users.get('admin'),
    users.get('chef-1'),
    users.get('chef-2'),
    users.get('conducteur-1'),
    users.get('conducteur-2'),
    users.get('collab-1'),
    users.get('collab-2'),
    users.get('collab-3'),
  ].filter((user): user is { id: string; email: string; role: UserRole } => Boolean(user));

  for (const candidate of fallbackCandidates) {
    if (teamMemberUsers.length >= 4) {
      break;
    }

    if (!seenTeamMemberIds.has(candidate.id)) {
      seenTeamMemberIds.add(candidate.id);
      teamMemberUsers.push(candidate);
    }
  }

  const team = await prisma.team.create({
    data: {
      siteId: site.id,
      name: `${site.name} - Team principale`,
      leaderId: leader.id,
    },
  });

  const teamMembers: SeedTeamMember[] = teamMemberUsers.map((user, memberIndex) => ({
    userId: user.id,
    role: teamMemberRoles[memberIndex],
  }));

  for (const member of teamMembers) {
    await prisma.teamMember.create({
      data: {
        teamId: team.id,
        userId: member.userId,
        role: member.role,
      },
    });
  }

  for (let dayIndex = 0; dayIndex < 3; dayIndex += 1) {
    const workforceDay = await prisma.workforceDay.create({
      data: {
        siteId: site.id,
        date: addDaysUTC(BASE_DATE, siteIndex * 5 + dayIndex),
        totalManHours: 96 + siteIndex * 6 + dayIndex * 4,
        totalActualHours: 89 + siteIndex * 5 + dayIndex * 3,
      },
    });

    for (let memberIndex = 0; memberIndex < teamMembers.length; memberIndex += 1) {
      const member = teamMembers[memberIndex];
      const plannedHours = 8 + (memberIndex % 2);
      const actualHours = plannedHours - (memberIndex % 3 === 0 ? 0 : 1);

      await prisma.workforceEntry.create({
        data: {
          workforceDayId: workforceDay.id,
          workerId: member.userId,
          category: workerCategories[(siteIndex + dayIndex + memberIndex) % workerCategories.length],
          trade: tradeLabels[(siteIndex + memberIndex) % tradeLabels.length],
          plannedHours,
          actualHours,
          subcontractor: memberIndex % 2 === 0 ? 'Konstrukt Interne' : 'Sous traitance Nord',
          notes: `Presence terrain ${dayIndex + 1} pour ${site.name}`,
        },
      });
    }
  }

  for (let attendanceDayIndex = 0; attendanceDayIndex < 3; attendanceDayIndex += 1) {
    const attendanceDate = addDaysUTC(BASE_DATE, siteIndex * 6 + attendanceDayIndex);

    for (let memberIndex = 0; memberIndex < teamMembers.length; memberIndex += 1) {
      const member = teamMembers[memberIndex];
      const status = cycle(attendanceStatuses, siteIndex + attendanceDayIndex + memberIndex);
      const isPresent = status === AttendanceStatus.PRESENT || status === AttendanceStatus.RETARD;

      await prisma.attendance.create({
        data: {
          teamId: team.id,
          userId: member.userId,
          date: attendanceDate,
          status,
          checkIn: isPresent ? addHoursUTC(attendanceDate, 1 + memberIndex) : null,
          checkOut: isPresent ? addHoursUTC(attendanceDate, 9 + memberIndex) : null,
          minutesLate: status === AttendanceStatus.RETARD ? 12 + memberIndex * 3 : status === AttendanceStatus.PRESENT ? 0 : null,
          notes:
            status === AttendanceStatus.ABSENT
              ? 'Absence justifiee'
              : status === AttendanceStatus.CONGE
                ? 'Conge pose'
                : `Pointage chantier ${site.city}`,
        },
      });
    }
  }

  const taskAssignees = teamMembers.map((member) => member.userId);

  for (let zoneIndex = 0; zoneIndex < zones.length; zoneIndex += 1) {
    const zone = zones[zoneIndex];

    for (let taskIndex = 0; taskIndex < 2; taskIndex += 1) {
      const taskNumber = siteIndex * 10 + zoneIndex * 2 + taskIndex;
      const taskType = cycle(taskTypes, taskNumber);
      const taskStatus = cycle(taskStatuses, taskNumber);
      const plannedEnd = addDaysUTC(BASE_DATE, siteIndex * 8 + zoneIndex * 3 + taskIndex * 2 + 20);
      const taskTime = `${2 + ((taskNumber + 1) % 5)}h${taskNumber % 2 === 0 ? '00' : '30'}`;
      const realStart =
        taskStatus === TaskStatus.EN_ATTENTE
          ? null
          : addDaysUTC(plannedEnd, taskStatus === TaskStatus.TERMINEE ? -10 : -6);
      const realEnd =
        taskStatus === TaskStatus.TERMINEE
          ? addDaysUTC(plannedEnd, -1)
          : taskStatus === TaskStatus.ANNULEE
            ? addDaysUTC(plannedEnd, -2)
            : null;

      const task = await prisma.task.create({
        data: {
          siteZoneId: zone.id,
          name: `${site.name} - ${zone.name} - Tache ${taskIndex + 1}`,
          description: `Tache demo ${taskType} sur ${zone.name} pour le site ${site.city}`,
          type: taskType,
          priority: 1 + (taskNumber % 5),
          plannedEnd,
          time: taskTime,
          realStart,
          realEnd,
          status: taskStatus,
        },
      });

      const primaryAssignee = taskAssignees[(taskNumber + 1) % taskAssignees.length];
      const secondaryAssignee = taskAssignees[(taskNumber + 3) % taskAssignees.length];

      await prisma.taskAssignment.create({
        data: {
          taskId: task.id,
          userId: primaryAssignee,
        },
      });

      await prisma.taskAssignment.create({
        data: {
          taskId: task.id,
          userId: secondaryAssignee,
        },
      });

      const progressSteps =
        taskStatus === TaskStatus.TERMINEE
          ? [20, 50, 100]
          : taskStatus === TaskStatus.EN_COURS
            ? [25, 60]
            : taskStatus === TaskStatus.EN_PAUSE
              ? [35]
              : taskStatus === TaskStatus.ANNULEE
                ? [10]
                : [];

      for (let progressIndex = 0; progressIndex < progressSteps.length; progressIndex += 1) {
        await prisma.taskProgress.create({
          data: {
            taskId: task.id,
            reportedById: cycle([users.get('chef-1'), users.get('chef-2'), users.get('conducteur-1'), users.get('conducteur-2')], taskNumber + progressIndex)!.id,
            date: addDaysUTC(BASE_DATE, siteIndex * 7 + zoneIndex * 2 + taskIndex + progressIndex),
            progressPercent: progressSteps[progressIndex],
            notes: `Avancement ${progressSteps[progressIndex]}% sur ${task.name}`,
          },
        });
      }

      await prisma.taskAlert.create({
        data: {
          taskId: task.id,
          type: cycle(alertTypes, taskNumber),
          severity: cycle(alertSeverities, taskNumber),
          message:
            taskStatus === TaskStatus.ANNULEE
              ? `Tache annulee sur ${zone.name}`
              : taskStatus === TaskStatus.EN_PAUSE
                ? `Tache en pause sur ${zone.name}`
                : `Suivi regulier requis sur ${zone.name}`,
          isRead: taskStatus === TaskStatus.TERMINEE,
        },
      });

      await prisma.resourceUsage.create({
        data: {
          resourceId: resources[(zoneIndex + taskIndex) % resources.length].id,
          taskId: task.id,
          date: addDaysUTC(BASE_DATE, siteIndex * 8 + zoneIndex * 2 + taskIndex),
          quantity: dec((3 + siteIndex + zoneIndex + taskIndex / 2).toFixed(3)),
          notes: `Consommation liee a ${task.name}`,
          createdById: cycle([users.get('admin'), users.get('chef-1'), users.get('conducteur-1')], siteIndex + zoneIndex + taskIndex)!.id,
        },
      });
    }
  }

  return {
    site,
    zones,
    resources,
    teamMembers,
  };
}

async function seedSites(users: Map<string, { id: string; email: string; role: UserRole }>) {
  const contexts: SiteContext[] = [];

  for (let siteIndex = 0; siteIndex < siteSeeds.length; siteIndex += 1) {
    const context = await seedSite(siteSeeds[siteIndex], siteIndex, users);
    contexts.push(context);
  }

  return contexts;
}

async function main() {
  console.log('Reset demo database...');
  await resetDatabase();

  console.log('Create base organization...');
  const organization = await prisma.organization.create({
    data: {
      name: 'Konstrukt Demo',
      plan: 'Demo Base',
      isActive: true,
    },
  });

  console.log('Create users...');
  const users = await seedUsers(organization.id);

  console.log('Create refresh tokens...');
  await seedRefreshTokens(users);

  console.log('Create sites and linked demo data...');
  const siteContexts = await seedSites(users);

  console.log('Demo database seeded successfully.');
  console.log({
    organizationId: organization.id,
    users: users.size,
    sites: siteContexts.length,
    demoPassword: DEMO_PASSWORD,
  });
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });