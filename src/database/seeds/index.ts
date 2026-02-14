import 'reflect-metadata';
import bcrypt from 'bcryptjs';
import { AppDataSource } from '../../config/data-source';
import { User } from '../../modules/users/user.entity';
import { UserRole } from '../../types';

async function seed() {
  await AppDataSource.initialize();
  console.log('[Seed] Database connected');

  const userRepo = AppDataSource.getRepository(User);

  // Create admin user
  const adminExists = await userRepo.findOne({ where: { email: 'admin@rentals.ng' } });
  if (!adminExists) {
    const admin = userRepo.create({
      firstName: 'Platform',
      lastName: 'Admin',
      email: 'admin@rentals.ng',
      phone: '+2340000000000',
      password: await bcrypt.hash('Admin@123456', 12),
      role: UserRole.ADMIN,
      isSuperAdmin: true,
      permissions: [],
      emailVerified: true,
      phoneVerified: true,
      identityVerified: true,
    });
    await userRepo.save(admin);
    console.log('[Seed] Super Admin created: admin@rentals.ng / Admin@123456');
  }

  // Create sample landlord
  const landlordExists = await userRepo.findOne({ where: { email: 'landlord@test.com' } });
  if (!landlordExists) {
    const landlord = userRepo.create({
      firstName: 'Chinedu',
      lastName: 'Okafor',
      email: 'landlord@test.com',
      phone: '+2348011111111',
      password: await bcrypt.hash('Password@123', 12),
      role: UserRole.LANDLORD,
      emailVerified: true,
    });
    await userRepo.save(landlord);
    console.log('[Seed] Landlord created: landlord@test.com / Password@123');
  }

  // Create sample tenant
  const tenantExists = await userRepo.findOne({ where: { email: 'tenant@test.com' } });
  if (!tenantExists) {
    const tenant = userRepo.create({
      firstName: 'Amina',
      lastName: 'Mohammed',
      email: 'tenant@test.com',
      phone: '+2348022222222',
      password: await bcrypt.hash('Password@123', 12),
      role: UserRole.TENANT,
      emailVerified: true,
    });
    await userRepo.save(tenant);
    console.log('[Seed] Tenant created: tenant@test.com / Password@123');
  }

  console.log('[Seed] Done');
  await AppDataSource.destroy();
}

seed().catch((err) => {
  console.error('[Seed] Error:', err);
  process.exit(1);
});
