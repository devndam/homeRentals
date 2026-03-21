import { v4 as uuid } from 'uuid';
import { AppDataSource } from '../../config/data-source';
import { Payment } from './payment.entity';
import { User } from '../users/user.entity';
import { Invoice } from '../invoices/invoice.entity';
import { ApiError } from '../../utils/api-error';
import { PaymentStatus, InvoiceStatus, NotificationType, PaginatedResponse, PaginationQuery } from '../../types';
import { InitiatePaymentDto, PaymentFilterDto } from './payment.dto';
import { PaystackService } from './paystack.service';
import { env } from '../../config/env';
import { paginate } from '../../utils/pagination';
import { WalletService } from '../wallet/wallet.service';
import { SystemSettingsService } from '../settings/system-settings.service';
import { RentService } from '../rents/rent.service';
import { Property } from '../properties/property.entity';
import { NotificationService } from '../notifications/notification.service';

const paymentRepo = () => AppDataSource.getRepository(Payment);
const userRepo = () => AppDataSource.getRepository(User);
const invoiceRepo = () => AppDataSource.getRepository(Invoice);
const paystackService = new PaystackService();
const walletService = new WalletService();
const settingsService = new SystemSettingsService();
const rentService = new RentService();
const notificationService = new NotificationService();

export class PaymentService {
  async initiate(userId: string, dto: InitiatePaymentDto) {
    const user = await userRepo().findOne({ where: { id: userId } });
    if (!user) throw ApiError.notFound('User not found');

    // Check unit availability for property-linked payments (initial rent)
    if (dto.propertyId && dto.invoiceId) {
      const invoice = await invoiceRepo().findOne({ where: { id: dto.invoiceId } });
      if (invoice && !invoice.isRenewal && !invoice.rentId) {
        const property = await AppDataSource.getRepository('Property').findOne({
          where: { id: dto.propertyId },
        });
        const requiredUnits = invoice.units || 1;
        if (property && property.availableUnits < requiredUnits) {
          throw ApiError.badRequest(
            `Not enough units available. Required: ${requiredUnits}, Available: ${property.availableUnits}`,
          );
        }
      }
    }

    const reference = `PAY-${uuid().split('-')[0].toUpperCase()}-${Date.now()}`;

    // Calculate commission split from system settings
    const settings = await settingsService.getSettings();
    const commissionRate = Number(settings.platformCommissionPercent) / 100;
    const commission = Math.round(dto.amount * commissionRate * 100) / 100;
    const ownerAmount = dto.amount - commission;

    // Create payment record
    const payment = paymentRepo().create({
      reference,
      userId,
      propertyId: dto.propertyId,
      invoiceId: dto.invoiceId,
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
      // Ensure invoice status is up to date (handles edge case where
      // webhook processed before invoice status logic was added)
      await this.handleInvoicePaymentSuccess(payment);
      return payment;
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

      if (payment.status === PaymentStatus.SUCCESS) {
        await walletService.creditOwnerWallet(payment);
        await this.handleInvoicePaymentSuccess(payment);
        await this.notifyPaymentSuccess(payment);
      }

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

        await walletService.creditOwnerWallet(payment);
        await this.handleInvoicePaymentSuccess(payment);
        await this.notifyPaymentSuccess(payment);
      }
    }
  }

  async getUserPayments(userId: string, filters: PaymentFilterDto): Promise<PaginatedResponse<Payment>> {
    const qb = paymentRepo()
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.property', 'prop')
      .where('p.userId = :userId', { userId });

    if (filters.status) {
      qb.andWhere('p.status = :status', { status: filters.status });
    }
    if (filters.type) {
      qb.andWhere('p.type = :type', { type: filters.type });
    }
    if (filters.fromDate) {
      qb.andWhere('p.createdAt >= :fromDate', { fromDate: filters.fromDate });
    }
    if (filters.toDate) {
      qb.andWhere('p.createdAt <= :toDate', { toDate: filters.toDate });
    }

    return paginate(qb, { page: filters.page, limit: filters.limit, sort: filters.sort || 'createdAt', order: filters.order || 'DESC' });
  }

