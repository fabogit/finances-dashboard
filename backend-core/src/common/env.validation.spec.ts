import 'reflect-metadata';
import { validate } from './env.validation';
import {
  DEFAULT_SCIENCE_RETRY_COUNT,
  DEFAULT_SCIENCE_TIMEOUT_MS,
} from '../modules/science/science.constants';

describe('validate (environment)', () => {
  const base = { DATABASE_URL: 'postgresql://user:pw@localhost:5432/db' };

  it('should apply the documented defaults for the science client', () => {
    const config = validate(base);

    expect(config.SCIENCE_TIMEOUT_MS).toBe(DEFAULT_SCIENCE_TIMEOUT_MS);
    expect(config.SCIENCE_RETRY_COUNT).toBe(DEFAULT_SCIENCE_RETRY_COUNT);
  });

  it('should convert science client values read as strings to numbers', () => {
    const config = validate({
      ...base,
      SCIENCE_TIMEOUT_MS: '2500',
      SCIENCE_RETRY_COUNT: '0',
    });

    expect(config.SCIENCE_TIMEOUT_MS).toBe(2500);
    expect(config.SCIENCE_RETRY_COUNT).toBe(0);
  });

  it.each([
    ['SCIENCE_TIMEOUT_MS', '0'],
    ['SCIENCE_TIMEOUT_MS', 'soon'],
    ['SCIENCE_RETRY_COUNT', '-1'],
    ['SCIENCE_RETRY_COUNT', '1.5'],
  ])('should reject %s=%s', (key, value) => {
    expect(() => validate({ ...base, [key]: value })).toThrow(key);
  });
});
