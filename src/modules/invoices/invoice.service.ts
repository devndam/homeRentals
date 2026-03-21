import { Brackets, IsNull, LessThanOrEqual } from 'typeorm';
import { AppDataSource } from '../../config/data-source';
import { Invoice } from './invoice.entity';
import { Property } from '../properties/property.entity';
import { User } from '../users/user.entity';
import { Booking } from '../bookings/booking.entity';
import { ApiError } from '../../utils/api-error';
import { InvoiceStatus, BookingStatus, PaginatedResponse, PropertyStatus } from '../../types';
import { RequestInvoiceDto, CreateInvoiceDto, SignInvoiceDto, InvoiceFilterDto } from './invoice.dto';
import { paginate } from '../../utils/pagination';
import { generateAgreementPdf } from './pdf-generator';
import { SystemSettingsService } from '../settings/system-settings.service';

const invoiceRepo = () => AppDataSource.getRepository(Invoice);
const propertyRepo = () => AppDataSource.getRepository(Property);
const userRepo = () => AppDataSource.getRepository(User);
const bookingRepo = () => AppDataSource.getRepository(Booking);
const settingsService = new SystemSettingsService();

export class InvoiceService {
  /**
   * Tenant requests an invoice after a completed inspection.
   */
  async requestInvoice(tenantId: string, dto: RequestInvoiceDto): Promise<Invoice> {
    // Verify booking belongs to tenant and is completed
    const booking = await bookingRepo().findOne({
      where: { id: dto.bookingId, tenantId, status: BookingStatus.COMPLETED },
    });
    if (!booking) throw ApiError.notFound('Completed booking not found');

    // Verify property exists
    const property = await propertyRepo().findOne({ where: { id: dto.propertyId } });
    if (!property) throw ApiError.notFound('Property not found');

    // Check unit availability
    const requestedUnits = dto.units || 1;
    if (property.availableUnits < requestedUnits) {
      throw ApiError.badRequest(
        `Not enough units available. Requested: ${requestedUnits}, Available: ${property.availableUnits}`,
      );
    }

    // Check if tenant already has an active/pending invoice for this property
    const existing = await invoiceRepo().findOne({
      where: [
        { tenantId, propertyId: dto.propertyId, status: InvoiceStatus.REQUESTED },
        { tenantId, propertyId: dto.propertyId, status: InvoiceStatus.DRAFT },
        { tenantId, propertyId: dto.propertyId, status: InvoiceStatus.SENT },
      ],
    });
    if (existing) throw ApiError.conflict('You already have a pending invoice for this property');

    // Auto-populate rent from property and caution deposit from settings
    const settings = await settingsService.getSettings();
    const fees = settingsService.calculateFees(Number(property.price), settings);

    const invoice = invoiceRepo().create({
      tenantId,
      ownerId: property.ownerId,
      propertyId: dto.propertyId,
      bookingId: dto.bookingId,
      rentAmount: property.price,
      rentPeriod: property.pricePeriod || 'yearly',
      cautionDeposit: fees.cautionDeposit,
      units: requestedUnits,
      status: InvoiceStatus.REQUESTED,
      requestedAt: new Date(),
    });

    return invoiceRepo().save(invoice);
  }

