import { env } from './env';

export const swaggerDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Rentals NG API',
    description: 'API for a rental property platform connecting property owners and tenants in Nigeria.',
    version: '1.0.0',
    contact: { email: 'dev@rentals.ng' },
  },
  servers: [
    { url: `http://localhost:${env.port}${env.apiPrefix}`, description: 'Development' },
  ],
  tags: [
    { name: 'Auth', description: 'Authentication & authorization' },
    { name: 'Users', description: 'User profiles & preferences' },
    { name: 'Properties', description: 'Property listings CRUD' },
    { name: 'Bookings', description: 'Inspection booking workflow' },
    { name: 'Agreements', description: 'Rental agreements & signing' },
    { name: 'Payments', description: 'Paystack payments & webhooks' },
    { name: 'Admin', description: 'Admin dashboard & moderation' },
    { name: 'Agents', description: 'Agent management by property owners' },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      // ─── Common ─────────────────────────────
      ApiResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          message: { type: 'string' },
          data: { type: 'object' },
        },
      },
      PaginationMeta: {
        type: 'object',
        properties: {
          total: { type: 'integer' },
          page: { type: 'integer' },
          limit: { type: 'integer' },
          totalPages: { type: 'integer' },
        },
      },
      ValidationError: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Validation failed' },
          errors: {
            type: 'object',
            additionalProperties: {
              type: 'array',
              items: { type: 'string' },
            },
            example: { email: ['email must be an email'] },
          },
        },
      },

      // ─── Auth ───────────────────────────────
      RegisterRequest: {
        type: 'object',
        required: ['firstName', 'lastName', 'email', 'phone', 'password'],
        properties: {
          firstName: { type: 'string', example: 'Chinedu' },
          lastName: { type: 'string', example: 'Okafor' },
          email: { type: 'string', format: 'email', example: 'chinedu@example.com' },
          phone: { type: 'string', example: '+2348012345678' },
          password: { type: 'string', minLength: 8, example: 'SecurePass123' },
          role: { type: 'string', enum: ['tenant', 'property_owner'], default: 'tenant' },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'tenant@test.com' },
          password: { type: 'string', example: 'Password@123' },
        },
      },
      AuthResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string' },
          data: {
            type: 'object',
            properties: {
              user: { $ref: '#/components/schemas/UserSummary' },
              accessToken: { type: 'string' },
              refreshToken: { type: 'string' },
            },
          },
        },
      },
      RefreshTokenRequest: {
        type: 'object',
        required: ['refreshToken'],
        properties: {
          refreshToken: { type: 'string' },
        },
      },
      ForgotPasswordRequest: {
        type: 'object',
        required: ['email'],
        properties: {
          email: { type: 'string', format: 'email' },
        },
      },
      ResetPasswordRequest: {
        type: 'object',
        required: ['token', 'newPassword'],
        properties: {
          token: { type: 'string' },
          newPassword: { type: 'string', minLength: 8 },
        },
      },
      ChangePasswordRequest: {
        type: 'object',
        required: ['currentPassword', 'newPassword'],
        properties: {
          currentPassword: { type: 'string' },
          newPassword: { type: 'string', minLength: 8 },
        },
      },

      // ─── User ───────────────────────────────
      UserSummary: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          email: { type: 'string' },
          phone: { type: 'string' },
          role: { type: 'string', enum: ['tenant', 'property_owner', 'agent', 'admin'] },
          avatarUrl: { type: 'string', nullable: true },
          emailVerified: { type: 'boolean' },
          identityVerified: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      UpdateProfileRequest: {
        type: 'object',
        properties: {
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          phone: { type: 'string' },
          avatarUrl: { type: 'string' },
        },
      },
      UpdateBankDetailsRequest: {
        type: 'object',
        required: ['bankName', 'bankAccountNumber', 'bankAccountName'],
        properties: {
          bankName: { type: 'string', example: 'GTBank' },
          bankAccountNumber: { type: 'string', example: '0123456789' },
          bankAccountName: { type: 'string', example: 'Chinedu Okafor' },
        },
      },
      UpdatePreferencesRequest: {
        type: 'object',
        properties: {
          budgetMin: { type: 'number', example: 200000 },
          budgetMax: { type: 'number', example: 1000000 },
          preferredLocations: { type: 'array', items: { type: 'string' }, example: ['Lekki', 'VI'] },
          propertyTypes: { type: 'array', items: { type: 'string' }, example: ['apartment', 'flat'] },
        },
      },

      // ─── Property ──────────────────────────
      Property: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          title: { type: 'string' },
          description: { type: 'string' },
          type: { type: 'string', enum: ['apartment', 'house', 'duplex', 'flat', 'self_contain', 'room', 'shop', 'office', 'land'] },
          status: { type: 'string', enum: ['draft', 'pending_review', 'active', 'rented', 'suspended', 'archived'] },
          price: { type: 'number' },
          pricePeriod: { type: 'string', enum: ['yearly', 'monthly', 'daily'] },
          cautionFee: { type: 'number', nullable: true },
          agencyFee: { type: 'number', nullable: true },
          address: { type: 'string' },
          city: { type: 'string' },
          state: { type: 'string' },
          latitude: { type: 'number', nullable: true },
          longitude: { type: 'number', nullable: true },
          bedrooms: { type: 'integer', nullable: true },
          bathrooms: { type: 'integer', nullable: true },
          toilets: { type: 'integer', nullable: true },
          areaSqm: { type: 'number', nullable: true },
          amenities: { type: 'array', items: { type: 'string' } },
          isFurnished: { type: 'boolean' },
          isPetFriendly: { type: 'boolean' },
          viewCount: { type: 'integer' },
          images: { type: 'array', items: { $ref: '#/components/schemas/PropertyImage' } },
          ownerId: { type: 'string', format: 'uuid' },
          agentId: { type: 'string', format: 'uuid', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      PropertyImage: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          url: { type: 'string' },
          isPrimary: { type: 'boolean' },
          mediaType: { type: 'string', enum: ['image', 'video'] },
          sortOrder: { type: 'integer' },
        },
      },
      CreatePropertyRequest: {
        type: 'object',
        required: ['title', 'description', 'type', 'price', 'address', 'city', 'state'],
        properties: {
          title: { type: 'string', example: '3 Bedroom Flat in Lekki Phase 1' },
          description: { type: 'string', example: 'Spacious 3 bedroom flat with modern finishes...' },
          type: { type: 'string', enum: ['apartment', 'house', 'duplex', 'flat', 'self_contain', 'room', 'shop', 'office', 'land'] },
          price: { type: 'number', example: 2500000 },
          pricePeriod: { type: 'string', enum: ['yearly', 'monthly', 'daily'], default: 'yearly' },
          cautionFee: { type: 'number', example: 500000 },
          agencyFee: { type: 'number', example: 250000 },
          address: { type: 'string', example: '12 Admiralty Way' },
          city: { type: 'string', example: 'Lekki' },
          state: { type: 'string', example: 'Lagos' },
          latitude: { type: 'number', example: 6.4281 },
          longitude: { type: 'number', example: 3.4219 },
          bedrooms: { type: 'integer', example: 3 },
          bathrooms: { type: 'integer', example: 3 },
          toilets: { type: 'integer', example: 4 },
          areaSqm: { type: 'number', example: 150 },
          amenities: { type: 'array', items: { type: 'string' }, example: ['parking', 'gym', '24hr power'] },
          rules: { type: 'array', items: { type: 'string' }, example: ['No smoking'] },
          isFurnished: { type: 'boolean', default: false },
          hasServicing: { type: 'boolean', default: false },
          isPetFriendly: { type: 'boolean', default: false },
          availableFrom: { type: 'string', format: 'date' },
        },
      },

      // ─── Booking ────────────────────────────
      Booking: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          tenantId: { type: 'string', format: 'uuid' },
          propertyId: { type: 'string', format: 'uuid' },
          ownerId: { type: 'string', format: 'uuid' },
          agentId: { type: 'string', format: 'uuid', nullable: true },
          proposedDate: { type: 'string', format: 'date-time' },
          inspectionDate: { type: 'string', format: 'date-time', nullable: true },
          message: { type: 'string', nullable: true },
          status: { type: 'string', enum: ['pending', 'approved', 'rejected', 'completed', 'cancelled', 'no_show'] },
          ownerNote: { type: 'string', nullable: true },
          alternativeDate: { type: 'string', format: 'date-time', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      CreateBookingRequest: {
        type: 'object',
        required: ['propertyId', 'proposedDate'],
        properties: {
          propertyId: { type: 'string', format: 'uuid' },
          proposedDate: { type: 'string', format: 'date-time', example: '2026-03-15T10:00:00Z' },
          message: { type: 'string', example: 'I would like to inspect this property' },
        },
      },
      RespondBookingRequest: {
        type: 'object',
        required: ['status'],
        properties: {
          status: { type: 'string', enum: ['approved', 'rejected'] },
          ownerNote: { type: 'string', example: 'See you then!' },
          alternativeDate: { type: 'string', format: 'date-time' },
        },
      },

      // ─── Agreement ─────────────────────────
      Agreement: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          tenantId: { type: 'string', format: 'uuid' },
          ownerId: { type: 'string', format: 'uuid' },
          propertyId: { type: 'string', format: 'uuid' },
          status: { type: 'string', enum: ['draft', 'pending_tenant', 'pending_owner', 'active', 'expired', 'terminated'] },
          rentAmount: { type: 'number' },
          rentPeriod: { type: 'string' },
          cautionDeposit: { type: 'number', nullable: true },
          startDate: { type: 'string', format: 'date' },
          endDate: { type: 'string', format: 'date' },
          tenantSignedAt: { type: 'string', format: 'date-time', nullable: true },
          ownerSignedAt: { type: 'string', format: 'date-time', nullable: true },
          pdfUrl: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      CreateAgreementRequest: {
        type: 'object',
        required: ['tenantId', 'propertyId', 'rentAmount', 'startDate', 'endDate'],
        properties: {
          tenantId: { type: 'string', format: 'uuid' },
          propertyId: { type: 'string', format: 'uuid' },
          rentAmount: { type: 'number', example: 2500000 },
          rentPeriod: { type: 'string', default: 'yearly' },
          cautionDeposit: { type: 'number', example: 500000 },
          startDate: { type: 'string', format: 'date', example: '2026-04-01' },
          endDate: { type: 'string', format: 'date', example: '2027-03-31' },
          additionalTerms: { type: 'string' },
        },
      },
      SignAgreementRequest: {
        type: 'object',
        required: ['signature'],
        properties: {
          signature: { type: 'string', description: 'Base64 encoded signature image' },
        },
      },

      // ─── Payment ────────────────────────────
      Payment: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          reference: { type: 'string' },
          userId: { type: 'string', format: 'uuid' },
          type: { type: 'string', enum: ['rent', 'deposit', 'commission', 'agreement_fee'] },
          status: { type: 'string', enum: ['pending', 'success', 'failed', 'refunded'] },
          amount: { type: 'number' },
          commission: { type: 'number' },
          ownerAmount: { type: 'number' },
          currency: { type: 'string', example: 'NGN' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      InitiatePaymentRequest: {
        type: 'object',
        required: ['type', 'amount'],
        properties: {
          propertyId: { type: 'string', format: 'uuid' },
          agreementId: { type: 'string', format: 'uuid' },
          type: { type: 'string', enum: ['rent', 'deposit', 'commission', 'agreement_fee'] },
          amount: { type: 'number', minimum: 100, example: 2500000 },
          description: { type: 'string', example: 'Annual rent payment' },
        },
      },
      InitiatePaymentResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string' },
          data: {
            type: 'object',
            properties: {
              payment: { $ref: '#/components/schemas/Payment' },
              authorizationUrl: { type: 'string', description: 'Redirect user here to complete payment' },
            },
          },
        },
      },

      // ─── Admin ──────────────────────────────
      CreateAdminRequest: {
        type: 'object',
        required: ['firstName', 'lastName', 'email', 'phone', 'password', 'permissions'],
        properties: {
          firstName: { type: 'string', example: 'Emeka' },
          lastName: { type: 'string', example: 'Eze' },
          email: { type: 'string', format: 'email', example: 'emeka@rentals.ng' },
          phone: { type: 'string', example: '+2348033333333' },
          password: { type: 'string', minLength: 8, example: 'AdminPass@123' },
          permissions: {
            type: 'array',
            items: { type: 'string', enum: ['manage_admins', 'view_users', 'toggle_user_status', 'verify_user', 'view_properties', 'approve_property', 'reject_property', 'suspend_property', 'view_payments', 'process_refund', 'view_agreements', 'view_dashboard', 'manage_disputes'] },
            example: ['view_dashboard', 'view_users', 'view_properties', 'approve_property'],
          },
          isSuperAdmin: { type: 'boolean', default: false },
        },
      },
      UpdateAdminPermissionsRequest: {
        type: 'object',
        required: ['permissions'],
        properties: {
          permissions: {
            type: 'array',
            items: { type: 'string', enum: ['manage_admins', 'view_users', 'toggle_user_status', 'verify_user', 'view_properties', 'approve_property', 'reject_property', 'suspend_property', 'view_payments', 'process_refund', 'view_agreements', 'view_dashboard', 'manage_disputes'] },
            example: ['view_dashboard', 'view_users', 'view_properties'],
          },
        },
      },
      DashboardStats: {
        type: 'object',
        properties: {
          users: {
            type: 'object',
            properties: {
              total: { type: 'integer' },
              propertyOwners: { type: 'integer' },
              tenants: { type: 'integer' },
              agents: { type: 'integer' },
            },
          },
          properties: {
            type: 'object',
            properties: {
              total: { type: 'integer' },
              active: { type: 'integer' },
              pendingReview: { type: 'integer' },
            },
          },
          bookings: { type: 'integer' },
          agreements: { type: 'integer' },
          revenue: {
            type: 'object',
            properties: {
              total: { type: 'number' },
              commission: { type: 'number' },
            },
          },
        },
      },
    },
  },

  // ─── Paths ──────────────────────────────────
  paths: {
    // ═══ AUTH ═══════════════════════════════════
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a new user',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/RegisterRequest' } } } },
        responses: {
          201: { description: 'Registration successful', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } } },
          409: { description: 'Email or phone already exists' },
          400: { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ValidationError' } } } },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login with email and password',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } } },
        responses: {
          200: { description: 'Login successful', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } } },
          401: { description: 'Invalid credentials' },
        },
      },
    },
    '/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Refresh access token',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/RefreshTokenRequest' } } } },
        responses: {
          200: { description: 'Token refreshed' },
          401: { description: 'Invalid refresh token' },
        },
      },
    },
    '/auth/forgot-password': {
      post: {
        tags: ['Auth'],
        summary: 'Request password reset email',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ForgotPasswordRequest' } } } },
        responses: { 200: { description: 'Reset email sent (if account exists)' } },
      },
    },
    '/auth/reset-password': {
      post: {
        tags: ['Auth'],
        summary: 'Reset password with token',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ResetPasswordRequest' } } } },
        responses: {
          200: { description: 'Password reset successful' },
          400: { description: 'Invalid or expired token' },
        },
      },
    },
    '/auth/change-password': {
      post: {
        tags: ['Auth'],
        summary: 'Change password (authenticated)',
        security: [{ BearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ChangePasswordRequest' } } } },
        responses: {
          200: { description: 'Password changed' },
          400: { description: 'Current password incorrect' },
        },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Logout (blacklist refresh token)',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/RefreshTokenRequest' } } } },
        responses: { 200: { description: 'Logged out' } },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Get current authenticated user',
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'Current user info' } },
      },
    },

    // ═══ USERS ══════════════════════════════════
    '/users/profile': {
      get: {
        tags: ['Users'],
        summary: 'Get my profile',
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'User profile' } },
      },
      patch: {
        tags: ['Users'],
        summary: 'Update my profile',
        security: [{ BearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateProfileRequest' } } } },
        responses: { 200: { description: 'Profile updated' } },
      },
    },
    '/users/bank-details': {
      put: {
        tags: ['Users'],
        summary: 'Update bank details (property owner only)',
        security: [{ BearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateBankDetailsRequest' } } } },
        responses: {
          200: { description: 'Bank details updated' },
          403: { description: 'Not a property owner' },
        },
      },
    },
    '/users/preferences': {
      put: {
        tags: ['Users'],
        summary: 'Update search preferences (tenant only)',
        security: [{ BearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdatePreferencesRequest' } } } },
        responses: { 200: { description: 'Preferences updated' } },
      },
    },
    '/users/owners/{id}': {
      get: {
        tags: ['Users'],
        summary: 'Get property owner public profile',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Property owner profile' } },
      },
    },

    // ═══ PROPERTIES ═════════════════════════════
    '/properties': {
      get: {
        tags: ['Properties'],
        summary: 'List properties (public, with filters)',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Search title, description, address' },
          { name: 'type', in: 'query', schema: { type: 'string', enum: ['apartment', 'house', 'duplex', 'flat', 'self_contain', 'room', 'shop', 'office', 'land'] } },
          { name: 'city', in: 'query', schema: { type: 'string' } },
          { name: 'state', in: 'query', schema: { type: 'string' } },
          { name: 'minPrice', in: 'query', schema: { type: 'number' } },
          { name: 'maxPrice', in: 'query', schema: { type: 'number' } },
          { name: 'bedrooms', in: 'query', schema: { type: 'integer' } },
          { name: 'bathrooms', in: 'query', schema: { type: 'integer' } },
          { name: 'isFurnished', in: 'query', schema: { type: 'boolean' } },
          { name: 'isPetFriendly', in: 'query', schema: { type: 'boolean' } },
          { name: 'sort', in: 'query', schema: { type: 'string', default: 'createdAt' } },
          { name: 'order', in: 'query', schema: { type: 'string', enum: ['ASC', 'DESC'], default: 'DESC' } },
        ],
        responses: { 200: { description: 'Paginated list of active properties' } },
      },
      post: {
        tags: ['Properties'],
        summary: 'Create a property listing (property owner only)',
        security: [{ BearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CreatePropertyRequest' } } } },
        responses: {
          201: { description: 'Property created (pending review)' },
          403: { description: 'Not a property owner' },
        },
      },
    },
    '/properties/me/listings': {
      get: {
        tags: ['Properties'],
        summary: 'Get my listings (property owner)',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer' } },
          { name: 'limit', in: 'query', schema: { type: 'integer' } },
        ],
        responses: { 200: { description: 'My listings' } },
      },
    },
    '/properties/me/favorites': {
      get: {
        tags: ['Properties'],
        summary: 'Get my saved/favorite properties',
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'Favorite properties' } },
      },
    },
    '/properties/{id}': {
      get: {
        tags: ['Properties'],
        summary: 'Get property details (public)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Property details with images and owner info' } },
      },
      put: {
        tags: ['Properties'],
        summary: 'Update property (property owner only)',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CreatePropertyRequest' } } } },
        responses: { 200: { description: 'Property updated' } },
      },
      delete: {
        tags: ['Properties'],
        summary: 'Delete property (property owner only)',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 204: { description: 'Property deleted' } },
      },
    },
    '/properties/{id}/images': {
      post: {
        tags: ['Properties'],
        summary: 'Upload images/videos to a property',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  images: { type: 'array', items: { type: 'string', format: 'binary' }, maxItems: 15 },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Images uploaded' } },
      },
    },
    '/properties/{id}/images/{imageId}': {
      delete: {
        tags: ['Properties'],
        summary: 'Delete a property image',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'imageId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { 204: { description: 'Image deleted' } },
      },
    },
    '/properties/{id}/favorite': {
      post: {
        tags: ['Properties'],
        summary: 'Toggle favorite on a property',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Favorite toggled', content: { 'application/json': { schema: { type: 'object', properties: { favorited: { type: 'boolean' } } } } } } },
      },
    },

    '/properties/{id}/assign-agent': {
      patch: {
        tags: ['Properties'],
        summary: 'Assign an agent to a property',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['agentId'], properties: { agentId: { type: 'string', format: 'uuid' } } } } } },
        responses: {
          200: { description: 'Agent assigned to property' },
          404: { description: 'Property or agent not found' },
        },
      },
    },
    '/properties/{id}/remove-agent': {
      patch: {
        tags: ['Properties'],
        summary: 'Remove agent from a property',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: 'Agent removed from property' },
          404: { description: 'Property not found' },
        },
      },
    },

    // ═══ BOOKINGS ═══════════════════════════════
    '/bookings': {
      post: {
        tags: ['Bookings'],
        summary: 'Request a property inspection (tenant)',
        security: [{ BearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateBookingRequest' } } } },
        responses: {
          201: { description: 'Inspection requested' },
          409: { description: 'Already have a pending booking' },
        },
      },
    },
    '/bookings/tenant': {
      get: {
        tags: ['Bookings'],
        summary: 'Get my bookings (tenant)',
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'Tenant bookings' } },
      },
    },
    '/bookings/owner': {
      get: {
        tags: ['Bookings'],
        summary: 'Get bookings for my properties (property owner)',
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'Owner bookings' } },
      },
    },
    '/bookings/agent': {
      get: {
        tags: ['Bookings'],
        summary: 'Get bookings assigned to me (agent)',
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'Agent bookings' } },
      },
    },
    '/bookings/{id}': {
      get: {
        tags: ['Bookings'],
        summary: 'Get booking details',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Booking details' } },
      },
    },
    '/bookings/{id}/respond': {
      patch: {
        tags: ['Bookings'],
        summary: 'Approve or reject a booking (property owner or agent)',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/RespondBookingRequest' } } } },
        responses: { 200: { description: 'Booking responded' } },
      },
    },
    '/bookings/{id}/complete': {
      patch: {
        tags: ['Bookings'],
        summary: 'Mark booking as completed or no-show (property owner or agent)',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string', enum: ['completed', 'no_show'] } } } } } },
        responses: { 200: { description: 'Booking completed' } },
      },
    },
    '/bookings/{id}/cancel': {
      patch: {
        tags: ['Bookings'],
        summary: 'Cancel a booking (tenant)',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Booking cancelled' } },
      },
    },

    '/bookings/{id}/inspection-date': {
      patch: {
        tags: ['Bookings'],
        summary: 'Assign an inspection date to a booking (property owner or agent)',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['inspectionDate'], properties: { inspectionDate: { type: 'string', format: 'date-time', example: '2026-03-20T14:00:00Z' } } } } } },
        responses: {
          200: { description: 'Inspection date assigned, booking approved' },
          404: { description: 'Booking not found' },
        },
      },
    },

    // ═══ AGREEMENTS ═════════════════════════════
    '/agreements': {
      get: {
        tags: ['Agreements'],
        summary: 'Get my agreements',
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'User agreements' } },
      },
      post: {
        tags: ['Agreements'],
        summary: 'Create a rental agreement (property owner)',
        security: [{ BearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateAgreementRequest' } } } },
        responses: { 201: { description: 'Agreement created, pending tenant signature' } },
      },
    },
    '/agreements/{id}': {
      get: {
        tags: ['Agreements'],
        summary: 'Get agreement details',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Agreement details' } },
      },
    },
    '/agreements/{id}/sign/tenant': {
      patch: {
        tags: ['Agreements'],
        summary: 'Sign agreement as tenant',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/SignAgreementRequest' } } } },
        responses: { 200: { description: 'Signed by tenant, pending owner' } },
      },
    },
    '/agreements/{id}/sign/owner': {
      patch: {
        tags: ['Agreements'],
        summary: 'Sign agreement as property owner (generates PDF)',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/SignAgreementRequest' } } } },
        responses: { 200: { description: 'Agreement fully signed, PDF generated' } },
      },
    },
    '/agreements/{id}/terminate': {
      patch: {
        tags: ['Agreements'],
        summary: 'Terminate an active agreement (property owner)',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Agreement terminated' } },
      },
    },

    // ═══ PAYMENTS ═══════════════════════════════
    '/payments/initiate': {
      post: {
        tags: ['Payments'],
        summary: 'Initiate a payment (returns Paystack checkout URL)',
        security: [{ BearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/InitiatePaymentRequest' } } } },
        responses: { 201: { description: 'Payment initiated', content: { 'application/json': { schema: { $ref: '#/components/schemas/InitiatePaymentResponse' } } } } },
      },
    },
    '/payments/verify/{reference}': {
      get: {
        tags: ['Payments'],
        summary: 'Verify a payment by reference',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'reference', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Payment verification result' } },
      },
    },
    '/payments/webhook': {
      post: {
        tags: ['Payments'],
        summary: 'Paystack webhook handler (do not call manually)',
        description: 'Called by Paystack to notify of payment events. Validates signature from x-paystack-signature header.',
        responses: { 200: { description: 'Webhook processed' } },
      },
    },
    '/payments': {
      get: {
        tags: ['Payments'],
        summary: 'Get my payment history',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer' } },
          { name: 'limit', in: 'query', schema: { type: 'integer' } },
        ],
        responses: { 200: { description: 'Payment history' } },
      },
    },
    '/payments/{id}': {
      get: {
        tags: ['Payments'],
        summary: 'Get payment details',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Payment details' } },
      },
    },

    // ═══ ADMIN — MEMBER MANAGEMENT ═══════════════
    '/admin/members': {
      get: {
        tags: ['Admin'],
        summary: 'List all admin members',
        description: 'Requires: manage_admins permission',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer' } },
          { name: 'limit', in: 'query', schema: { type: 'integer' } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
        ],
        responses: { 200: { description: 'Admin members list' } },
      },
      post: {
        tags: ['Admin'],
        summary: 'Create a new admin member',
        description: 'Requires: manage_admins permission',
        security: [{ BearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateAdminRequest' } } } },
        responses: {
          201: { description: 'Admin member created' },
          409: { description: 'Email or phone already exists' },
        },
      },
    },
    '/admin/members/permissions': {
      get: {
        tags: ['Admin'],
        summary: 'List all available permissions with descriptions',
        description: 'Requires: manage_admins permission',
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'All available permissions' } },
      },
    },
    '/admin/members/{id}': {
      get: {
        tags: ['Admin'],
        summary: 'Get admin member details',
        description: 'Requires: manage_admins permission',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Admin member details' } },
      },
      delete: {
        tags: ['Admin'],
        summary: 'Remove an admin member (downgrades to tenant)',
        description: 'Requires: manage_admins permission. Cannot remove super admins or yourself.',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: 'Admin member removed' },
          400: { description: 'Cannot remove self or super admin' },
        },
      },
    },
    '/admin/members/{id}/permissions': {
      put: {
        tags: ['Admin'],
        summary: 'Update admin member permissions',
        description: 'Requires: manage_admins permission. Cannot modify super admins.',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateAdminPermissionsRequest' } } } },
        responses: { 200: { description: 'Permissions updated' } },
      },
    },
    '/admin/members/{id}/super-admin': {
      patch: {
        tags: ['Admin'],
        summary: 'Grant or revoke super admin status',
        description: 'Requires: manage_admins permission',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['isSuperAdmin'], properties: { isSuperAdmin: { type: 'boolean' } } } } } },
        responses: { 200: { description: 'Super admin status updated' } },
      },
    },

    // ═══ ADMIN — DASHBOARD & OPERATIONS ═════════
    '/admin/dashboard': {
      get: {
        tags: ['Admin'],
        summary: 'Get dashboard analytics',
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'Dashboard stats', content: { 'application/json': { schema: { $ref: '#/components/schemas/DashboardStats' } } } } },
      },
    },
    '/admin/users': {
      get: {
        tags: ['Admin'],
        summary: 'List all users with filters',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer' } },
          { name: 'limit', in: 'query', schema: { type: 'integer' } },
          { name: 'role', in: 'query', schema: { type: 'string', enum: ['tenant', 'property_owner', 'agent', 'admin'] } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
        ],
        responses: { 200: { description: 'Users list' } },
      },
    },
    '/admin/users/{id}/toggle-active': {
      patch: {
        tags: ['Admin'],
        summary: 'Activate or deactivate a user',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'User status toggled' } },
      },
    },
    '/admin/users/{id}/verify': {
      patch: {
        tags: ['Admin'],
        summary: 'Verify user identity',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'User identity verified' } },
      },
    },
    '/admin/properties': {
      get: {
        tags: ['Admin'],
        summary: 'List all properties (with optional status filter)',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer' } },
          { name: 'limit', in: 'query', schema: { type: 'integer' } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['draft', 'pending_review', 'active', 'rented', 'suspended', 'archived'] } },
        ],
        responses: { 200: { description: 'All properties' } },
      },
    },
    '/admin/properties/pending': {
      get: {
        tags: ['Admin'],
        summary: 'List properties pending review',
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'Pending properties' } },
      },
    },
    '/admin/properties/{id}/approve': {
      patch: {
        tags: ['Admin'],
        summary: 'Approve a property listing',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Property approved' } },
      },
    },
    '/admin/properties/{id}/reject': {
      patch: {
        tags: ['Admin'],
        summary: 'Reject a property listing',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['reason'], properties: { reason: { type: 'string' } } } } } },
        responses: { 200: { description: 'Property rejected' } },
      },
    },
    '/admin/properties/{id}/suspend': {
      patch: {
        tags: ['Admin'],
        summary: 'Suspend a property listing',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['reason'], properties: { reason: { type: 'string' } } } } } },
        responses: { 200: { description: 'Property suspended' } },
      },
    },
    '/admin/payments': {
      get: {
        tags: ['Admin'],
        summary: 'List all payments',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer' } },
          { name: 'limit', in: 'query', schema: { type: 'integer' } },
        ],
        responses: { 200: { description: 'All payments' } },
      },
    },

    // ═══ AGENTS ═══════════════════════════════════
    '/agents': {
      post: {
        tags: ['Agents'],
        summary: 'Add a new agent (property owner)',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['firstName', 'lastName', 'email', 'phone', 'password'],
                properties: {
                  firstName: { type: 'string', example: 'Tunde' },
                  lastName: { type: 'string', example: 'Bakare' },
                  email: { type: 'string', format: 'email', example: 'tunde@example.com' },
                  phone: { type: 'string', example: '+2348055555555' },
                  password: { type: 'string', minLength: 8, example: 'AgentPass@123' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Agent created' },
          409: { description: 'Email or phone already exists' },
        },
      },
      get: {
        tags: ['Agents'],
        summary: 'List my agents (property owner)',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer' } },
          { name: 'limit', in: 'query', schema: { type: 'integer' } },
        ],
        responses: { 200: { description: 'Paginated list of agents' } },
      },
    },
    '/agents/{id}': {
      get: {
        tags: ['Agents'],
        summary: 'Get agent details',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Agent details' } },
      },
      delete: {
        tags: ['Agents'],
        summary: 'Remove an agent',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Agent deactivated' } },
      },
    },
    '/agents/{id}/toggle-active': {
      patch: {
        tags: ['Agents'],
        summary: 'Toggle agent active status',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Agent status toggled' } },
      },
    },
  },
};
