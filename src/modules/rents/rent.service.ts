import { Brackets } from 'typeorm';
import { AppDataSource } from '../../config/data-source';
import { Rent } from './rent.entity';
import { Invoice } from '../invoices/invoice.entity';
import { Property } from '../properties/property.entity';
import { ApiError } from '../../utils/api-error';
import { RentStatus, InvoiceStatus, InvoiceType, PropertyStatus, PaginatedResponse } from '../../types';
import { RentFilterDto, SignRentAgreementDto } from './rent.dto';
import { paginate } from '../../utils/pagination';
import { generateRentAgreementPdf } from './rent-pdf-generator';

const rentRepo = () => AppDataSource.getRepository(Rent);
const invoiceRepo = () => AppDataSource.getRepository(Invoice);
const propertyRepo = () => AppDataSource.getRepository(Property);

export class RentService {
  /**
   * Create a Rent record when the first invoice for a property is paid.
   */
  async createFromPaidInvoice(invoice: Invoice, paymentId: string): Promise<Rent> {
    // Prevent duplicate: check for existing active rent for same tenant + property
    const existing = await rentRepo().findOne({
      where: {
        tenantId: invoice.tenantId,
        propertyId: invoice.propertyId,
        status: RentStatus.ACTIVE,
      },
    });
    if (existing) return existing;

    const todayStr = new Date().toISOString().split('T')[0];
    const nextDue = this.calculateNextDueDate(todayStr, invoice.rentPeriod);

    const rent = rentRepo().create({
      tenantId: invoice.tenantId,
      ownerId: invoice.ownerId,
      propertyId: invoice.propertyId,
      rentAmount: invoice.rentAmount,
      rentPeriod: invoice.rentPeriod,
      cautionDeposit: invoice.cautionDeposit || 0,
      startDate: todayStr,
      nextDueDate: nextDue,
      additionalTerms: invoice.additionalTerms,
      bookingId: invoice.bookingId,
      status: RentStatus.ACTIVE,
    });

    const savedRent = await rentRepo().save(rent);

    // Link the invoice to this rent
    invoice.rentId = savedRent.id;
    invoice.invoiceType = InvoiceType.INITIAL;
    await invoiceRepo().save(invoice);

    // Decrement available units on property
    const property = await propertyRepo().findOne({ where: { id: invoice.propertyId } });
    if (!property) throw ApiError.notFound('Property not found');
    if (property.availableUnits < 1) {
      throw ApiError.badRequest('No units available for this property');
    }
    property.availableUnits -= 1;
    if (property.availableUnits === 0) {
      property.status = PropertyStatus.RENTED;
    }
    await propertyRepo().save(property);

    // Generate agreement PDF
    try {
      const fullRent = await rentRepo().findOne({
        where: { id: savedRent.id },
        relations: ['tenant', 'owner', 'property'],
      });
      if (fullRent) {
        fullRent.agreementPdfUrl = await generateRentAgreementPdf(fullRent);
        await rentRepo().save(fullRent);
      }
    } catch (err) {
      console.error('[Rent] PDF generation failed:', err);
    }

    return savedRent;
  }

  /**
   * Advance nextDueDate when a renewal invoice is paid.
   */
  async advanceRentDueDate(rentId: string): Promise<Rent> {
    const rent = await rentRepo().findOne({ where: { id: rentId } });
    if (!rent) throw ApiError.notFound('Rent not found');

    rent.nextDueDate = this.calculateNextDueDate(rent.nextDueDate, rent.rentPeriod);
    rent.status = RentStatus.ACTIVE;
    return rentRepo().save(rent);
  }

  /**
   * Tenant signs the agreement on a Rent record.
   */
  async signAgreement(rentId: string, tenantId: string, dto: SignRentAgreementDto): Promise<Rent> {
    const rent = await rentRepo().findOne({ where: { id: rentId, tenantId } });
    if (!rent) throw ApiError.notFound('Rent not found');
    if (rent.tenantSignedAt) throw ApiError.badRequest('Agreement already signed');

    rent.tenantSignature = dto.signature;
    rent.tenantSignedAt = new Date();
    return rentRepo().save(rent);
  }

  /**
   * Owner terminates a rental.
   */
  async terminate(rentId: string, ownerId: string): Promise<Rent> {
    const rent = await rentRepo().findOne({
      where: { id: rentId, ownerId },
      relations: ['property'],
    });
    if (!rent) throw ApiError.notFound('Rent not found');
    if (rent.status === RentStatus.TERMINATED) {
      throw ApiError.badRequest('Rent is already terminated');
    }

    rent.status = RentStatus.TERMINATED;

    // Cancel any pending invoices linked to this rent
    await invoiceRepo()
      .createQueryBuilder()
      .update(Invoice)
      .set({ status: InvoiceStatus.CANCELLED })
      .where('rentId = :rentId', { rentId })
      .andWhere('status = :sent', { sent: InvoiceStatus.SENT })
      .execute();

    // Restore available unit (cap at totalUnits)
    if (rent.property) {
      rent.property.availableUnits = Math.min(rent.property.availableUnits + 1, rent.property.totalUnits);
      if (rent.property.status === PropertyStatus.RENTED) {
        rent.property.status = PropertyStatus.ACTIVE;
      }
      await propertyRepo().save(rent.property);
    }

    return rentRepo().save(rent);
  }

