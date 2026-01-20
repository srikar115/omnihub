import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { GenerationsService } from './generations.service';
import { GENERATIONS_ROUTES, GENERATIONS_ROUTE_DESCRIPTIONS } from './generations.routes';
import {
  CreateGenerationDto,
  ListGenerationsDto,
  BulkDeleteDto,
  ShareGenerationDto,
} from './dto';
import { JwtAuthGuard } from '@common/guards';
import { CurrentUser, CurrentUserData } from '@common/decorators';

@ApiTags('generations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller(GENERATIONS_ROUTES.BASE)
export class GenerationsController {
  constructor(private readonly generationsService: GenerationsService) {}

  @Get(GENERATIONS_ROUTES.LIST)
  @ApiOperation({ summary: GENERATIONS_ROUTE_DESCRIPTIONS.LIST })
  @ApiResponse({ status: 200, description: 'List of generations' })
  async findAll(@CurrentUser() user: CurrentUserData, @Query() dto: ListGenerationsDto) {
    return this.generationsService.findAll(user.id, dto);
  }

  @Get(GENERATIONS_ROUTES.GET_BY_ID)
  @ApiOperation({ summary: GENERATIONS_ROUTE_DESCRIPTIONS.GET_BY_ID })
  @ApiParam({ name: 'id', description: 'Generation ID' })
  @ApiResponse({ status: 200, description: 'Generation details' })
  @ApiResponse({ status: 404, description: 'Generation not found' })
  async findOne(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return this.generationsService.findOne(user.id, id);
  }

  @Delete(GENERATIONS_ROUTES.DELETE)
  @ApiOperation({ summary: GENERATIONS_ROUTE_DESCRIPTIONS.DELETE })
  @ApiParam({ name: 'id', description: 'Generation ID' })
  @ApiResponse({ status: 200, description: 'Generation deleted' })
  @ApiResponse({ status: 404, description: 'Generation not found' })
  async remove(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return this.generationsService.remove(user.id, id);
  }

  @Post(GENERATIONS_ROUTES.CANCEL)
  @ApiOperation({ summary: GENERATIONS_ROUTE_DESCRIPTIONS.CANCEL })
  @ApiParam({ name: 'id', description: 'Generation ID' })
  @ApiResponse({ status: 200, description: 'Generation cancelled' })
  @ApiResponse({ status: 400, description: 'Cannot cancel generation' })
  async cancel(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return this.generationsService.cancel(user.id, id);
  }

  @Post(GENERATIONS_ROUTES.BULK_DELETE)
  @ApiOperation({ summary: GENERATIONS_ROUTE_DESCRIPTIONS.BULK_DELETE })
  @ApiResponse({ status: 200, description: 'Generations deleted' })
  async bulkDelete(@CurrentUser() user: CurrentUserData, @Body() dto: BulkDeleteDto) {
    return this.generationsService.bulkDelete(user.id, dto);
  }

  @Patch(GENERATIONS_ROUTES.SHARE)
  @ApiOperation({ summary: GENERATIONS_ROUTE_DESCRIPTIONS.SHARE })
  @ApiParam({ name: 'id', description: 'Generation ID' })
  @ApiResponse({ status: 200, description: 'Generation sharing updated' })
  async share(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body() dto: ShareGenerationDto,
  ) {
    return this.generationsService.share(user.id, id, dto);
  }
}

// Separate controller for /api/generate endpoint
@ApiTags('generations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller(GENERATIONS_ROUTES.GENERATE_BASE)
export class GenerateController {
  constructor(private readonly generationsService: GenerationsService) {}

  @Post()
  @ApiOperation({ summary: GENERATIONS_ROUTE_DESCRIPTIONS.CREATE })
  @ApiResponse({ status: 201, description: 'Generation started' })
  @ApiResponse({ status: 400, description: 'Invalid request or insufficient credits' })
  async create(@CurrentUser() user: CurrentUserData, @Body() dto: CreateGenerationDto) {
    return this.generationsService.create(user.id, dto);
  }
}
