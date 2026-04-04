import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Pool } from 'pg';

export const DB_POOL = 'DB_POOL';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: DB_POOL,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new Pool({
          connectionString: config.get<string>('DATABASE_URL'),
          ssl: { rejectUnauthorized: false },
        }),
    },
  ],
  exports: [DB_POOL],
})
export class DatabaseModule {}
