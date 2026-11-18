import { Global, Module } from '@nestjs/common';

/**
 * Marker module for config exports.
 * APP_ENV is provided once by InfrastructureModule.forRoot() after loadEnv().
 */
@Global()
@Module({})
export class ConfigModule {}
