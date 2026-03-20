import { AppDataSource } from '../../config/data-source';
import { Dispute } from './dispute.entity';
import { ApiError } from '../../utils/api-error';
import { DisputeStatus, PaginatedResponse, PaginationQuery } from '../../types';
import { UpdateDisputeStatusDto } from './dispute.dto';
import { paginate } from '../../utils/pagination';

const disputeRepo = () => AppDataSource.getRepository(Dispute);

export class DisputeService {
  async list(query: PaginationQuery & { type?: string; status?: string; search?: string }): Promise<PaginatedResponse<Dispute>> {
    const qb = disputeRepo()
      .createQueryBuilder('d')
      .leftJoinAndSelect('d.property', 'property')
      .leftJoinAndSelect('d.tenant', 'tenant')
      .leftJoinAndSelect('d.owner', 'owner');

    if (query.type) qb.andWhere('d.type = :type', { type: query.type });
    if (query.status) qb.andWhere('d.status = :status', { status: query.status });
    if (query.search) {
      qb.andWhere(
        '(property.title ILIKE :s OR tenant.firstName ILIKE :s OR tenant.lastName ILIKE :s OR owner.firstName ILIKE :s OR owner.lastName ILIKE :s)',
        { s: `%${query.search}%` },
      );
    }

    return paginate(qb, { ...query, sort: query.sort || 'createdAt', order: query.order || 'DESC' });
  }

  async getById(id: string): Promise<Dispute> {
    const dispute = await disputeRepo().findOne({
      where: { id },
      relations: ['property', 'tenant', 'owner', 'resolvedByAdmin'],
    });
    if (!dispute) throw ApiError.notFound('Dispute not found');
    return dispute;
  }

  async updateStatus(id: string, adminId: string, dto: UpdateDisputeStatusDto): Promise<Dispute> {
    const dispute = await disputeRepo().findOne({ where: { id } });
    if (!dispute) throw ApiError.notFound('Dispute not found');

    dispute.status = dto.status;

    if (dto.status === DisputeStatus.RESOLVED) {
      dispute.resolvedByAdminId = adminId;
      dispute.resolvedAt = new Date();
      if (dto.resolution) dispute.resolution = dto.resolution;
    }

    return disputeRepo().save(dispute);
  }
}
