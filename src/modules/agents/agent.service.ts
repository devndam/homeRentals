import bcrypt from 'bcryptjs';
import { AppDataSource } from '../../config/data-source';
import { User } from '../users/user.entity';
import { ApiError } from '../../utils/api-error';
import { PaginatedResponse, PaginationQuery, UserRole } from '../../types';
import { CreateAgentDto } from './agent.dto';
import { paginate } from '../../utils/pagination';

const userRepo = () => AppDataSource.getRepository(User);

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

  async getAgentById(agentId: string, ownerId: string): Promise<User> {
    const agent = await userRepo().findOne({
      where: { id: agentId, role: UserRole.AGENT, addedByOwnerId: ownerId },
    });
    if (!agent) throw ApiError.notFound('Agent not found');
    return agent;
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
