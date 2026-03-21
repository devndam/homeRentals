import { In } from 'typeorm';
import { AppDataSource } from '../../config/data-source';
import { LegalDocumentTemplate } from './legal-document-template.entity';
import { LegalDocument } from './legal-document.entity';
import { Rent } from '../rents/rent.entity';
import { ApiError } from '../../utils/api-error';
import { RentStatus, LegalDocumentStatus, NotificationType, PaginatedResponse, PaginationQuery } from '../../types';
import { paginate } from '../../utils/pagination';
import { AssignLegalDocumentDto, CreateTemplateDto } from './legal-document.dto';
import { NotificationService } from '../notifications/notification.service';

const templateRepo = () => AppDataSource.getRepository(LegalDocumentTemplate);
const documentRepo = () => AppDataSource.getRepository(LegalDocument);
const rentRepo = () => AppDataSource.getRepository(Rent);
const notificationService = new NotificationService();

export class LegalDocumentService {

  // ═══ TEMPLATES ═══════════════════════════════

  async listTemplates(): Promise<LegalDocumentTemplate[]> {
    return templateRepo().find({
      order: { createdAt: 'DESC' },
      relations: ['createdByAdmin'],
    });
  }

  async createTemplate(adminId: string, dto: CreateTemplateDto, file: Express.Multer.File): Promise<LegalDocumentTemplate> {
    const template = templateRepo().create({
      name: dto.name,
      description: dto.description,
      fileUrl: `/uploads/${file.filename}`,
      createdByAdminId: adminId,
    });
    return templateRepo().save(template);
  }

  async deleteTemplate(id: string): Promise<void> {
    const template = await templateRepo().findOne({ where: { id } });
    if (!template) throw ApiError.notFound('Template not found');
    await templateRepo().remove(template);
  }

  // ═══ ASSIGNED DOCUMENTS (admin) ══════════════

  async listDocuments(query: PaginationQuery & { status?: string; search?: string }): Promise<PaginatedResponse<LegalDocument>> {
    const qb = documentRepo()
      .createQueryBuilder('ld')
      .leftJoinAndSelect('ld.tenant', 'tenant')
      .leftJoinAndSelect('ld.rent', 'rent')
      .leftJoinAndSelect('rent.property', 'property')
      .leftJoinAndSelect('ld.assignedByAdmin', 'admin');

    if (query.status) {
      qb.andWhere('ld.status = :status', { status: query.status });
    }
    if (query.search) {
      qb.andWhere(
        '(tenant.firstName ILIKE :s OR tenant.lastName ILIKE :s OR ld.title ILIKE :s OR property.title ILIKE :s)',
        { s: `%${query.search}%` },
      );
    }

    return paginate(qb, {
      ...query,
      sort: query.sort || 'createdAt',
      order: query.order || 'DESC',
    });
  }

  async getDocumentById(id: string): Promise<LegalDocument> {
    const doc = await documentRepo().findOne({
      where: { id },
      relations: ['tenant', 'rent', 'rent.property', 'assignedByAdmin', 'template'],
    });
    if (!doc) throw ApiError.notFound('Legal document not found');
    return doc;
  }

  async assignDocument(adminId: string, dto: AssignLegalDocumentDto, file?: Express.Multer.File): Promise<LegalDocument> {
    const rent = await rentRepo().findOne({ where: { id: dto.rentId } });
    if (!rent) throw ApiError.notFound('Rent not found');
    if (![RentStatus.ACTIVE, RentStatus.DUE, RentStatus.OVERDUE].includes(rent.status)) {
      throw ApiError.badRequest('Can only assign documents to active rents');
    }

    let documentUrl: string;

    if (dto.templateId) {
      const template = await templateRepo().findOne({ where: { id: dto.templateId } });
      if (!template) throw ApiError.notFound('Template not found');
      documentUrl = template.fileUrl;
    } else if (file) {
      documentUrl = `/uploads/${file.filename}`;
    } else {
      throw ApiError.badRequest('Either a template or a PDF file must be provided');
    }

    const doc = documentRepo().create({
      rentId: dto.rentId,
      tenantId: rent.tenantId,
      title: dto.title,
      description: dto.description,
      documentUrl,
      templateId: dto.templateId || undefined,
      assignedByAdminId: adminId,
      status: LegalDocumentStatus.PENDING,
    });

    const saved = await documentRepo().save(doc);

    try {
      await notificationService.create({
        userId: rent.tenantId,
        type: NotificationType.LEGAL_DOCUMENT,
        title: 'New Legal Document',
        message: 'A new legal document has been assigned to your rental',
        relatedEntityId: saved.id,
        relatedEntityType: 'legal_document',
      });
    } catch (err) { console.error('[Notification]', err); }

    return saved;
  }

  async deleteDocument(id: string): Promise<void> {
    const doc = await documentRepo().findOne({ where: { id } });
    if (!doc) throw ApiError.notFound('Legal document not found');
    await documentRepo().remove(doc);
  }

  async getActiveRents(): Promise<Rent[]> {
    return rentRepo().find({
      where: { status: In([RentStatus.ACTIVE, RentStatus.DUE, RentStatus.OVERDUE]) },
      relations: ['tenant', 'property'],
      order: { createdAt: 'DESC' },
    });
  }

  // ═══ TENANT-FACING ═══════════════════════════

  async getMyDocuments(tenantId: string, query: PaginationQuery): Promise<PaginatedResponse<LegalDocument>> {
    const qb = documentRepo()
      .createQueryBuilder('ld')
      .leftJoinAndSelect('ld.rent', 'rent')
      .leftJoinAndSelect('rent.property', 'property')
      .where('ld.tenantId = :tenantId', { tenantId });

    return paginate(qb, {
      ...query,
      sort: query.sort || 'createdAt',
      order: query.order || 'DESC',
    });
  }

  async acknowledge(id: string, tenantId: string): Promise<LegalDocument> {
    const doc = await documentRepo().findOne({ where: { id, tenantId } });
    if (!doc) throw ApiError.notFound('Legal document not found');

    if (doc.status === LegalDocumentStatus.ACKNOWLEDGED) {
      throw ApiError.badRequest('Document already acknowledged');
    }

    doc.status = LegalDocumentStatus.ACKNOWLEDGED;
    doc.acknowledgedAt = new Date();
    const saved = await documentRepo().save(doc);

    try {
      const rent = await rentRepo().findOne({ where: { id: doc.rentId } });
      if (rent) {
        await notificationService.create({
          userId: rent.ownerId,
          type: NotificationType.LEGAL_DOCUMENT,
          title: 'Document Acknowledged',
          message: 'Tenant acknowledged legal document',
          relatedEntityId: saved.id,
          relatedEntityType: 'legal_document',
        });
      }
    } catch (err) { console.error('[Notification]', err); }

    return saved;
  }
}
