import { Request, Response, NextFunction } from 'express';
import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { ApiError } from '../utils/api-error';

/**
 * Validates request body against a DTO class using class-validator decorators.
 */
export function validateBody(DtoClass: any) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const instance = plainToInstance(DtoClass, req.body);
    const errors = await validate(instance as object, {
      whitelist: true,
      forbidNonWhitelisted: true,
      skipMissingProperties: false,
    });

    if (errors.length > 0) {
      const formatted = formatErrors(errors);
      throw ApiError.badRequest('Validation failed', formatted);
    }

    req.body = instance;
    next();
  };
}

/**
 * Validates query parameters against a DTO class.
 */
export function validateQuery(DtoClass: any) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const instance = plainToInstance(DtoClass, req.query);
    const errors = await validate(instance as object, {
      whitelist: true,
      skipMissingProperties: true,
    });

    if (errors.length > 0) {
      const formatted = formatErrors(errors);
      throw ApiError.badRequest('Invalid query parameters', formatted);
    }

    req.query = instance as any;
    next();
  };
}

function formatErrors(errors: ValidationError[]): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const err of errors) {
    if (err.constraints) {
      result[err.property] = Object.values(err.constraints);
    }
    if (err.children && err.children.length > 0) {
      const nested = formatErrors(err.children);
      for (const [key, val] of Object.entries(nested)) {
        result[`${err.property}.${key}`] = val;
      }
    }
  }
  return result;
}
