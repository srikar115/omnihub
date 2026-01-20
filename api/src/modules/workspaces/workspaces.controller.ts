import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { WorkspacesService } from './workspaces.service';
import { WORKSPACES_ROUTES, WORKSPACES_ROUTE_DESCRIPTIONS } from './workspaces.routes';
import {
  CreateWorkspaceDto,
  UpdateWorkspaceDto,
  InviteMemberDto,
  UpdateMemberDto,
  AddCreditsDto,
  AllocateCreditsDto,
} from './dto';
import { JwtAuthGuard } from '@common/guards';
import { CurrentUser, CurrentUserData } from '@common/decorators';

@ApiTags('workspaces')
@Controller(WORKSPACES_ROUTES.BASE)
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  // ============ CRUD ============

  @Get(WORKSPACES_ROUTES.LIST)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: WORKSPACES_ROUTE_DESCRIPTIONS.LIST })
  async findAll(@CurrentUser() user: CurrentUserData) {
    return this.workspacesService.findAll(user.id);
  }

  @Post(WORKSPACES_ROUTES.CREATE)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: WORKSPACES_ROUTE_DESCRIPTIONS.CREATE })
  async create(@CurrentUser() user: CurrentUserData, @Body() dto: CreateWorkspaceDto) {
    return this.workspacesService.create(user.id, dto);
  }

  @Get(WORKSPACES_ROUTES.GET_BY_ID)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: WORKSPACES_ROUTE_DESCRIPTIONS.GET_BY_ID })
  @ApiParam({ name: 'id', description: 'Workspace ID' })
  async findOne(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return this.workspacesService.findOne(user.id, id);
  }

  @Patch(WORKSPACES_ROUTES.UPDATE)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: WORKSPACES_ROUTE_DESCRIPTIONS.UPDATE })
  @ApiParam({ name: 'id', description: 'Workspace ID' })
  async update(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body() dto: UpdateWorkspaceDto,
  ) {
    return this.workspacesService.update(user.id, id, dto);
  }

  @Delete(WORKSPACES_ROUTES.DELETE)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: WORKSPACES_ROUTE_DESCRIPTIONS.DELETE })
  @ApiParam({ name: 'id', description: 'Workspace ID' })
  async remove(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return this.workspacesService.remove(user.id, id);
  }

  // ============ MEMBERS ============

  @Get(WORKSPACES_ROUTES.LIST_MEMBERS)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: WORKSPACES_ROUTE_DESCRIPTIONS.LIST_MEMBERS })
  @ApiParam({ name: 'id', description: 'Workspace ID' })
  async listMembers(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return this.workspacesService.listMembers(user.id, id);
  }

  @Patch(WORKSPACES_ROUTES.UPDATE_MEMBER)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: WORKSPACES_ROUTE_DESCRIPTIONS.UPDATE_MEMBER })
  async updateMember(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Param('userId') memberId: string,
    @Body() dto: UpdateMemberDto,
  ) {
    return this.workspacesService.updateMember(user.id, id, memberId, dto);
  }

  @Delete(WORKSPACES_ROUTES.REMOVE_MEMBER)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: WORKSPACES_ROUTE_DESCRIPTIONS.REMOVE_MEMBER })
  async removeMember(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Param('userId') memberId: string,
  ) {
    return this.workspacesService.removeMember(user.id, id, memberId);
  }

  // ============ INVITES ============

  @Post(WORKSPACES_ROUTES.INVITE)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: WORKSPACES_ROUTE_DESCRIPTIONS.INVITE })
  @ApiParam({ name: 'id', description: 'Workspace ID' })
  async invite(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body() dto: InviteMemberDto,
  ) {
    return this.workspacesService.inviteMember(user.id, id, dto);
  }

  @Get(WORKSPACES_ROUTES.GET_INVITE)
  @ApiOperation({ summary: WORKSPACES_ROUTE_DESCRIPTIONS.GET_INVITE })
  @ApiParam({ name: 'token', description: 'Invite token' })
  async getInvite(@Param('token') token: string) {
    return this.workspacesService.getInvite(token);
  }

  @Post(WORKSPACES_ROUTES.JOIN)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: WORKSPACES_ROUTE_DESCRIPTIONS.JOIN })
  @ApiParam({ name: 'token', description: 'Invite token' })
  async join(@CurrentUser() user: CurrentUserData, @Param('token') token: string) {
    return this.workspacesService.joinWorkspace(user.id, token);
  }

  // ============ CREDITS ============

  @Post(WORKSPACES_ROUTES.ADD_CREDITS)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: WORKSPACES_ROUTE_DESCRIPTIONS.ADD_CREDITS })
  @ApiParam({ name: 'id', description: 'Workspace ID' })
  async addCredits(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body() dto: AddCreditsDto,
  ) {
    return this.workspacesService.addCredits(user.id, id, dto);
  }

  @Get(WORKSPACES_ROUTES.CREDITS_USAGE)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: WORKSPACES_ROUTE_DESCRIPTIONS.CREDITS_USAGE })
  @ApiParam({ name: 'id', description: 'Workspace ID' })
  async getCreditsUsage(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return this.workspacesService.getCreditsUsage(user.id, id);
  }

  // ============ GALLERY ============

  @Get(WORKSPACES_ROUTES.GALLERY)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: WORKSPACES_ROUTE_DESCRIPTIONS.GALLERY })
  @ApiParam({ name: 'id', description: 'Workspace ID' })
  @ApiQuery({ name: 'type', required: false, enum: ['image', 'video'] })
  async getGallery(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Query('type') type?: string,
  ) {
    return this.workspacesService.getGallery(user.id, id, type);
  }
}
