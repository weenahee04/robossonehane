import 'dotenv/config';

const baseUrl = process.env.ROBOSS_SMOKE_BASE_URL || 'http://localhost:3001';

async function expectJson(path: string) {
  const response = await fetch(`${baseUrl}${path}`);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`${path} failed with HTTP ${response.status}: ${JSON.stringify(body)}`);
  }
  return body;
}

async function main() {
  const health = await expectJson('/health');
  const ready = await expectJson('/ready');

  console.log('Health:', JSON.stringify(health));
  console.log('Ready:', JSON.stringify(ready));

  const runAdminLogin = process.env.ROBOSS_SMOKE_ADMIN_EMAIL && process.env.ROBOSS_SMOKE_ADMIN_PASSWORD;
  if (!runAdminLogin) {
    console.log('Admin login smoke skipped: ROBOSS_SMOKE_ADMIN_EMAIL/PASSWORD not set');
    return;
  }

  const loginResponse = await fetch(`${baseUrl}/api/admin/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: process.env.ROBOSS_SMOKE_ADMIN_EMAIL,
      password: process.env.ROBOSS_SMOKE_ADMIN_PASSWORD,
    }),
  });
  const loginBody = await loginResponse.json().catch(() => ({}));
  if (!loginResponse.ok) {
    throw new Error(`/api/admin/login failed with HTTP ${loginResponse.status}: ${JSON.stringify(loginBody)}`);
  }

  const accessToken = loginBody?.data?.tokens?.accessToken || loginBody?.data?.token;
  if (!accessToken) {
    throw new Error('Admin login smoke failed: access token missing');
  }

  const metaResponse = await fetch(`${baseUrl}/api/admin/meta`, {
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
  });
  const metaBody = await metaResponse.json().catch(() => ({}));
  if (!metaResponse.ok) {
    throw new Error(`/api/admin/meta failed with HTTP ${metaResponse.status}: ${JSON.stringify(metaBody)}`);
  }

  console.log('Admin meta:', JSON.stringify({
    adminId: metaBody?.data?.admin?.id,
    role: metaBody?.data?.admin?.role,
    branches: Array.isArray(metaBody?.data?.branches) ? metaBody.data.branches.length : 0,
  }));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
