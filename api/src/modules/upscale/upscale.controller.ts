import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UpscaleService } from './upscale.service';
import { UPSCALE_ROUTES } from './upscale.routes';
import { JwtAuthGuard } from '@common/guards';
import { CurrentUser, CurrentUserData } from '@common/decorators';

@ApiTags('upscale')
@Controller(UPSCALE_ROUTES.BASE)
export class UpscaleController {
  constructor(private readonly upscaleService: UpscaleService) {}

  @Get(UPSCALE_ROUTES.MODELS)
  async getModels(@Query('type') type?: string) {
    return this.upscaleService.getModels(type);
  }

  @Post(UPSCALE_ROUTES.CALCULATE)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async calculateCost(@CurrentUser() user: CurrentUserData, @Body() body: any) {
    return this.upscaleService.calculateCost(user.id, body);
  }

  @Post(UPSCALE_ROUTES.CREATE)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async upscale(@CurrentUser() user: CurrentUserData, @Body() body: any) {
    return this.upscaleService.upscale(user.id, body);
  }
}
