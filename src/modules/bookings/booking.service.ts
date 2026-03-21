import { LessThanOrEqual, In } from 'typeorm';
import { AppDataSource } from '../../config/data-source';
import { Booking } from './booking.entity';
import { Property } from '../properties/property.entity';
import { ApiError } from '../../utils/api-error';
import { BookingStatus, PaginatedResponse, PaginationQuery, PropertyStatus } from '../../types';
import { CreateBookingDto, RespondBookingDto, CompleteBookingDto, AssignInspectionDateDto, BookingFilterDto } from './booking.dto';
import { paginate } from '../../utils/pagination';

const bookingRepo = () => AppDataSource.getRepository(Booking);
const propertyRepo = () => AppDataSource.getRepository(Property);

export class BookingService {
  async create(tenantId: string, dto: CreateBookingDto): Promise<Booking> {
    const property = await propertyRepo().findOne({
      where: { id: dto.propertyId, status: PropertyStatus.ACTIVE },
    });

    if (!property) throw ApiError.notFound('Property not found or not available');

    if (property.availableUnits < 1) {
      throw ApiError.badRequest('No units available for this property');
    }

    if (property.ownerId === tenantId) {
      throw ApiError.badRequest('You cannot book your own property');
    }

    // Check for existing pending booking
    const existing = await bookingRepo().findOne({
      where: {
        tenantId,
        propertyId: dto.propertyId,
        status: BookingStatus.PENDING,
      },
    });

    if (existing) {
      throw ApiError.conflict('You already have a pending booking for this property');
    }

    const booking = bookingRepo().create({
      tenantId,
      propertyId: dto.propertyId,
      ownerId: property.ownerId,
      proposedDate: new Date(dto.proposedDate),
      message: dto.message,
    });

    return bookingRepo().save(booking);
  }

  async getTenantBookings(tenantId: string, filters: BookingFilterDto): Promise<PaginatedResponse<Booking>> {
    const qb = bookingRepo()
      .createQueryBuilder('b')
      .leftJoinAndSelect('b.property', 'p')
      .leftJoinAndSelect('p.images', 'img', 'img.isPrimary = true')
      .leftJoinAndSelect('b.owner', 'owner')
      .leftJoinAndSelect('b.invoices', 'inv')
      .where('b.tenantId = :tenantId', { tenantId })
      // Exclude bookings where tenant already has an active rent for that property
      .andWhere(
        `NOT EXISTS (
          SELECT 1 FROM rents r
          WHERE r."tenantId" = b."tenantId"
            AND r."propertyId" = b."propertyId"
            AND r.status IN ('active', 'due', 'overdue')
        )`,
      );

    this.applyBookingFilters(qb, filters);

    return paginate(qb, { page: filters.page, limit: filters.limit, sort: filters.sort || 'createdAt', order: filters.order || 'DESC' });
  }

  async getOwnerBookings(ownerId: string, filters: BookingFilterDto): Promise<PaginatedResponse<Booking>> {
    const qb = bookingRepo()
      .createQueryBuilder('b')
      .leftJoinAndSelect('b.property', 'p')
      .leftJoinAndSelect('p.images', 'img', 'img.isPrimary = true')
      .leftJoinAndSelect('b.tenant', 'tenant')
      .leftJoinAndSelect('b.invoices', 'inv')
      .where('b.ownerId = :ownerId', { ownerId });

    this.applyBookingFilters(qb, filters);

    return paginate(qb, { page: filters.page, limit: filters.limit, sort: filters.sort || 'createdAt', order: filters.order || 'DESC' });
  }

  private applyBookingFilters(qb: ReturnType<typeof bookingRepo>['createQueryBuilder'] extends (...args: any) => infer R ? R : never, filters: BookingFilterDto): void {
    if (filters.status) {
      qb.andWhere('b.status = :status', { status: filters.status });
    }
    if (filters.fromDate) {
      qb.andWhere('b.createdAt >= :fromDate', { fromDate: filters.fromDate });
    }
    if (filters.toDate) {
      qb.andWhere('b.createdAt <= :toDate', { toDate: filters.toDate });
    }
    if (filters.search) {
      qb.andWhere('(p.title ILIKE :search OR p.address ILIKE :search)', { search: `%${filters.search}%` });
    }
  }

