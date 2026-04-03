import 'dotenv/config';
import { validateRuntimeEnv } from '../src/lib/config.js';

const issues = validateRuntimeEnv(process.env);

if (issues.length === 0) {
  console.log('Runtime environment looks ready.');
  process.exit(0);
}

for (const issue of issues) {
  console.log(`[${issue.level}] ${issue.key}: ${issue.message}`);
}

if (issues.some((issue) => issue.level === 'error')) {
  process.exit(1);
}
