import { AppDataSource } from '../../config/data-source';
import { Booking } from './booking.entity';
import { Property } from '../properties/property.entity';
import { ApiError } from '../../utils/api-error';
import { BookingStatus, PaginatedResponse, PaginationQuery, PropertyStatus, UserRole } from '../../types';
import { CreateBookingDto, RespondBookingDto, CompleteBookingDto, AssignInspectionDateDto } from './booking.dto';
import { paginate } from '../../utils/pagination';

const bookingRepo = () => AppDataSource.getRepository(Booking);
const propertyRepo = () => AppDataSource.getRepository(Property);

export class BookingService {
  async create(tenantId: string, dto: CreateBookingDto): Promise<Booking> {
    const property = await propertyRepo().findOne({
      where: { id: dto.propertyId, status: PropertyStatus.ACTIVE },
    });

    if (!property) throw ApiError.notFound('Property not found or not available');

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
      agentId: property.agentId,
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
      .leftJoinAndSelect('b.owner', 'owner')
      .leftJoinAndSelect('b.agent', 'agent')
      .where('b.tenantId = :tenantId', { tenantId });

    return paginate(qb, { ...query, sort: query.sort || 'createdAt', order: query.order || 'DESC' });
  }

  async getOwnerBookings(ownerId: string, query: PaginationQuery): Promise<PaginatedResponse<Booking>> {
    const qb = bookingRepo()
      .createQueryBuilder('b')
      .leftJoinAndSelect('b.property', 'p')
      .leftJoinAndSelect('b.tenant', 'tenant')
      .leftJoinAndSelect('b.agent', 'agent')
      .where('b.ownerId = :ownerId', { ownerId });

    return paginate(qb, { ...query, sort: query.sort || 'createdAt', order: query.order || 'DESC' });
  }

  async getAgentBookings(agentId: string, query: PaginationQuery): Promise<PaginatedResponse<Booking>> {
    const qb = bookingRepo()
      .createQueryBuilder('b')
      .leftJoinAndSelect('b.property', 'p')
      .leftJoinAndSelect('b.tenant', 'tenant')
      .leftJoinAndSelect('b.owner', 'owner')
      .where('b.agentId = :agentId', { agentId });

    return paginate(qb, { ...query, sort: query.sort || 'createdAt', order: query.order || 'DESC' });
  }

  async respond(bookingId: string, userId: string, userRole: UserRole, dto: RespondBookingDto): Promise<Booking> {
    const whereClause: any = { id: bookingId, status: BookingStatus.PENDING };

    // Owner or assigned agent can respond
    if (userRole === UserRole.AGENT) {
      whereClause.agentId = userId;
    } else {
      whereClause.ownerId = userId;
    }

    const booking = await bookingRepo().findOne({ where: whereClause });
    if (!booking) throw ApiError.notFound('Booking not found or already responded');

    booking.status = dto.status;
    booking.ownerNote = dto.ownerNote;
    if (dto.alternativeDate) {
      booking.alternativeDate = new Date(dto.alternativeDate);
    }

    return bookingRepo().save(booking);
  }

  async assignInspectionDate(bookingId: string, userId: string, userRole: UserRole, dto: AssignInspectionDateDto): Promise<Booking> {
    const whereClause: any = { id: bookingId };

    if (userRole === UserRole.AGENT) {
      whereClause.agentId = userId;
    } else {
      whereClause.ownerId = userId;
    }

    const booking = await bookingRepo().findOne({ where: whereClause });
    if (!booking) throw ApiError.notFound('Booking not found');

    if (booking.status !== BookingStatus.PENDING && booking.status !== BookingStatus.APPROVED) {
      throw ApiError.badRequest('Cannot assign inspection date for this booking status');
    }

    booking.inspectionDate = new Date(dto.inspectionDate);
    booking.status = BookingStatus.APPROVED;
    return bookingRepo().save(booking);
  }

  async complete(bookingId: string, userId: string, userRole: UserRole, dto: CompleteBookingDto): Promise<Booking> {
    const whereClause: any = { id: bookingId, status: BookingStatus.APPROVED };

    if (userRole === UserRole.AGENT) {
      whereClause.agentId = userId;
    } else {
      whereClause.ownerId = userId;
    }

    const booking = await bookingRepo().findOne({ where: whereClause });
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
      relations: ['property', 'property.images', 'tenant', 'owner', 'agent'],
    });
    if (!booking) throw ApiError.notFound('Booking not found');
    return booking;
  }
}