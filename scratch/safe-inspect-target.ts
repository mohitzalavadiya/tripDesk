import dotenv from 'dotenv';
dotenv.config();

function inspect(name: string) {
  const val = process.env[name];
  if (!val) {
    console.log(`${name}: not set`);
    return;
  }
  try {
    const parsed = new URL(val);
    console.log(`${name}:`, JSON.stringify({
      protocol: parsed.protocol,
      hostname: parsed.hostname,
      port: parsed.port || '5432 (default)',
      pathname: parsed.pathname,
      search: parsed.search ? 'present (sslmode/etc)' : 'none',
      hasUsername: !!parsed.username,
      hasPassword: !!parsed.password,
      isLocal: parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1' || parsed.hostname === '::1',
    }));
  } catch (e: any) {
    console.log(`${name}: parse error - ${e.message}`);
  }
}

inspect('DATABASE_URL');
inspect('DIRECT_URL');
