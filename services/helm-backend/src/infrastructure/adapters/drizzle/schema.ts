/**
 * Drizzle schema mirrors authoritative SQL in supabase/migrations/.
 * Domain modules must not import Supabase SDKs — use repos via this layer.
 */
import {
  boolean,
  char,
  numeric,
  pgSchema,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

export const identitySchema = pgSchema('identity');
export const catalogSchema = pgSchema('catalog');
export const pricingSchema = pgSchema('pricing');
export const marketsSchema = pgSchema('markets');
export const geoSchema = pgSchema('geo');

export const appRoleEnum = identitySchema.enum('app_role', [
  'customer',
  'operator',
  'administrator',
  'super-administrator',
]);

export const userAccounts = identitySchema.table('user_accounts', {
  id: uuid('id').primaryKey(),
  authProviderRef: text('auth_provider_ref'),
  primaryEmail: text('primary_email'),
  primaryPhone: text('primary_phone'),
  status: text('status').notNull().default('active'),
  statusReason: text('status_reason'),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const customerProfiles = identitySchema.table('customer_profiles', {
  userId: uuid('user_id').primaryKey(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  displayName: text('display_name'),
  photoStoragePath: text('photo_storage_path'),
  phoneE164: text('phone_e164'),
  homeCountryCode: char('home_country_code', { length: 2 }),
  countryOfResidence: char('country_of_residence', { length: 2 }),
  nationalityCode: char('nationality_code', { length: 2 }),
  preferredLocale: text('preferred_locale'),
  preferredCurrency: char('preferred_currency', { length: 3 }),
  preferencesJson: text('preferences_json'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const userRoles = identitySchema.table('user_roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  role: appRoleEnum('role').notNull(),
  grantedAt: timestamp('granted_at', { withTimezone: true }).defaultNow().notNull(),
  grantedBy: uuid('granted_by'),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  revokeReason: text('revoke_reason'),
});

export const destinations = catalogSchema.table('destinations', {
  id: uuid('id').primaryKey(),
  slug: text('slug').notNull(),
  nameEn: text('name_en').notNull(),
  nameAr: text('name_ar').notNull(),
  countryCode: char('country_code', { length: 2 }).notNull(),
  cityId: uuid('city_id'),
  publishStatus: text('publish_status').notNull(),
  verificationStatus: text('verification_status').notNull(),
  isFeatured: boolean('is_featured').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const priceRecords = pricingSchema.table('price_records', {
  id: uuid('id').primaryKey(),
  subjectType: text('subject_type').notNull(),
  subjectId: uuid('subject_id').notNull(),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  currency: char('currency', { length: 3 }).notNull(),
  originalAmount: numeric('original_amount', { precision: 12, scale: 2 }),
  originalCurrency: char('original_currency', { length: 3 }),
  displayAmount: numeric('display_amount', { precision: 12, scale: 2 }),
  displayCurrency: char('display_currency', { length: 3 }),
  source: text('source').notNull(),
  observedAt: timestamp('observed_at', { withTimezone: true }).notNull(),
  verificationStatus: text('verification_status').notNull(),
});

export const markets = marketsSchema.table('markets', {
  code: text('code').primaryKey(),
  displayNameEn: text('display_name_en').notNull(),
  countryCode: char('country_code', { length: 2 }).notNull(),
  defaultCurrency: char('default_currency', { length: 3 }).notNull(),
  defaultLanguage: text('default_language').notNull(),
  direction: text('direction').notNull(),
  isActive: boolean('is_active').notNull().default(true),
});

export const countries = geoSchema.table('countries', {
  code: char('code', { length: 2 }).primaryKey(),
  nameEn: text('name_en').notNull(),
  nameAr: text('name_ar'),
});
