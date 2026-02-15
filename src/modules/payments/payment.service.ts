import { v4 as uuid } from 'uuid';
import { AppDataSource } from '../../config/data-source';
import { Payment } from './payment.entity';
import { User } from '../users/user.entity';
import { ApiError } from '../../utils/api-error';
import { PaymentStatus, PaginatedResponse, PaginationQuery } from '../../types';
import { InitiatePaymentDto } from './payment.dto';
import { PaystackService } from './paystack.service';
import { env } from '../../config/env';
import { paginate } from '../../utils/pagination';

const paymentRepo = () => AppDataSource.getRepository(Payment);
const userRepo = () => AppDataSource.getRepository(User);
const paystackService = new PaystackService();

export class PaymentService {
  async initiate(userId: string, dto: InitiatePaymentDto) {
    const user = await userRepo().findOne({ where: { id: userId } });
    if (!user) throw ApiError.notFound('User not found');

    const reference = `PAY-${uuid().split('-')[0].toUpperCase()}-${Date.now()}`;

    // Calculate commission split
    const commissionRate = env.paystack.commissionPercent / 100;
    const commission = Math.round(dto.amount * commissionRate * 100) / 100;
    const ownerAmount = dto.amount - commission;

    // Create payment record
    const payment = paymentRepo().create({
      reference,
      userId,
      propertyId: dto.propertyId,
      agreementId: dto.agreementId,
      type: dto.type,
      amount: dto.amount,
      commission,
      ownerAmount,
      description: dto.description,
      status: PaymentStatus.PENDING,
    });

    await paymentRepo().save(payment);

    // Initialize Paystack transaction
    try {
      // Find property owner subaccount for split payment
      let subaccount: string | undefined;
      let transactionCharge: number | undefined;

      if (dto.propertyId) {
        const property = await AppDataSource.getRepository('Property').findOne({
          where: { id: dto.propertyId },
          relations: ['owner'],
        });
        if (property?.owner?.paystackSubaccountCode) {
          subaccount = property.owner.paystackSubaccountCode;
          transactionCharge = Math.round(commission * 100); // commission in kobo
        }
      }

      const paystackResult = await paystackService.initializeTransaction({
        email: user.email,
        amount: Math.round(dto.amount * 100), // Convert to kobo
        reference,
        metadata: {
          paymentId: payment.id,
          userId,
          type: dto.type,
        },
        subaccount,
        transaction_charge: transactionCharge,
      });

      payment.paystackReference = paystackResult.reference;
      payment.paystackAuthorizationUrl = paystackResult.authorization_url;
      await paymentRepo().save(payment);

      return {
        payment,
        authorizationUrl: paystackResult.authorization_url,
      };
    } catch (err: any) {
      payment.status = PaymentStatus.FAILED;
      await paymentRepo().save(payment);
      throw ApiError.badRequest(`Payment initialization failed: ${err.message}`);
    }
  }

  async verify(reference: string) {
    const payment = await paymentRepo().findOne({ where: { reference } });
    if (!payment) throw ApiError.notFound('Payment not found');

    if (payment.status === PaymentStatus.SUCCESS) {
      return payment; // Already verified
    }

    try {
      const result = await paystackService.verifyTransaction(reference);

      if (result.status === 'success') {
        payment.status = PaymentStatus.SUCCESS;
        payment.paystackMetadata = result as any;
      } else {
        payment.status = PaymentStatus.FAILED;
      }

      await paymentRepo().save(payment);
      return payment;
    } catch (err: any) {
      throw ApiError.badRequest(`Verification failed: ${err.message}`);
    }
  }

  async handleWebhook(eventData: any) {
    const { event, data } = eventData;

    if (event === 'charge.success') {
      const payment = await paymentRepo().findOne({
        where: { reference: data.reference },
      });

      if (payment && payment.status !== PaymentStatus.SUCCESS) {
        payment.status = PaymentStatus.SUCCESS;
        payment.paystackMetadata = data;
        await paymentRepo().save(payment);
      }
    }
  }

  async getUserPayments(userId: string, query: PaginationQuery): Promise<PaginatedResponse<Payment>> {
    const qb = paymentRepo()
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.property', 'prop')
      .where('p.userId = :userId', { userId });

    return paginate(qb, { ...query, sort: query.sort || 'createdAt', order: query.order || 'DESC' });
  }

  async getPaymentById(id: string, userId: string): Promise<Payment> {
    const payment = await paymentRepo().findOne({
      where: { id, userId },
      relations: ['property'],
    });
    if (!payment) throw ApiError.notFound('Payment not found');
    return payment;
  }
}