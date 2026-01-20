import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '@database/database.service';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

@Injectable()
export class PaymentsService {
  constructor(
    private db: DatabaseService,
    private configService: ConfigService,
  ) {}

  async getSubscriptionPlans() {
    const plans = await this.db.getAll<any>(
      'SELECT * FROM subscription_plans ORDER BY displayOrder ASC',
    );
    return plans.map((p) => ({
      ...p,
      features: typeof p.features === 'string' ? JSON.parse(p.features) : p.features,
    }));
  }

  async createOrder(userId: string, planId: string, billingCycle: string) {
    // This is a stub - implement Razorpay integration
    const plan = await this.db.getOne<any>('SELECT * FROM subscription_plans WHERE id = ?', [planId]);
    if (!plan) throw new BadRequestException('Plan not found');

    const amount = billingCycle === 'yearly' ? plan.priceYearly : plan.priceMonthly;

    return {
      orderId: `order_${uuidv4().substring(0, 8)}`,
      amount,
      currency: 'INR',
      planId,
      billingCycle,
    };
  }

  async verifyPayment(userId: string, data: any) {
    // Verify Razorpay signature - stub implementation
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planId, billingCycle } = data;

    // In real implementation, verify signature with Razorpay
    // For now, just record the payment
    await this.db.run(
      `INSERT INTO payments (id, userId, amount, type, razorpayPaymentId, razorpayOrderId, status, createdAt)
       VALUES (?, ?, ?, 'subscription', ?, ?, 'completed', datetime('now'))`,
      [uuidv4(), userId, 0, razorpay_payment_id, razorpay_order_id],
    );

    return { success: true };
  }
}
