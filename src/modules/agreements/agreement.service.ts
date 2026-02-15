import { AppDataSource } from '../../config/data-source';
import { Agreement } from './agreement.entity';
import { Property } from '../properties/property.entity';
import { User } from '../users/user.entity';
import { ApiError } from '../../utils/api-error';
import { AgreementStatus, PaginatedResponse, PaginationQuery, UserRole } from '../../types';
import { CreateAgreementDto, SignAgreementDto } from './agreement.dto';
import { paginate } from '../../utils/pagination';
import { generateAgreementPdf } from './pdf-generator';

const agreementRepo = () => AppDataSource.getRepository(Agreement);
const propertyRepo = () => AppDataSource.getRepository(Property);
const userRepo = () => AppDataSource.getRepository(User);

export class AgreementService {
  async create(ownerId: string, dto: CreateAgreementDto): Promise<Agreement> {
    // Verify property belongs to owner
    const property = await propertyRepo().findOne({
      where: { id: dto.propertyId, ownerId },
    });
    if (!property) throw ApiError.notFound('Property not found or not owned by you');

    // Verify tenant exists
    const tenant = await userRepo().findOne({
      where: { id: dto.tenantId, role: UserRole.TENANT },
    });
    if (!tenant) throw ApiError.notFound('Tenant not found');

    const agreement = agreementRepo().create({
      ownerId,
      tenantId: dto.tenantId,
      propertyId: dto.propertyId,
      rentAmount: dto.rentAmount,
      rentPeriod: dto.rentPeriod || 'yearly',
      cautionDeposit: dto.cautionDeposit,
      startDate: dto.startDate,
      endDate: dto.endDate,
      additionalTerms: dto.additionalTerms,
      status: AgreementStatus.PENDING_TENANT,
    });

    return agreementRepo().save(agreement);
  }

  async findById(id: string, userId: string): Promise<Agreement> {
    const agreement = await agreementRepo().findOne({
      where: { id },
      relations: ['tenant', 'owner', 'property'],
    });

    if (!agreement) throw ApiError.notFound('Agreement not found');

    // Only parties to the agreement can view it
    if (agreement.tenantId !== userId && agreement.ownerId !== userId) {
      throw ApiError.forbidden('You are not authorized to view this agreement');
    }

    return agreement;
  }

  async getUserAgreements(userId: string, role: UserRole, query: PaginationQuery): Promise<PaginatedResponse<Agreement>> {
    const qb = agreementRepo()
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.property', 'p')
      .leftJoinAndSelect('a.tenant', 'tenant')
      .leftJoinAndSelect('a.owner', 'owner');

    if (role === UserRole.TENANT) {
      qb.where('a.tenantId = :userId', { userId });
    } else {
      qb.where('a.ownerId = :userId', { userId });
    }

    return paginate(qb, { ...query, sort: query.sort || 'createdAt', order: query.order || 'DESC' });
  }

  async signAsTenant(agreementId: string, tenantId: string, dto: SignAgreementDto): Promise<Agreement> {
    const agreement = await agreementRepo().findOne({
      where: { id: agreementId, tenantId, status: AgreementStatus.PENDING_TENANT },
    });

    if (!agreement) throw ApiError.notFound('Agreement not found or not pending your signature');

    agreement.tenantSignature = dto.signature;
    agreement.tenantSignedAt = new Date();
    agreement.status = AgreementStatus.PENDING_OWNER;

    return agreementRepo().save(agreement);
  }

  async signAsOwner(agreementId: string, ownerId: string, dto: SignAgreementDto): Promise<Agreement> {
    const agreement = await agreementRepo().findOne({
      where: { id: agreementId, ownerId, status: AgreementStatus.PENDING_OWNER },
      relations: ['tenant', 'owner', 'property'],
    });

    if (!agreement) throw ApiError.notFound('Agreement not found or not pending your signature');

    agreement.ownerSignature = dto.signature;
    agreement.ownerSignedAt = new Date();
    agreement.status = AgreementStatus.ACTIVE;

    // Generate PDF
    try {
      const pdfPath = await generateAgreementPdf(agreement);
      agreement.pdfUrl = pdfPath;
    } catch (err) {
      console.error('[Agreement] PDF generation failed:', err);
    }

    return agreementRepo().save(agreement);
  }

  async terminate(agreementId: string, ownerId: string): Promise<Agreement> {
    const agreement = await agreementRepo().findOne({
      where: { id: agreementId, ownerId },
    });

    if (!agreement) throw ApiError.notFound('Agreement not found');
    if (agreement.status !== AgreementStatus.ACTIVE) {
      throw ApiError.badRequest('Only active agreements can be terminated');
    }

    agreement.status = AgreementStatus.TERMINATED;
    return agreementRepo().save(agreement);
  }
}