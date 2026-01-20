import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CommunityService } from './community.service';
import { COMMUNITY_ROUTES } from './community.routes';
import { JwtAuthGuard } from '@common/guards';
import { CurrentUser, CurrentUserData } from '@common/decorators';

@ApiTags('community')
@Controller(COMMUNITY_ROUTES.BASE)
export class CommunityController {
  constructor(private readonly communityService: CommunityService) {}

  @Get(COMMUNITY_ROUTES.LIST)
  async findAll(@Query() query: { limit?: number; sort?: string; category?: string }) {
    return this.communityService.findAll(query);
  }

  @Get(COMMUNITY_ROUTES.CATEGORIES)
  async getCategories() {
    return this.communityService.getCategories();
  }

  @Post(COMMUNITY_ROUTES.PUBLISH)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async publish(@CurrentUser() user: CurrentUserData, @Body() body: any) {
    return this.communityService.publish(user.id, body);
  }

  @Get(COMMUNITY_ROUTES.USER_POSTS)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async getUserPosts(@CurrentUser() user: CurrentUserData) {
    return this.communityService.getUserPosts(user.id);
  }

  @Get(COMMUNITY_ROUTES.POST_BY_ID)
  async findOne(@Param('id') id: string) {
    return this.communityService.findOne(id);
  }

  @Post(COMMUNITY_ROUTES.LIKE)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async toggleLike(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return this.communityService.toggleLike(user.id, id);
  }

  @Delete(COMMUNITY_ROUTES.POST_BY_ID)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async remove(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return this.communityService.remove(user.id, id);
  }
}
