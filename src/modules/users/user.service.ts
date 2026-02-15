import { AppDataSource } from '../../config/data-source';
import { User } from './user.entity';
import { ApiError } from '../../utils/api-error';
import { UserRole } from '../../types';
import { UpdateProfileDto, UpdateBankDetailsDto, UpdatePreferencesDto } from './user.dto';

const userRepo = () => AppDataSource.getRepository(User);

export class UserService {
  async getProfile(userId: string) {
    const user = await userRepo().findOne({ where: { id: userId } });
    if (!user) throw ApiError.notFound('User not found');
    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await userRepo().findOne({ where: { id: userId } });
    if (!user) throw ApiError.notFound('User not found');

    Object.assign(user, dto);
    await userRepo().save(user);
    return user;
  }

  async updateBankDetails(userId: string, dto: UpdateBankDetailsDto) {
    const user = await userRepo().findOne({ where: { id: userId } });
    if (!user) throw ApiError.notFound('User not found');

    user.bankName = dto.bankName;
    user.bankAccountNumber = dto.bankAccountNumber;
    user.bankAccountName = dto.bankAccountName;
    await userRepo().save(user);
    return user;
  }

  async updatePreferences(userId: string, dto: UpdatePreferencesDto) {
    const user = await userRepo().findOne({ where: { id: userId } });
    if (!user) throw ApiError.notFound('User not found');

    user.preferences = {
      ...user.preferences,
      ...dto,
    };
    await userRepo().save(user);
    return user;
  }

  async getOwnerPublicProfile(ownerId: string) {
    const user = await userRepo().findOne({
      where: { id: ownerId, role: UserRole.PROPERTY_OWNER },
      select: ['id', 'firstName', 'lastName', 'avatarUrl', 'createdAt', 'identityVerified'],
    });
    if (!user) throw ApiError.notFound('Property owner not found');
    return user;
  }
}