import { config } from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

// .env lives at the monorepo root, two levels above server/src/
config({ path: join(dirname(fileURLToPath(import.meta.url)), '../../.env') });