  /**
   * Landlord creates an invoice (from a request or from scratch).
   */
  async createInvoice(ownerId: string, dto: CreateInvoiceDto): Promise<Invoice> {
    // Verify property belongs to owner
    const property = await propertyRepo().findOne({
      where: { id: dto.propertyId, ownerId },
    });
    if (!property) throw ApiError.notFound('Property not found or not owned by you');

    // Verify tenant exists
    const tenant = await userRepo().findOne({ where: { id: dto.tenantId } });
    if (!tenant) throw ApiError.notFound('Tenant not found');

    let invoice: Invoice;

    if (dto.invoiceId) {
      // Fill in an existing REQUESTED invoice
      const existing = await invoiceRepo().findOne({
        where: { id: dto.invoiceId, ownerId, status: InvoiceStatus.REQUESTED },
      });
      if (!existing) throw ApiError.notFound('Requested invoice not found');

      existing.rentAmount = dto.rentAmount;
      existing.rentPeriod = dto.rentPeriod || 'yearly';
      existing.cautionDeposit = dto.cautionDeposit;
      existing.startDate = dto.startDate;
      existing.endDate = dto.endDate;
      existing.additionalTerms = dto.additionalTerms;
      existing.status = InvoiceStatus.DRAFT;

      invoice = existing;
    } else {
      // Create from scratch
      invoice = invoiceRepo().create({
        ownerId,
        tenantId: dto.tenantId,
        propertyId: dto.propertyId,
        bookingId: dto.bookingId,
        rentAmount: dto.rentAmount,
        rentPeriod: dto.rentPeriod || 'yearly',
        cautionDeposit: dto.cautionDeposit,
        startDate: dto.startDate,
        endDate: dto.endDate,
        additionalTerms: dto.additionalTerms,
        status: InvoiceStatus.DRAFT,
      });
    }

    return invoiceRepo().save(invoice);
  }

  /**
   * Landlord sends invoice to tenant for payment.
   */
  async sendInvoice(invoiceId: string, ownerId: string): Promise<Invoice> {
    const invoice = await invoiceRepo().findOne({
      where: { id: invoiceId, ownerId, status: InvoiceStatus.DRAFT },
      relations: ['property'],
    });
    if (!invoice) throw ApiError.notFound('Draft invoice not found');

    // Validate required fields are filled
    if (!invoice.rentAmount || !invoice.startDate || !invoice.endDate) {
      throw ApiError.badRequest('Invoice must have rent amount, start date, and end date before sending');
    }

    // Re-check unit availability before sending
    const requiredUnits = invoice.units || 1;
    if (invoice.property && invoice.property.availableUnits < requiredUnits) {
      throw ApiError.badRequest(
        `Not enough units available. Required: ${requiredUnits}, Available: ${invoice.property.availableUnits}`,
      );
    }

    invoice.status = InvoiceStatus.SENT;
    return invoiceRepo().save(invoice);
  }

  /**
   * Called by payment service when tenant pays the invoice.
   * Sets PAID → generates PDF → sets AGREEMENT_SENT.
   */
  async handlePaymentSuccess(invoiceId: string, paymentId: string): Promise<Invoice> {
    const invoice = await invoiceRepo().findOne({
      where: { id: invoiceId },
      relations: ['tenant', 'owner', 'property'],
    });
    if (!invoice) throw ApiError.notFound('Invoice not found');

    // Renewal invoices are handled entirely by PaymentService
    if (invoice.isRenewal) {
      return invoice;
    }

    invoice.status = InvoiceStatus.PAID;
    invoice.initialPaymentDone = true;
    invoice.initialPaymentId = paymentId;

    // Rent starts counting from the day payment is confirmed
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    invoice.rentStartDate = todayStr;

    // Calculate next rent due date and end date from rentStartDate
    const nextDue = new Date(today);
    const endDate = new Date(today);
    if (invoice.rentPeriod === 'monthly') {
      nextDue.setMonth(nextDue.getMonth() + 1);
      endDate.setMonth(endDate.getMonth() + 1);
    } else {
      nextDue.setFullYear(nextDue.getFullYear() + 1);
      endDate.setFullYear(endDate.getFullYear() + 1);
    }
    invoice.nextRentDueDate = nextDue.toISOString().split('T')[0];
    invoice.endDate = endDate.toISOString().split('T')[0];

    // NOTE: Unit decrement is handled by RentService.createFromPaidInvoice()

    // Generate legal agreement PDF
    try {
      const pdfPath = await generateAgreementPdf(invoice);
      invoice.pdfUrl = pdfPath;
      invoice.status = InvoiceStatus.AGREEMENT_SENT;
    } catch (err) {
      console.error('[Invoice] PDF generation failed:', err);
      // Still mark as PAID even if PDF fails — can retry later
    }

    return invoiceRepo().save(invoice);
  }

