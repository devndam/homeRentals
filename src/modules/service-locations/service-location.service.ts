import { AppDataSource } from '../../config/data-source';
import { ServiceLocation } from './service-location.entity';
import { CreateServiceLocationDto, UpdateServiceLocationDto, ServiceLocationFilterDto } from './service-location.dto';
import { ApiError } from '../../utils/api-error';
import { PaginatedResponse } from '../../types';
import { paginate } from '../../utils/pagination';

const repo = () => AppDataSource.getRepository(ServiceLocation);

export class ServiceLocationService {
  async create(dto: CreateServiceLocationDto): Promise<ServiceLocation> {
    const existing = await repo().findOne({
      where: {
        city: dto.city.trim(),
        state: dto.state.trim(),
        country: dto.country?.trim() || 'Nigeria',
      },
    });
    if (existing) throw ApiError.conflict('This service location already exists');

    const location = repo().create({
      city: dto.city.trim(),
      state: dto.state.trim(),
      country: dto.country?.trim() || 'Nigeria',
    });
    return repo().save(location);
  }

  async findAll(filters: ServiceLocationFilterDto): Promise<PaginatedResponse<ServiceLocation>> {
    const qb = repo().createQueryBuilder('sl');

    if (filters.search) {
      qb.where(
        '(sl.city ILIKE :search OR sl.state ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    if (filters.isActive !== undefined) {
      qb.andWhere('sl.isActive = :isActive', { isActive: filters.isActive });
    }

    return paginate(qb, {
      page: filters.page,
      limit: filters.limit,
      sort: 'city',
      order: 'ASC',
    });
  }

  async getActiveLocations(): Promise<ServiceLocation[]> {
    return repo().find({
      where: { isActive: true },
      order: { state: 'ASC', city: 'ASC' },
    });
  }

  async findById(id: string): Promise<ServiceLocation> {
    const location = await repo().findOne({ where: { id } });
    if (!location) throw ApiError.notFound('Service location not found');
    return location;
  }

  async update(id: string, dto: UpdateServiceLocationDto): Promise<ServiceLocation> {
    const location = await this.findById(id);
    Object.assign(location, dto);
    return repo().save(location);
  }

  async delete(id: string): Promise<void> {
    const location = await this.findById(id);
    await repo().remove(location);
  }

  async isCityInServiceArea(city: string, state: string): Promise<boolean> {
    const activeCount = await repo().count({ where: { isActive: true } });
    // If no service locations are configured, allow all cities
    if (activeCount === 0) return true;

    const match = await repo()
      .createQueryBuilder('sl')
      .where('sl.isActive = true')
      .andWhere('sl.city ILIKE :city', { city: city.trim() })
      .andWhere('sl.state ILIKE :state', { state: state.trim() })
      .getOne();

    return !!match;
  }
}
