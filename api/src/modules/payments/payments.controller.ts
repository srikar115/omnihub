import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { PAYMENTS_ROUTES } from './payments.routes';
import { JwtAuthGuard } from '@common/guards';
import { CurrentUser, CurrentUserData } from '@common/decorators';

@ApiTags('payments')
@Controller(PAYMENTS_ROUTES.BASE)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post(PAYMENTS_ROUTES.CREATE_ORDER)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async createOrder(
    @CurrentUser() user: CurrentUserData,
    @Body() body: { planId: string; billingCycle: string },
  ) {
    return this.paymentsService.createOrder(user.id, body.planId, body.billingCycle);
  }

  @Post(PAYMENTS_ROUTES.VERIFY)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async verifyPayment(@CurrentUser() user: CurrentUserData, @Body() body: any) {
    return this.paymentsService.verifyPayment(user.id, body);
  }
}

// Separate controller for subscription plans (public)
@ApiTags('payments')
@Controller('api/subscription-plans')
export class SubscriptionPlansController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  async getPlans() {
    return this.paymentsService.getSubscriptionPlans();
  }
}
