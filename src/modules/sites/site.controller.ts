import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Headers,
  Param,
  Query,
  Request,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import {
  SiteService,
  SITE_PHOTO_MAX_SIZE,
  type UploadedPhoto,
} from './site.service';
import { CreateSiteDto } from './dto/create-site.dto';
import { UpdateSiteDto } from './dto/update-site.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../../shared/types/roles.enum';
import type { requestWithUser } from '../auth/jwt.strategy';

@ApiTags('Sites')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('sites')
export class SiteController {
  constructor(private readonly service: SiteService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.CHEF_PROJET, UserRole.CONDUCTEUR_TRAVAUX)
  @ApiOperation({ summary: 'Lister tous les chantiers' })
  @ApiQuery({
    name: 'organizationId',
    required: false,
    description: 'Filtrer par organisation',
  })
  @ApiResponse({ status: 200, description: 'Liste des chantiers' })
  findAll(@Request() request: requestWithUser) {
    return this.service.findAll(
      request.user.organizationId,
      request.user.userId,
    );
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.CHEF_PROJET, UserRole.CONDUCTEUR_TRAVAUX)
  @ApiOperation({ summary: 'Récupérer un chantier par ID' })
  @ApiParam({ name: 'id', description: 'UUID du chantier' })
  @ApiResponse({ status: 200, description: 'Chantier trouvé' })
  @ApiResponse({ status: 404, description: 'Introuvable' })
  findOne(@Param('id') id: string, @Request() request: requestWithUser) {
    return this.service.findOne(
      id,
      request.user.organizationId,
      request.user.userId,
    );
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.CHEF_PROJET)
  @ApiOperation({ summary: 'Créer un chantier' })
  @ApiResponse({ status: 201, description: 'Chantier créé' })
  create(@Body() dto: CreateSiteDto, @Request() request: requestWithUser) {
    return this.service.create(
      dto,
      request.user.organizationId,
      request.user.userId,
    );
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.CHEF_PROJET)
  @ApiOperation({ summary: 'Mettre à jour un chantier' })
  @ApiParam({ name: 'id', description: 'UUID du chantier' })
  @ApiResponse({ status: 200, description: 'Chantier mis à jour' })
  @ApiResponse({ status: 404, description: 'Introuvable' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateSiteDto,
    @Request() request: requestWithUser,
  ) {
    return this.service.update(
      id,
      dto,
      request.user.organizationId,
      request.user.userId,
    );
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Supprimer un chantier' })
  @ApiParam({ name: 'id', description: 'UUID du chantier' })
  @ApiResponse({ status: 200, description: 'Chantier supprimé' })
  @ApiResponse({ status: 404, description: 'Introuvable' })
  remove(@Param('id') id: string, @Request() request: requestWithUser) {
    return this.service.remove(
      id,
      request.user.organizationId,
      request.user.userId,
    );
  }

  @Get(':id/photo')
  @Roles(UserRole.ADMIN, UserRole.CHEF_PROJET, UserRole.CONDUCTEUR_TRAVAUX)
  @ApiOperation({ summary: "Récupérer la photo de couverture d'un chantier" })
  @ApiParam({ name: 'id', description: 'UUID du chantier' })
  @ApiResponse({ status: 200, description: 'Image du chantier' })
  @ApiResponse({ status: 404, description: 'Aucune photo' })
  @ApiQuery({
    name: 'v',
    required: false,
    description:
      'Version de la photo (date de mise à jour) : permet au navigateur de la garder en cache',
  })
  async getPhoto(
    @Param('id') id: string,
    @Query('v') version: string | undefined,
    @Headers('if-none-match') ifNoneMatch: string | undefined,
    @Request() request: requestWithUser,
    @Res({ passthrough: true }) response: Response,
  ) {
    const photo = await this.service.getPhoto(id, request.user.organizationId);
    const etag = `"${photo.updatedAt.getTime()}"`;

    // Avec une version dans l'URL, l'image ne change jamais : le navigateur peut la garder
    // indéfiniment. Sans version, il la redemande mais reçoit un 304 si elle n'a pas changé.
    response.setHeader(
      'Cache-Control',
      version ? 'private, max-age=31536000, immutable' : 'private, no-cache',
    );
    response.setHeader('ETag', etag);
    if (ifNoneMatch === etag) {
      response.status(304);
      return;
    }

    return new StreamableFile(photo.data, {
      type: photo.mimeType,
      length: photo.size,
    });
  }

  @Put(':id/photo')
  @Roles(UserRole.ADMIN, UserRole.CHEF_PROJET, UserRole.CONDUCTEUR_TRAVAUX)
  @UseInterceptors(
    FileInterceptor('photo', { limits: { fileSize: SITE_PHOTO_MAX_SIZE } }),
  )
  @ApiOperation({
    summary: "Ajouter ou remplacer la photo de couverture d'un chantier",
  })
  @ApiParam({ name: 'id', description: 'UUID du chantier' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { photo: { type: 'string', format: 'binary' } },
    },
  })
  @ApiResponse({ status: 200, description: 'Photo enregistrée' })
  @ApiResponse({ status: 400, description: 'Fichier invalide' })
  setPhoto(
    @Param('id') id: string,
    @UploadedFile() file: UploadedPhoto | undefined,
    @Request() request: requestWithUser,
  ) {
    return this.service.setPhoto(id, file, request.user.organizationId);
  }

  @Delete(':id/photo')
  @Roles(UserRole.ADMIN, UserRole.CHEF_PROJET, UserRole.CONDUCTEUR_TRAVAUX)
  @ApiOperation({ summary: "Supprimer la photo de couverture d'un chantier" })
  @ApiParam({ name: 'id', description: 'UUID du chantier' })
  @ApiResponse({ status: 200, description: 'Photo supprimée' })
  removePhoto(@Param('id') id: string, @Request() request: requestWithUser) {
    return this.service.removePhoto(id, request.user.organizationId);
  }
}
