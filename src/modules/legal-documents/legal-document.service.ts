import { AppDataSource } from '../../config/data-source';
import { LegalDocumentTemplate } from './legal-document-template.entity';
import { LegalDocument } from './legal-document.entity';
import { Invoice } from '../invoices/invoice.entity';
import { ApiError } from '../../utils/api-error';
import { InvoiceStatus, LegalDocumentStatus, PaginatedResponse, PaginationQuery } from '../../types';
import { paginate } from '../../utils/pagination';
import { AssignLegalDocumentDto, CreateTemplateDto } from './legal-document.dto';

const templateRepo = () => AppDataSource.getRepository(LegalDocumentTemplate);
const documentRepo = () => AppDataSource.getRepository(LegalDocument);
const invoiceRepo = () => AppDataSource.getRepository(Invoice);

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
      .leftJoinAndSelect('ld.invoice', 'invoice')
      .leftJoinAndSelect('invoice.property', 'property')
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
      relations: ['tenant', 'invoice', 'invoice.property', 'assignedByAdmin', 'template'],
    });
    if (!doc) throw ApiError.notFound('Legal document not found');
    return doc;
  }

  async assignDocument(adminId: string, dto: AssignLegalDocumentDto, file?: Express.Multer.File): Promise<LegalDocument> {
    const invoice = await invoiceRepo().findOne({ where: { id: dto.invoiceId } });
    if (!invoice) throw ApiError.notFound('Invoice not found');
    if (invoice.status !== InvoiceStatus.COMPLETED) {
      throw ApiError.badRequest('Can only assign documents to completed invoices');
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
      invoiceId: dto.invoiceId,
      tenantId: invoice.tenantId,
      title: dto.title,
      description: dto.description,
      documentUrl,
      templateId: dto.templateId || undefined,
      assignedByAdminId: adminId,
      status: LegalDocumentStatus.PENDING,
    });

    return documentRepo().save(doc);
  }

  async deleteDocument(id: string): Promise<void> {
    const doc = await documentRepo().findOne({ where: { id } });
    if (!doc) throw ApiError.notFound('Legal document not found');
    await documentRepo().remove(doc);
  }

  async getActiveInvoices(): Promise<Invoice[]> {
    return invoiceRepo().find({
      where: { status: InvoiceStatus.COMPLETED },
      relations: ['tenant', 'property'],
      order: { createdAt: 'DESC' },
    });
  }

  // ═══ TENANT-FACING ═══════════════════════════

  async getMyDocuments(tenantId: string, query: PaginationQuery): Promise<PaginatedResponse<LegalDocument>> {
    const qb = documentRepo()
      .createQueryBuilder('ld')
      .leftJoinAndSelect('ld.invoice', 'invoice')
      .leftJoinAndSelect('invoice.property', 'property')
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
    return documentRepo().save(doc);
  }
}
