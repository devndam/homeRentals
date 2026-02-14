import { Request, Response } from 'express';
import { PropertyService } from './property.service';
import { sendSuccess, sendCreated, sendPaginated, sendNoContent } from '../../utils/response';
import { AuthenticatedRequest } from '../../types';

const propertyService = new PropertyService();

export class PropertyController {
  async create(req: AuthenticatedRequest, res: Response) {
    const property = await propertyService.create(req.user.sub, req.body);
    return sendCreated(res, property, 'Property created and pending review');
  }

  async findAll(req: Request, res: Response) {
    const result = await propertyService.findAll(req.query as any);
    return sendPaginated(res, result);
  }

  async findById(req: Request, res: Response) {
    const property = await propertyService.findById(req.params.id as string);
    return sendSuccess(res, property);
  }

  async findMyListings(req: AuthenticatedRequest, res: Response) {
    const result = await propertyService.findByLandlord(req.user.sub, req.query as any);
    return sendPaginated(res, result, 'My listings');
  }

  async update(req: AuthenticatedRequest, res: Response) {
    const property = await propertyService.update(req.params.id, req.user.sub, req.body);
    return sendSuccess(res, property, 'Property updated');
  }

  async delete(req: AuthenticatedRequest, res: Response) {
    await propertyService.delete(req.params.id, req.user.sub);
    return sendNoContent(res);
  }

  async uploadImages(req: AuthenticatedRequest, res: Response) {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return sendSuccess(res, [], 'No files uploaded');
    }
    const images = await propertyService.addImages(req.params.id, req.user.sub, files);
    return sendCreated(res, images, 'Images uploaded');
  }

  async deleteImage(req: AuthenticatedRequest, res: Response) {
    await propertyService.deleteImage(req.params.imageId, req.user.sub);
    return sendNoContent(res);
  }

  async toggleFavorite(req: AuthenticatedRequest, res: Response) {
    const result = await propertyService.toggleFavorite(req.user.sub, req.params.id);
    return sendSuccess(res, result);
  }

  async getFavorites(req: AuthenticatedRequest, res: Response) {
    const result = await propertyService.getFavorites(req.user.sub, req.query as any);
    return sendPaginated(res, result);
  }
}
