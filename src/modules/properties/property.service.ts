import { AppDataSource } from '../../config/data-source';
import { Property } from './property.entity';
import { PropertyImage } from './property-image.entity';
import { Favorite } from './favorite.entity';
import { User } from '../users/user.entity';
import { ApiError } from '../../utils/api-error';
import { PaginatedResponse, PropertyStatus, UserRole } from '../../types';
import { CreatePropertyDto, UpdatePropertyDto, PropertyFilterDto } from './property.dto';
import { paginate } from '../../utils/pagination';

const propertyRepo = () => AppDataSource.getRepository(Property);
const imageRepo = () => AppDataSource.getRepository(PropertyImage);
const favoriteRepo = () => AppDataSource.getRepository(Favorite);
const userRepo = () => AppDataSource.getRepository(User);

export class PropertyService {
  async create(ownerId: string, dto: CreatePropertyDto): Promise<Property> {
    const property = propertyRepo().create({
      ...dto,
      ownerId,
      status: PropertyStatus.PENDING_REVIEW,
    });
    return propertyRepo().save(property);
  }

  async findAll(filters: PropertyFilterDto): Promise<PaginatedResponse<Property>> {
    const qb = propertyRepo()
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.images', 'img')
      .where('p.status = :status', { status: PropertyStatus.ACTIVE });

    if (filters.search) {
      qb.andWhere(
        '(p.title ILIKE :search OR p.description ILIKE :search OR p.address ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    if (filters.type) qb.andWhere('p.type = :type', { type: filters.type });
    if (filters.city) qb.andWhere('p.city ILIKE :city', { city: `%${filters.city}%` });
    if (filters.state) qb.andWhere('p.state ILIKE :state', { state: `%${filters.state}%` });
    if (filters.minPrice) qb.andWhere('p.price >= :minPrice', { minPrice: filters.minPrice });
    if (filters.maxPrice) qb.andWhere('p.price <= :maxPrice', { maxPrice: filters.maxPrice });
    if (filters.bedrooms) qb.andWhere('p.bedrooms >= :bedrooms', { bedrooms: filters.bedrooms });
    if (filters.bathrooms) qb.andWhere('p.bathrooms >= :bathrooms', { bathrooms: filters.bathrooms });
    if (filters.isFurnished !== undefined) qb.andWhere('p.isFurnished = :furnished', { furnished: filters.isFurnished });
    if (filters.isPetFriendly !== undefined) qb.andWhere('p.isPetFriendly = :pet', { pet: filters.isPetFriendly });

    return paginate(qb, {
      page: filters.page,
      limit: filters.limit,
      sort: filters.sort || 'createdAt',
      order: filters.order || 'DESC',
    });
  }

  async findById(id: string): Promise<Property> {
    const property = await propertyRepo().findOne({
      where: { id },
      relations: ['images', 'owner', 'agent'],
    });
    if (!property) throw ApiError.notFound('Property not found');

    await propertyRepo().increment({ id }, 'viewCount', 1);

    return property;
  }

  async findByOwner(ownerId: string, filters: PropertyFilterDto): Promise<PaginatedResponse<Property>> {
    const qb = propertyRepo()
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.images', 'img')
      .leftJoinAndSelect('p.agent', 'agent')
      .where('p.ownerId = :ownerId', { ownerId });

    return paginate(qb, {
      page: filters.page,
      limit: filters.limit,
      sort: filters.sort || 'createdAt',
      order: filters.order || 'DESC',
    });
  }

  async update(id: string, ownerId: string, dto: UpdatePropertyDto): Promise<Property> {
    const property = await propertyRepo().findOne({ where: { id, ownerId } });
    if (!property) throw ApiError.notFound('Property not found');

    Object.assign(property, dto);
    return propertyRepo().save(property);
  }

  async delete(id: string, ownerId: string): Promise<void> {
    const property = await propertyRepo().findOne({ where: { id, ownerId } });
    if (!property) throw ApiError.notFound('Property not found');

    await propertyRepo().remove(property);
  }

  // ─── Agent Assignment ─────────────────────────

  async assignAgent(propertyId: string, ownerId: string, agentId: string): Promise<Property> {
    const property = await propertyRepo().findOne({ where: { id: propertyId, ownerId } });
    if (!property) throw ApiError.notFound('Property not found');

    const agent = await userRepo().findOne({
      where: { id: agentId, role: UserRole.AGENT, addedByOwnerId: ownerId },
    });
    if (!agent) throw ApiError.notFound('Agent not found or not your agent');

    property.agentId = agentId;
    return propertyRepo().save(property);
  }

  async removeAgent(propertyId: string, ownerId: string): Promise<Property> {
    const property = await propertyRepo().findOne({ where: { id: propertyId, ownerId } });
    if (!property) throw ApiError.notFound('Property not found');

    property.agentId = undefined;
    return propertyRepo().save(property);
  }

  // ─── Images ─────────────────────────────────

  async addImages(propertyId: string, ownerId: string, files: Express.Multer.File[]): Promise<PropertyImage[]> {
    const property = await propertyRepo().findOne({ where: { id: propertyId, ownerId } });
    if (!property) throw ApiError.notFound('Property not found');

    const existingCount = await imageRepo().count({ where: { propertyId } });
    const hasNoPrimary = existingCount === 0;

    const images = files.map((file, i) =>
      imageRepo().create({
        propertyId,
        url: `/uploads/${file.filename}`,
        mediaType: file.mimetype.startsWith('video') ? 'video' : 'image',
        isPrimary: hasNoPrimary && i === 0,
        sortOrder: existingCount + i,
      }),
    );

    return imageRepo().save(images);
  }

  async deleteImage(imageId: string, ownerId: string): Promise<void> {
    const image = await imageRepo()
      .createQueryBuilder('img')
      .innerJoin('img.property', 'p')
      .where('img.id = :imageId', { imageId })
      .andWhere('p.ownerId = :ownerId', { ownerId })
      .getOne();

    if (!image) throw ApiError.notFound('Image not found');
    await imageRepo().remove(image);
  }

  // ─── Favorites ──────────────────────────────

  async toggleFavorite(userId: string, propertyId: string): Promise<{ favorited: boolean }> {
    const existing = await favoriteRepo().findOne({ where: { userId, propertyId } });

    if (existing) {
      await favoriteRepo().remove(existing);
      return { favorited: false };
    }

    const property = await propertyRepo().findOne({ where: { id: propertyId } });
    if (!property) throw ApiError.notFound('Property not found');

    const favorite = favoriteRepo().create({ userId, propertyId });
    await favoriteRepo().save(favorite);
    return { favorited: true };
  }

  async getFavorites(userId: string, filters: PropertyFilterDto): Promise<PaginatedResponse<Property>> {
    const qb = propertyRepo()
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.images', 'img')
      .innerJoin('favorites', 'f', 'f.propertyId = p.id')
      .where('f.userId = :userId', { userId });

    return paginate(qb, {
      page: filters.page,
      limit: filters.limit,
      sort: 'createdAt',
      order: 'DESC',
    });
  }
}