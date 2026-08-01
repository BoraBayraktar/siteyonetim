/**
 * Pilot faz: veritabanı izolasyonu UI ve dedicated DB yapılandırması kapalı.
 * FAZ 2'de platform operasyonları için TENANT_DATABASE_ISOLATION_ENABLED=true yapılır.
 */
export function isTenantDatabaseIsolationEnabled(): boolean {
  return process.env.TENANT_DATABASE_ISOLATION_ENABLED === "true";
}
