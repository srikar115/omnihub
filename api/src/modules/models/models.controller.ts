import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { ModelsService } from './models.service';
import { MODELS_ROUTES, MODELS_ROUTE_DESCRIPTIONS } from './models.routes';
import { CalculatePriceDto } from './dto';

@ApiTags('models')
@Controller(MODELS_ROUTES.BASE)
export class ModelsController {
  constructor(private readonly modelsService: ModelsService) {}

  @Get(MODELS_ROUTES.LIST)
  @ApiOperation({ summary: MODELS_ROUTE_DESCRIPTIONS.LIST })
  @ApiResponse({ status: 200, description: 'List of all available models' })
  async findAll() {
    return this.modelsService.findAll();
  }

  @Get(MODELS_ROUTES.GET_BY_ID)
  @ApiOperation({ summary: MODELS_ROUTE_DESCRIPTIONS.GET_BY_ID })
  @ApiParam({ name: 'id', description: 'Model ID' })
  @ApiResponse({ status: 200, description: 'Model details' })
  @ApiResponse({ status: 404, description: 'Model not found' })
  async findOne(@Param('id') id: string) {
    return this.modelsService.findOne(id);
  }

  @Post(MODELS_ROUTES.CALCULATE_PRICE)
  @ApiOperation({ summary: MODELS_ROUTE_DESCRIPTIONS.CALCULATE_PRICE })
  @ApiParam({ name: 'id', description: 'Model ID' })
  @ApiResponse({ status: 200, description: 'Calculated price' })
  @ApiResponse({ status: 404, description: 'Model not found' })
  async calculatePrice(@Param('id') id: string, @Body() dto: CalculatePriceDto) {
    return this.modelsService.calculatePrice(id, dto);
  }
}
