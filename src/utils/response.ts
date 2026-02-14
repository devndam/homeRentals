import { Response } from 'express';
import { ApiResponse, PaginatedResponse } from '../types';

export function sendSuccess<T>(res: Response, data: T, message = 'Success', statusCode = 200) {
  const response: ApiResponse<T> = { success: true, message, data };
  return res.status(statusCode).json(response);
}

export function sendCreated<T>(res: Response, data: T, message = 'Created successfully') {
  return sendSuccess(res, data, message, 201);
}

export function sendPaginated<T>(res: Response, result: PaginatedResponse<T>, message = 'Success') {
  return res.status(200).json({ success: true, message, ...result });
}

export function sendError(res: Response, statusCode: number, message: string, errors?: Record<string, string[]>) {
  const response: ApiResponse = { success: false, message, errors };
  return res.status(statusCode).json(response);
}

export function sendNoContent(res: Response) {
  return res.status(204).send();
}
