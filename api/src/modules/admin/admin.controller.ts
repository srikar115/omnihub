import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { ADMIN_ROUTES } from './admin.routes';
import { AdminAuthGuard } from '@common/guards';

@ApiTags('admin')
@Controller(ADMIN_ROUTES.BASE)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post(ADMIN_ROUTES.LOGIN)
  @ApiOperation({ summary: 'Admin login' })
  async login(@Body() body: { username: string; password: string }) {
    return this.adminService.login(body.username, body.password);
  }

  @Get(ADMIN_ROUTES.STATS)
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get dashboard stats' })
  async getStats() {
    return this.adminService.getStats();
  }

  @Get(ADMIN_ROUTES.MODELS)
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all models' })
  async getModels() {
    return this.adminService.getModels();
  }

  @Put(ADMIN_ROUTES.MODEL_BY_ID)
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update model' })
  async updateModel(@Param('id') id: string, @Body() body: any) {
    return this.adminService.updateModel(id, body);
  }

  @Get(ADMIN_ROUTES.USERS)
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all users' })
  async getUsers() {
    return this.adminService.getUsers();
  }

  @Put(ADMIN_ROUTES.USER_CREDITS)
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update user credits' })
  async updateUserCredits(@Param('id') id: string, @Body() body: { credits: number }) {
    return this.adminService.updateUserCredits(id, body.credits);
  }

  @Get(ADMIN_ROUTES.SETTINGS)
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get settings' })
  async getSettings() {
    return this.adminService.getSettings();
  }

  @Put(ADMIN_ROUTES.SETTINGS)
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update settings' })
  async updateSettings(@Body() body: Record<string, any>) {
    return this.adminService.updateSettings(body);
  }

  @Get(ADMIN_ROUTES.AUDIT_LOGS)
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get audit logs' })
  async getAuditLogs(@Query('limit') limit?: number) {
    return this.adminService.getAuditLogs(limit);
  }

  @Get(ADMIN_ROUTES.ERROR_LOGS)
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get error logs' })
  async getErrorLogs(@Query('limit') limit?: number) {
    return this.adminService.getErrorLogs(limit);
  }
}
