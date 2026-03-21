import { Response } from 'express';
import { LegalDocumentService } from './legal-document.service';
import { sendSuccess, sendCreated, sendPaginated, sendNoContent } from '../../utils/response';
import { AuthenticatedRequest } from '../../types';

const service = new LegalDocumentService();

export class LegalDocumentController {

  // ─── Templates (admin) ─────────────────────

  async listTemplates(_req: AuthenticatedRequest, res: Response) {
    const templates = await service.listTemplates();
    return sendSuccess(res, templates);
  }

  async createTemplate(req: AuthenticatedRequest, res: Response) {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'PDF file is required' });
    }
    const template = await service.createTemplate(req.user.sub, req.body, req.file);
    return sendCreated(res, template, 'Template created');
  }

  async deleteTemplate(req: AuthenticatedRequest, res: Response) {
    await service.deleteTemplate(req.params.id);
    return sendNoContent(res);
  }

  // ─── Assigned Documents (admin) ─────────────

  async listDocuments(req: AuthenticatedRequest, res: Response) {
    const result = await service.listDocuments(req.query as any);
    return sendPaginated(res, result);
  }

  async getDocumentById(req: AuthenticatedRequest, res: Response) {
    const doc = await service.getDocumentById(req.params.id);
    return sendSuccess(res, doc);
  }

  async assignDocument(req: AuthenticatedRequest, res: Response) {
    const doc = await service.assignDocument(req.user.sub, req.body, req.file);
    return sendCreated(res, doc, 'Document assigned to tenant');
  }

  async deleteDocument(req: AuthenticatedRequest, res: Response) {
    await service.deleteDocument(req.params.id);
    return sendNoContent(res);
  }

  async getActiveRents(_req: AuthenticatedRequest, res: Response) {
    const rents = await service.getActiveRents();
    return sendSuccess(res, rents);
  }

  // ─── Tenant ────────────────────────────────

  async getMyDocuments(req: AuthenticatedRequest, res: Response) {
    const result = await service.getMyDocuments(req.user.sub, req.query as any);
    return sendPaginated(res, result);
  }

  async acknowledge(req: AuthenticatedRequest, res: Response) {
    const doc = await service.acknowledge(req.params.id, req.user.sub);
    return sendSuccess(res, doc, 'Document acknowledged');
  }
}
