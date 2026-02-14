import { ObjectLiteral, SelectQueryBuilder } from 'typeorm';
import { PaginatedResponse, PaginationQuery } from '../types';

export async function paginate<T extends ObjectLiteral>(
  qb: SelectQueryBuilder<T>,
  query: PaginationQuery,
): Promise<PaginatedResponse<T>> {
  const page = Math.max(1, query.page || 1);
  const limit = Math.min(100, Math.max(1, query.limit || 20));
  const offset = (page - 1) * limit;

  if (query.sort) {
    const order = query.order === 'DESC' ? 'DESC' : 'ASC';
    qb.orderBy(`${qb.alias}.${query.sort}`, order);
  }

  const [data, total] = await qb.skip(offset).take(limit).getManyAndCount();

  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}