  async getPaymentById(id: string, userId: string): Promise<Payment> {
    const payment = await paymentRepo().findOne({
      where: { id, userId },
      relations: ['property'],
    });
    if (!payment) throw ApiError.notFound('Payment not found');
    return payment;
  }

  private calculateNextDueDate(fromDate: string, rentPeriod: string): string {
    const date = new Date(fromDate);
    if (rentPeriod === 'monthly') {
      date.setMonth(date.getMonth() + 1);
    } else {
      // yearly (default)
      date.setFullYear(date.getFullYear() + 1);
    }
    return date.toISOString().split('T')[0];
  }

  private async handleInvoicePaymentSuccess(payment: Payment): Promise<void> {
    if (!payment.invoiceId) return;

    const invoice = await invoiceRepo().findOne({
      where: { id: payment.invoiceId },
    });
    if (!invoice) return;

    // ─── Path 1: Renewal payment on an existing Rent ──
    if (invoice.rentId) {
      await rentService.advanceRentDueDate(invoice.rentId);
      invoice.status = InvoiceStatus.PAID;
      invoice.initialPaymentDone = true;
      invoice.initialPaymentId = payment.id;
      await invoiceRepo().save(invoice);
      return;
    }

    // ─── Path 2: Legacy renewal (old invoices without rentId) ──
    if (invoice.isRenewal && invoice.parentInvoiceId) {
      const parentInvoice = await invoiceRepo().findOne({
        where: { id: invoice.parentInvoiceId },
      });

      if (parentInvoice) {
        parentInvoice.nextRentDueDate = this.calculateNextDueDate(
          invoice.startDate!,
          invoice.rentPeriod,
        );
        parentInvoice.status = InvoiceStatus.COMPLETED;
        await invoiceRepo().save(parentInvoice);
      }

      invoice.status = InvoiceStatus.COMPLETED;
      invoice.initialPaymentDone = true;
      invoice.initialPaymentId = payment.id;
      invoice.endDate = this.calculateNextDueDate(invoice.startDate!, invoice.rentPeriod);
      await invoiceRepo().save(invoice);
      return;
    }

    // ─── Path 3: Initial payment → create Rent record ──
    if (!invoice.initialPaymentDone) {
      invoice.status = InvoiceStatus.PAID;
      invoice.initialPaymentDone = true;
      invoice.initialPaymentId = payment.id;
      await invoiceRepo().save(invoice);

      // Create the Rent entity (links invoice, decrements units, generates PDF)
      await rentService.createFromPaidInvoice(invoice, payment.id);
      return;
    }

    // ─── Path 4: Legacy fallback ──────────────────────
    if (invoice.nextRentDueDate) {
      invoice.nextRentDueDate = this.calculateNextDueDate(
        invoice.nextRentDueDate,
        invoice.rentPeriod,
      );
    }
    if (invoice.status === InvoiceStatus.SENT) {
      invoice.status = InvoiceStatus.PAID;
    }
    await invoiceRepo().save(invoice);
  }

  private async notifyPaymentSuccess(payment: Payment): Promise<void> {
    try {
      if (!payment.propertyId) return;
      const property = await AppDataSource.getRepository(Property).findOne({ where: { id: payment.propertyId } });
      if (!property) return;
      const tenant = await userRepo().findOne({ where: { id: payment.userId } });
      await notificationService.create({
        userId: property.ownerId,
        type: NotificationType.PAYMENT,
        title: 'Payment Received',
        message: `Payment received from ${tenant?.firstName || 'a tenant'} for ${property.title}`,
        relatedEntityId: payment.id,
        relatedEntityType: 'payment',
      });
    } catch (err) { console.error('[Notification]', err); }
  }
}