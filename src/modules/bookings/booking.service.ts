import { AppDataSource } from '../../config/data-source';
import { Booking } from './booking.entity';
import { Property } from '../properties/property.entity';
import { ApiError } from '../../utils/api-error';
import { BookingStatus, PaginatedResponse, PaginationQuery, PropertyStatus } from '../../types';
import { CreateBookingDto, RespondBookingDto, CompleteBookingDto } from './booking.dto';
import { paginate } from '../../utils/pagination';

const bookingRepo = () => AppDataSource.getRepository(Booking);
const propertyRepo = () => AppDataSource.getRepository(Property);

export class BookingService {
  async create(tenantId: string, dto: CreateBookingDto): Promise<Booking> {
    const property = await propertyRepo().findOne({
      where: { id: dto.propertyId, status: PropertyStatus.ACTIVE },
    });

    if (!property) throw ApiError.notFound('Property not found or not available');

    if (property.landlordId === tenantId) {
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
      landlordId: property.landlordId,
      proposedDate: new Date(dto.proposedDate),
      message: dto.message,
    });

    return bookingRepo().save(booking);
  }

  async getTenantBookings(tenantId: string, query: PaginationQuery): Promise<PaginatedResponse<Booking>> {
    const qb = bookingRepo()
      .createQueryBuilder('b')
      .leftJoinAndSelect('b.property', 'p')
      .leftJoinAndSelect('p.images', 'img', 'img.isPrimary = true')
      .leftJoinAndSelect('b.landlord', 'landlord')
      .where('b.tenantId = :tenantId', { tenantId });

    return paginate(qb, { ...query, sort: query.sort || 'createdAt', order: query.order || 'DESC' });
  }

  async getLandlordBookings(landlordId: string, query: PaginationQuery): Promise<PaginatedResponse<Booking>> {
    const qb = bookingRepo()
      .createQueryBuilder('b')
      .leftJoinAndSelect('b.property', 'p')
      .leftJoinAndSelect('b.tenant', 'tenant')
      .where('b.landlordId = :landlordId', { landlordId });

    return paginate(qb, { ...query, sort: query.sort || 'createdAt', order: query.order || 'DESC' });
  }

  async respond(bookingId: string, landlordId: string, dto: RespondBookingDto): Promise<Booking> {
    const booking = await bookingRepo().findOne({
      where: { id: bookingId, landlordId, status: BookingStatus.PENDING },
    });

    if (!booking) throw ApiError.notFound('Booking not found or already responded');

    booking.status = dto.status;
    booking.landlordNote = dto.landlordNote;
    if (dto.alternativeDate) {
      booking.alternativeDate = new Date(dto.alternativeDate);
    }

    return bookingRepo().save(booking);
  }

  async complete(bookingId: string, landlordId: string, dto: CompleteBookingDto): Promise<Booking> {
    const booking = await bookingRepo().findOne({
      where: { id: bookingId, landlordId, status: BookingStatus.APPROVED },
    });

    if (!booking) throw ApiError.notFound('Booking not found or not approved');

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

  async findById(id: string): Promise<Booking> {
    const booking = await bookingRepo().findOne({
      where: { id },
      relations: ['property', 'property.images', 'tenant', 'landlord'],
    });
    if (!booking) throw ApiError.notFound('Booking not found');
    return booking;
  }
}
