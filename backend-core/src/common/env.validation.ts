import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  validateSync,
} from 'class-validator';
import {
  DEFAULT_SCIENCE_RETRY_COUNT,
  DEFAULT_SCIENCE_TIMEOUT_MS,
} from '../modules/science/science.constants';

export enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment = Environment.Development;

  @IsString()
  @IsOptional()
  HOST: string = '0.0.0.0';

  @IsNumber()
  @IsOptional()
  PORT: number = 3000;

  @IsString()
  @IsOptional()
  CORS_ORIGIN: string = '*';

  @IsString()
  DATABASE_URL: string;

  @IsString()
  @IsOptional()
  SCIENCE_SERVICE_URL: string = 'http://backend-science:8000';

  @IsInt()
  @Min(1)
  @IsOptional()
  SCIENCE_TIMEOUT_MS: number = DEFAULT_SCIENCE_TIMEOUT_MS;

  @IsInt()
  @Min(0)
  @IsOptional()
  SCIENCE_RETRY_COUNT: number = DEFAULT_SCIENCE_RETRY_COUNT;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
  return validatedConfig;
}