  async respond(bookingId: string, ownerId: string, dto: RespondBookingDto): Promise<Booking> {
    const booking = await bookingRepo().findOne({
      where: { id: bookingId, ownerId, status: BookingStatus.PENDING },
    });
    if (!booking) throw ApiError.notFound('Booking not found or already responded');

    booking.status = dto.status;
    booking.ownerNote = dto.ownerNote;
    if (dto.alternativeDate) {
      booking.alternativeDate = new Date(dto.alternativeDate);
    }

    return bookingRepo().save(booking);
  }

  async assignInspectionDate(bookingId: string, ownerId: string, dto: AssignInspectionDateDto): Promise<Booking> {
    const booking = await bookingRepo().findOne({
      where: { id: bookingId, ownerId },
    });
    if (!booking) throw ApiError.notFound('Booking not found');

    if (booking.status !== BookingStatus.PENDING && booking.status !== BookingStatus.APPROVED) {
      throw ApiError.badRequest('Cannot assign inspection date for this booking status');
    }

    booking.inspectionDate = new Date(dto.inspectionDate);
    booking.status = BookingStatus.INSPECTION_SCHEDULED;
    return bookingRepo().save(booking);
  }

  async complete(bookingId: string, ownerId: string, dto: CompleteBookingDto): Promise<Booking> {
    const booking = await bookingRepo().findOne({
      where: { id: bookingId, ownerId },
    });
    if (!booking) throw ApiError.notFound('Booking not found');

    if (booking.status !== BookingStatus.APPROVED && booking.status !== BookingStatus.INSPECTION_SCHEDULED) {
      throw ApiError.badRequest('Booking must be approved or inspection scheduled to complete');
    }

    booking.status = dto.status;
    return bookingRepo().save(booking);
  }

  async cancel(bookingId: string, tenantId: string): Promise<Booking> {
    const booking = await bookingRepo().findOne({
      where: { id: bookingId, tenantId },
    });

    if (!booking) throw ApiError.notFound('Booking not found');

    if (booking.status === BookingStatus.COMPLETED) {
      throw ApiError.badRequest('Cannot cancel a completed booking');
    }

    booking.status = BookingStatus.CANCELLED;
    return bookingRepo().save(booking);
  }

  async delete(bookingId: string, tenantId: string): Promise<void> {
    const booking = await bookingRepo().findOne({
      where: { id: bookingId, tenantId },
    });
    if (!booking) throw ApiError.notFound('Booking not found');

    const deletableStatuses = [
      BookingStatus.COMPLETED,
      BookingStatus.CANCELLED,
      BookingStatus.REJECTED,
      BookingStatus.NO_SHOW,
    ];
    if (!deletableStatuses.includes(booking.status)) {
      throw ApiError.badRequest('Only completed, cancelled, rejected, or no-show bookings can be deleted');
    }

    await bookingRepo().remove(booking);
  }

  /**
   * Auto-cancel bookings where the inspection date passed 3+ days ago
   * and the booking is still in a pre-completion status.
   * Called by the daily cron job.
   */
  async cleanupStaleBookings(): Promise<{ cancelled: number }> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 3);

    const staleBookings = await bookingRepo().find({
      where: {
        inspectionDate: LessThanOrEqual(cutoff),
        status: In([
          BookingStatus.PENDING,
          BookingStatus.APPROVED,
          BookingStatus.INSPECTION_SCHEDULED,
        ]),
      },
    });

    for (const booking of staleBookings) {
      booking.status = BookingStatus.CANCELLED;
    }

    if (staleBookings.length > 0) {
      await bookingRepo().save(staleBookings);
    }

    return { cancelled: staleBookings.length };
  }

  async findById(id: string): Promise<Booking> {
    const booking = await bookingRepo().findOne({
      where: { id },
      relations: ['property', 'property.images', 'tenant', 'owner'],
    });
    if (!booking) throw ApiError.notFound('Booking not found');
    return booking;
  }
}