  /**
   * Admin terminates a rental (no ownership check).
   */
  async adminTerminate(rentId: string): Promise<Rent> {
    const rent = await rentRepo().findOne({
      where: { id: rentId },
      relations: ['property'],
    });
    if (!rent) throw ApiError.notFound('Rent not found');
    if (rent.status === RentStatus.TERMINATED) {
      throw ApiError.badRequest('Rent is already terminated');
    }

    rent.status = RentStatus.TERMINATED;

    await invoiceRepo()
      .createQueryBuilder()
      .update(Invoice)
      .set({ status: InvoiceStatus.CANCELLED })
      .where('rentId = :rentId', { rentId })
      .andWhere('status = :sent', { sent: InvoiceStatus.SENT })
      .execute();

    if (rent.property) {
      rent.property.availableUnits = Math.min(rent.property.availableUnits + 1, rent.property.totalUnits);
      if (rent.property.status === PropertyStatus.RENTED) {
        rent.property.status = PropertyStatus.ACTIVE;
      }
      await propertyRepo().save(rent.property);
    }

    return rentRepo().save(rent);
  }

  /**
   * Get a single rent by ID (only involved parties can view).
   */
  async findById(id: string, userId: string): Promise<Rent> {
    const rent = await rentRepo().findOne({
      where: { id },
      relations: ['tenant', 'owner', 'property', 'property.images', 'invoices'],
    });
    if (!rent) throw ApiError.notFound('Rent not found');
    if (rent.tenantId !== userId && rent.ownerId !== userId) {
      throw ApiError.forbidden('Not authorized to view this rent');
    }
    return rent;
  }

  /**
   * List rents for the current user with filters.
   */
  async getUserRents(userId: string, filters: RentFilterDto): Promise<PaginatedResponse<Rent>> {
    const qb = rentRepo()
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.property', 'p')
      .leftJoinAndSelect('p.images', 'pimg')
      .leftJoinAndSelect('r.tenant', 'tenant')
      .leftJoinAndSelect('r.owner', 'owner')
      .where(new Brackets(qb2 => {
        qb2.where('r.tenantId = :userId', { userId })
           .orWhere('r.ownerId = :userId', { userId });
      }));

    if (filters.status) {
      const statuses = filters.status.split(',').map(s => s.trim());
      if (statuses.length === 1) {
        qb.andWhere('r.status = :status', { status: statuses[0] });
      } else {
        qb.andWhere('r.status IN (:...statuses)', { statuses });
      }
    }
    if (filters.search) {
      qb.andWhere('(p.title ILIKE :search OR p.address ILIKE :search)', {
        search: `%${filters.search}%`,
      });
    }

    return paginate(qb, {
      page: filters.page,
      limit: filters.limit,
      sort: filters.sort || 'createdAt',
      order: filters.order || 'DESC',
    });
  }

  /**
   * Admin: list all rents with filters.
   */
  async getAllRents(filters: RentFilterDto): Promise<PaginatedResponse<Rent>> {
    const qb = rentRepo()
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.property', 'p')
      .leftJoinAndSelect('p.images', 'pimg')
      .leftJoinAndSelect('r.tenant', 'tenant')
      .leftJoinAndSelect('r.owner', 'owner');

    if (filters.status) {
      const statuses = filters.status.split(',').map(s => s.trim());
      if (statuses.length === 1) {
        qb.andWhere('r.status = :status', { status: statuses[0] });
      } else {
        qb.andWhere('r.status IN (:...statuses)', { statuses });
      }
    }
    if (filters.search) {
      qb.andWhere(
        '(p.title ILIKE :search OR p.address ILIKE :search OR tenant.firstName ILIKE :search OR tenant.lastName ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    return paginate(qb, {
      page: filters.page,
      limit: filters.limit,
      sort: filters.sort || 'createdAt',
      order: filters.order || 'DESC',
    });
  }

  /**
   * Generate renewal invoices for rents where nextDueDate has passed.
   * Called by the daily cron job.
   */
  async generateRenewalInvoices(): Promise<{ created: number }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    const dueRents = await rentRepo()
      .createQueryBuilder('r')
      .where('r.status IN (:...statuses)', { statuses: [RentStatus.ACTIVE, RentStatus.DUE] })
      .andWhere('r.nextDueDate <= :today', { today: todayStr })
      .getMany();

    let created = 0;

    for (const rent of dueRents) {
      // Update status to DUE or OVERDUE
      const dueDate = new Date(rent.nextDueDate);
      const daysDiff = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      rent.status = daysDiff > 0 ? RentStatus.OVERDUE : RentStatus.DUE;
      await rentRepo().save(rent);

      // Check if there's already a pending renewal invoice for this rent
      const existingRenewal = await invoiceRepo().findOne({
        where: [
          { rentId: rent.id, invoiceType: InvoiceType.RENEWAL, status: InvoiceStatus.SENT },
        ],
      });
      if (existingRenewal) continue;

      // Create a renewal invoice
      const renewal = invoiceRepo().create({
        tenantId: rent.tenantId,
        ownerId: rent.ownerId,
        propertyId: rent.propertyId,
        rentId: rent.id,
        invoiceType: InvoiceType.RENEWAL,
        rentAmount: rent.rentAmount,
        rentPeriod: rent.rentPeriod,
        cautionDeposit: 0,
        startDate: rent.nextDueDate,
        status: InvoiceStatus.SENT,
        isRenewal: true,
        initialPaymentDone: false,
      });

      await invoiceRepo().save(renewal);
      created++;
    }

    return { created };
  }

  // ─── Private Helpers ────────────────────────

  private calculateNextDueDate(fromDate: string, rentPeriod: string): string {
    const date = new Date(fromDate);
    if (rentPeriod === 'monthly') {
      date.setMonth(date.getMonth() + 1);
    } else {
      date.setFullYear(date.getFullYear() + 1);
    }
    return date.toISOString().split('T')[0];
  }
}
