import { AppDataSource } from '../../config/data-source';
import { KycDocument } from './kyc-document.entity';
import { User } from '../users/user.entity';
import { ApiError } from '../../utils/api-error';
import { KycStatus, PaginatedResponse } from '../../types';
import { SubmitKycDto, KycListQueryDto } from './kyc.dto';
import { paginate } from '../../utils/pagination';

const kycRepo = () => AppDataSource.getRepository(KycDocument);
const userRepo = () => AppDataSource.getRepository(User);

export class KycService {
  async submit(userId: string, dto: SubmitKycDto, file: Express.Multer.File): Promise<KycDocument> {
    const existingPending = await kycRepo().findOne({
      where: { userId, status: KycStatus.PENDING },
    });
    if (existingPending) {
      throw ApiError.conflict('You already have a pending KYC submission. Please wait for it to be reviewed.');
    }

    const doc = kycRepo().create({
      userId,
      documentType: dto.documentType,
      documentUrl: `/uploads/${file.filename}`,
    });

    return kycRepo().save(doc);
  }

  async getMySubmissions(userId: string): Promise<KycDocument[]> {
    return kycRepo().find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  // ─── Admin methods ─────────────────────────

  async getAllSubmissions(query: KycListQueryDto): Promise<PaginatedResponse<KycDocument>> {
    const qb = kycRepo()
      .createQueryBuilder('k')
      .leftJoinAndSelect('k.user', 'user');

    if (query.status) {
      qb.andWhere('k.status = :status', { status: query.status });
    }

    return paginate(qb, { ...query, sort: query.sort || 'createdAt', order: query.order || 'DESC' });
  }

  async getSubmissionById(id: string): Promise<KycDocument> {
    const doc = await kycRepo().findOne({
      where: { id },
      relations: ['user', 'reviewedByAdmin'],
    });
    if (!doc) throw ApiError.notFound('KYC submission not found');
    return doc;
  }

  async approve(id: string, adminId: string): Promise<KycDocument> {
    const doc = await kycRepo().findOne({ where: { id } });
    if (!doc) throw ApiError.notFound('KYC submission not found');

    if (doc.status !== KycStatus.PENDING) {
      throw ApiError.badRequest('This submission has already been reviewed');
    }

    doc.status = KycStatus.APPROVED;
    doc.reviewedByAdminId = adminId;
    doc.reviewedAt = new Date();
    doc.rejectionReason = undefined;
    await kycRepo().save(doc);

    // Mark user as identity verified
    await userRepo().update(doc.userId, { identityVerified: true });

    return doc;
  }

  async reject(id: string, adminId: string, reason: string): Promise<KycDocument> {
    const doc = await kycRepo().findOne({ where: { id } });
    if (!doc) throw ApiError.notFound('KYC submission not found');

    if (doc.status !== KycStatus.PENDING) {
      throw ApiError.badRequest('This submission has already been reviewed');
    }

    doc.status = KycStatus.REJECTED;
    doc.rejectionReason = reason;
    doc.reviewedByAdminId = adminId;
    doc.reviewedAt = new Date();
    await kycRepo().save(doc);

    return doc;
  }
}
