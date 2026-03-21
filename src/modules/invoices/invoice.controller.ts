import { Response } from 'express';
import { InvoiceService } from './invoice.service';
import { sendSuccess, sendCreated, sendPaginated } from '../../utils/response';
import { AuthenticatedRequest } from '../../types';

const invoiceService = new InvoiceService();

export class InvoiceController {
  async requestInvoice(req: AuthenticatedRequest, res: Response) {
    const invoice = await invoiceService.requestInvoice(req.user.sub, req.body);
    return sendCreated(res, invoice, 'Invoice requested');
  }

  async create(req: AuthenticatedRequest, res: Response) {
    const invoice = await invoiceService.createInvoice(req.effectiveOwnerId!, req.body);
    return sendCreated(res, invoice, 'Invoice created');
  }

  async sendInvoice(req: AuthenticatedRequest, res: Response) {
    const invoice = await invoiceService.sendInvoice(req.params.id, req.effectiveOwnerId!);
    return sendSuccess(res, invoice, 'Invoice sent to tenant');
  }

  async signAsTenant(req: AuthenticatedRequest, res: Response) {
    const invoice = await invoiceService.signAsTenant(req.params.id, req.user.sub, req.body);
    return sendSuccess(res, invoice, 'Agreement signed');
  }

  async cancel(req: AuthenticatedRequest, res: Response) {
    const invoice = await invoiceService.cancel(req.params.id, req.user.sub);
    return sendSuccess(res, invoice, 'Invoice cancelled');
  }

  async terminate(req: AuthenticatedRequest, res: Response) {
    const invoice = await invoiceService.terminate(req.params.id, req.effectiveOwnerId!);
    return sendSuccess(res, invoice, 'Rental terminated');
  }

  async findById(req: AuthenticatedRequest, res: Response) {
    const invoice = await invoiceService.findById(req.params.id, req.user.sub);
    return sendSuccess(res, invoice);
  }

  async getMyInvoices(req: AuthenticatedRequest, res: Response) {
    const result = await invoiceService.getUserInvoices(req.user.sub, req.query as any);
    return sendPaginated(res, result);
  }
}
