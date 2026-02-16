import bcrypt from 'bcryptjs';
import { AppDataSource } from '../../config/data-source';
import { User } from '../users/user.entity';
import { Booking } from '../bookings/booking.entity';
import { Property } from '../properties/property.entity';
import { ApiError } from '../../utils/api-error';
import { BookingStatus, PaginatedResponse, PaginationQuery, UserRole } from '../../types';
import { CreateAgentDto, UpdateAgentDto, AgentBookingsQueryDto, AgentPropertiesQueryDto } from './agent.dto';
import { Not } from 'typeorm';
import { paginate } from '../../utils/pagination';

const userRepo = () => AppDataSource.getRepository(User);
const bookingRepo = () => AppDataSource.getRepository(Booking);
const propertyRepo = () => AppDataSource.getRepository(Property);

export class AgentService {
  async createAgent(ownerId: string, dto: CreateAgentDto): Promise<User> {
    const existing = await userRepo().findOne({
      where: [{ email: dto.email }, { phone: dto.phone }],
    });

    if (existing) {
      throw ApiError.conflict(
        existing.email === dto.email
          ? 'Email already registered'
          : 'Phone number already registered',
      );
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);

    const agent = userRepo().create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email.toLowerCase().trim(),
      phone: dto.phone,
      password: hashedPassword,
      role: UserRole.AGENT,
      addedByOwnerId: ownerId,
      emailVerified: true,
    });

    await userRepo().save(agent);

    return this.sanitize(agent);
  }

  async getMyAgents(ownerId: string, query: PaginationQuery & { search?: string }): Promise<PaginatedResponse<User>> {
    const qb = userRepo()
      .createQueryBuilder('u')
      .where('u.role = :role', { role: UserRole.AGENT })
      .andWhere('u.addedByOwnerId = :ownerId', { ownerId });

    if (query.search) {
      qb.andWhere(
        '(u.firstName ILIKE :s OR u.lastName ILIKE :s OR u.email ILIKE :s)',
        { s: `%${query.search}%` },
      );
    }

    return paginate(qb, { ...query, sort: query.sort || 'createdAt', order: query.order || 'DESC' });
  }

  async getAgentById(agentId: string, ownerId: string) {
    const agent = await userRepo().findOne({
      where: { id: agentId, role: UserRole.AGENT, addedByOwnerId: ownerId },
    });
    if (!agent) throw ApiError.notFound('Agent not found');

    const statsRaw = await bookingRepo()
      .createQueryBuilder('b')
      .innerJoin('b.property', 'p')
      .select('b.status', 'status')
      .addSelect('COUNT(*)::int', 'count')
      .where('b.agentId = :agentId OR p.agentId = :agentId', { agentId })
      .groupBy('b.status')
      .getRawMany<{ status: BookingStatus; count: number }>();

    const stats = { total: 0, pending: 0, approved: 0, completed: 0 };
    for (const row of statsRaw) {
      stats[row.status as keyof typeof stats] = (stats[row.status as keyof typeof stats] || 0) + row.count;
      stats.total += row.count;
    }

    // First page of assigned inspections
    const bookingsQb = bookingRepo()
      .createQueryBuilder('b')
      .leftJoinAndSelect('b.tenant', 'tenant')
      .leftJoinAndSelect('b.property', 'p')
      .leftJoinAndSelect('p.images', 'img', 'img.isPrimary = true')
      .where('b.agentId = :agentId OR p.agentId = :agentId', { agentId });

    const bookings = await paginate(bookingsQb, { sort: 'createdAt', order: 'DESC' });

    return { agent, stats, bookings };
  }

  async getAgentBookings(agentId: string, ownerId: string, query: AgentBookingsQueryDto): Promise<PaginatedResponse<Booking>> {
    // Verify agent belongs to this owner
    const agent = await userRepo().findOne({
      where: { id: agentId, role: UserRole.AGENT, addedByOwnerId: ownerId },
    });
    if (!agent) throw ApiError.notFound('Agent not found');

    const qb = bookingRepo()
      .createQueryBuilder('b')
      .leftJoinAndSelect('b.tenant', 'tenant')
      .leftJoinAndSelect('b.property', 'p')
      .leftJoinAndSelect('p.images', 'img', 'img.isPrimary = true')
      .where('b.agentId = :agentId OR p.agentId = :agentId', { agentId });

    if (query.status) {
      qb.andWhere('b.status = :status', { status: query.status });
    }

    return paginate(qb, { ...query, sort: query.sort || 'createdAt', order: query.order || 'DESC' });
  }

  async getAgentProperties(agentId: string, ownerId: string, query: AgentPropertiesQueryDto): Promise<PaginatedResponse<Property>> {
    const agent = await userRepo().findOne({
      where: { id: agentId, role: UserRole.AGENT, addedByOwnerId: ownerId },
    });
    if (!agent) throw ApiError.notFound('Agent not found');

    const qb = propertyRepo()
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.images', 'img', 'img.isPrimary = true')
      .where('p.agentId = :agentId', { agentId });

    if (query.search) {
      qb.andWhere('(p.title ILIKE :s OR p.address ILIKE :s)', { s: `%${query.search}%` });
    }

    return paginate(qb, { ...query, sort: query.sort || 'createdAt', order: query.order || 'DESC' });
  }

  async updateAgent(agentId: string, ownerId: string, dto: UpdateAgentDto): Promise<User> {
    const agent = await userRepo().findOne({
      where: { id: agentId, role: UserRole.AGENT, addedByOwnerId: ownerId },
    });
    if (!agent) throw ApiError.notFound('Agent not found');

    if (dto.email) {
      const emailTaken = await userRepo().findOne({
        where: { email: dto.email.toLowerCase().trim(), id: Not(agentId) },
      });
      if (emailTaken) throw ApiError.conflict('Email already registered');
      agent.email = dto.email.toLowerCase().trim();
    }

    if (dto.phone) {
      const phoneTaken = await userRepo().findOne({
        where: { phone: dto.phone, id: Not(agentId) },
      });
      if (phoneTaken) throw ApiError.conflict('Phone number already registered');
      agent.phone = dto.phone;
    }

    if (dto.firstName) agent.firstName = dto.firstName;
    if (dto.lastName) agent.lastName = dto.lastName;
    if (dto.password) agent.password = await bcrypt.hash(dto.password, 12);

    await userRepo().save(agent);
    return this.sanitize(agent);
  }

  async removeAgent(agentId: string, ownerId: string): Promise<void> {
    const agent = await userRepo().findOne({
      where: { id: agentId, role: UserRole.AGENT, addedByOwnerId: ownerId },
    });
    if (!agent) throw ApiError.notFound('Agent not found');

    agent.isActive = false;
    await userRepo().save(agent);
  }

  async toggleAgentActive(agentId: string, ownerId: string): Promise<User> {
    const agent = await userRepo().findOne({
      where: { id: agentId, role: UserRole.AGENT, addedByOwnerId: ownerId },
    });
    if (!agent) throw ApiError.notFound('Agent not found');

    agent.isActive = !agent.isActive;
    await userRepo().save(agent);
    return agent;
  }

  private sanitize(user: User): User {
    const sanitized = { ...user };
    delete (sanitized as any).password;
    delete (sanitized as any).passwordResetToken;
    delete (sanitized as any).passwordResetExpires;
    return sanitized;
  }
}
