import { Response } from 'express';
import { BookingService } from './booking.service';
import { sendSuccess, sendCreated, sendPaginated } from '../../utils/response';
import { AuthenticatedRequest } from '../../types';

const bookingService = new BookingService();

export class BookingController {
  async create(req: AuthenticatedRequest, res: Response) {
    const booking = await bookingService.create(req.user.sub, req.body);
    return sendCreated(res, booking, 'Inspection requested');
  }

  async getTenantBookings(req: AuthenticatedRequest, res: Response) {
    const result = await bookingService.getTenantBookings(req.user.sub, req.query as any);
    return sendPaginated(res, result);
  }

  async getLandlordBookings(req: AuthenticatedRequest, res: Response) {
    const result = await bookingService.getLandlordBookings(req.user.sub, req.query as any);
    return sendPaginated(res, result);
  }

  async respond(req: AuthenticatedRequest, res: Response) {
    const booking = await bookingService.respond(req.params.id, req.user.sub, req.body);
    return sendSuccess(res, booking, `Booking ${booking.status}`);
  }

  async complete(req: AuthenticatedRequest, res: Response) {
    const booking = await bookingService.complete(req.params.id, req.user.sub, req.body);
    return sendSuccess(res, booking, 'Booking completed');
  }

  async cancel(req: AuthenticatedRequest, res: Response) {
    const booking = await bookingService.cancel(req.params.id, req.user.sub);
    return sendSuccess(res, booking, 'Booking cancelled');
  }

  async findById(req: AuthenticatedRequest, res: Response) {
    const booking = await bookingService.findById(req.params.id);
    return sendSuccess(res, booking);
  }
}
