import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { PROJECTS_ROUTES } from './projects.routes';
import { JwtAuthGuard } from '@common/guards';
import { CurrentUser, CurrentUserData } from '@common/decorators';

@ApiTags('projects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller(PROJECTS_ROUTES.BASE)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get(PROJECTS_ROUTES.LIST)
  async findAll(@CurrentUser() user: CurrentUserData) {
    return this.projectsService.findAll(user.id);
  }

  @Post(PROJECTS_ROUTES.CREATE)
  async create(@CurrentUser() user: CurrentUserData, @Body() body: any) {
    return this.projectsService.create(user.id, body);
  }

  @Put(PROJECTS_ROUTES.UPDATE)
  async update(@CurrentUser() user: CurrentUserData, @Param('id') id: string, @Body() body: any) {
    return this.projectsService.update(user.id, id, body);
  }

  @Delete(PROJECTS_ROUTES.DELETE)
  async remove(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return this.projectsService.remove(user.id, id);
  }

  @Get(PROJECTS_ROUTES.ASSETS)
  async getAssets(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return this.projectsService.getAssets(user.id, id);
  }

  @Post(PROJECTS_ROUTES.ASSETS)
  async addAsset(@CurrentUser() user: CurrentUserData, @Param('id') id: string, @Body() body: any) {
    return this.projectsService.addAsset(user.id, id, body);
  }
}
