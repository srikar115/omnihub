import { Module } from '@nestjs/common';
import { PaymentsController, SubscriptionPlansController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  controllers: [PaymentsController, SubscriptionPlansController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