  /**
   * Tenant signs the legal agreement after payment. Status → COMPLETED.
   */
  async signAsTenant(invoiceId: string, tenantId: string, dto: SignInvoiceDto): Promise<Invoice> {
    const invoice = await invoiceRepo().findOne({
      where: { id: invoiceId, tenantId, status: InvoiceStatus.AGREEMENT_SENT },
    });
    if (!invoice) throw ApiError.notFound('Invoice not found or not awaiting your signature');

    invoice.tenantSignature = dto.signature;
    invoice.tenantSignedAt = new Date();
    invoice.status = InvoiceStatus.COMPLETED;

    return invoiceRepo().save(invoice);
  }

  /**
   * Cancel an invoice before payment (either party).
   */
  async cancel(invoiceId: string, userId: string): Promise<Invoice> {
    const invoice = await invoiceRepo().findOne({
      where: { id: invoiceId },
    });
    if (!invoice) throw ApiError.notFound('Invoice not found');

    if (invoice.tenantId !== userId && invoice.ownerId !== userId) {
      throw ApiError.forbidden('You are not authorized to cancel this invoice');
    }

    const cancellableStatuses = [
      InvoiceStatus.REQUESTED,
      InvoiceStatus.DRAFT,
      InvoiceStatus.SENT,
    ];
    if (!cancellableStatuses.includes(invoice.status)) {
      throw ApiError.badRequest('Only invoices before payment can be cancelled');
    }

    invoice.status = InvoiceStatus.CANCELLED;
    return invoiceRepo().save(invoice);
  }

  /**
   * Terminate a completed rental (owner only).
   */
  async terminate(invoiceId: string, ownerId: string): Promise<Invoice> {
    const invoice = await invoiceRepo().findOne({
      where: { id: invoiceId, ownerId },
      relations: ['property'],
    });
    if (!invoice) throw ApiError.notFound('Invoice not found');

    if (invoice.status !== InvoiceStatus.COMPLETED && invoice.status !== InvoiceStatus.EXPIRED) {
      throw ApiError.badRequest('Only active rentals can be terminated');
    }

    invoice.status = InvoiceStatus.TERMINATED;

    // Cancel any outstanding renewal invoices
    await invoiceRepo()
      .createQueryBuilder()
      .update(Invoice)
      .set({ status: InvoiceStatus.CANCELLED })
      .where('parentInvoiceId = :parentId', { parentId: invoiceId })
      .andWhere('status = :sent', { sent: InvoiceStatus.SENT })
      .execute();

    // Restore available units to property (cap at totalUnits)
    const property = invoice.property;
    if (property) {
      property.availableUnits = Math.min(property.availableUnits + (invoice.units || 1), property.totalUnits);
      if (property.status === PropertyStatus.RENTED) {
        property.status = PropertyStatus.ACTIVE;
      }
      await propertyRepo().save(property);
    }

    return invoiceRepo().save(invoice);
  }

  /**
   * Get a single invoice by ID (only parties can view).
   */
  async findById(id: string, userId: string): Promise<Invoice> {
    const invoice = await invoiceRepo().findOne({
      where: { id },
      relations: ['tenant', 'owner', 'property'],
    });
    if (!invoice) throw ApiError.notFound('Invoice not found');

    if (invoice.tenantId !== userId && invoice.ownerId !== userId) {
      throw ApiError.forbidden('You are not authorized to view this invoice');
    }

    return invoice;
  }

