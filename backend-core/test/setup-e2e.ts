import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(import.meta.dirname, '../.env.test') });