  /**
   * List invoices for the current user with filters.
   */
  async getUserInvoices(userId: string, filters: InvoiceFilterDto): Promise<PaginatedResponse<Invoice>> {
    const qb = invoiceRepo()
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.property', 'p')
      .leftJoinAndSelect('p.images', 'pimg')
      .leftJoinAndSelect('a.tenant', 'tenant')
      .leftJoinAndSelect('a.owner', 'owner')
      .where(new Brackets(qb2 => {
        qb2.where('a.tenantId = :userId', { userId })
           .orWhere('a.ownerId = :userId', { userId });
      }));

    if (filters.status) {
      const statuses = filters.status.split(',').map(s => s.trim());
      if (statuses.length === 1) {
        qb.andWhere('a.status = :status', { status: statuses[0] });
      } else {
        qb.andWhere('a.status IN (:...statuses)', { statuses });
      }
    }
    if (filters.search) {
      qb.andWhere('(p.title ILIKE :search OR p.address ILIKE :search)', { search: `%${filters.search}%` });
    }

    return paginate(qb, { page: filters.page, limit: filters.limit, sort: filters.sort || 'createdAt', order: filters.order || 'DESC' });
  }

  /**
   * Admin terminates any active rental (no ownership check).
   */
  async adminTerminate(invoiceId: string): Promise<Invoice> {
    const invoice = await invoiceRepo().findOne({
      where: { id: invoiceId },
      relations: ['property'],
    });
    if (!invoice) throw ApiError.notFound('Invoice not found');

    if (invoice.status !== InvoiceStatus.COMPLETED && invoice.status !== InvoiceStatus.EXPIRED) {
      throw ApiError.badRequest('Only active rentals can be terminated');
    }

    invoice.status = InvoiceStatus.TERMINATED;

    // Cancel any outstanding renewal invoices
    await invoiceRepo()
      .createQueryBuilder()
      .update(Invoice)
      .set({ status: InvoiceStatus.CANCELLED })
      .where('parentInvoiceId = :parentId', { parentId: invoiceId })
      .andWhere('status = :sent', { sent: InvoiceStatus.SENT })
      .execute();

    // Restore available units to property (cap at totalUnits)
    const property = invoice.property;
    if (property) {
      property.availableUnits = Math.min(property.availableUnits + (invoice.units || 1), property.totalUnits);
      if (property.status === PropertyStatus.RENTED) {
        property.status = PropertyStatus.ACTIVE;
      }
      await propertyRepo().save(property);
    }

    return invoiceRepo().save(invoice);
  }

  /**
   * Auto-generate renewal invoices for expired rentals.
   * Called by the daily cron job.
   */
  async generateRenewalInvoices(): Promise<{ created: number }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    // Find all original COMPLETED invoices where rent is due (legacy only — no rentId)
    const expiredInvoices = await invoiceRepo().find({
      where: {
        status: InvoiceStatus.COMPLETED,
        initialPaymentDone: true,
        isRenewal: false,
        rentId: IsNull(),
        nextRentDueDate: LessThanOrEqual(todayStr),
      },
    });

    let created = 0;

    for (const parent of expiredInvoices) {
      // Duplicate prevention: skip if a SENT or PAID renewal already exists
      const existingRenewal = await invoiceRepo().findOne({
        where: [
          { parentInvoiceId: parent.id, status: InvoiceStatus.SENT },
          { parentInvoiceId: parent.id, status: InvoiceStatus.PAID },
        ],
      });
      if (existingRenewal) continue;

      // Create renewal invoice, ready for payment
      const renewal = invoiceRepo().create({
        tenantId: parent.tenantId,
        ownerId: parent.ownerId,
        propertyId: parent.propertyId,
        bookingId: parent.bookingId,
        rentAmount: parent.rentAmount,
        rentPeriod: parent.rentPeriod,
        units: parent.units || 1,
        cautionDeposit: 0,
        startDate: parent.nextRentDueDate,
        status: InvoiceStatus.SENT,
        isRenewal: true,
        parentInvoiceId: parent.id,
        initialPaymentDone: false,
      });

      await invoiceRepo().save(renewal);
      created++;

      // Mark parent as EXPIRED so it exits the reminder/renewal cycle
      parent.status = InvoiceStatus.EXPIRED;
      await invoiceRepo().save(parent);
    }

    return { created };
  }
}
