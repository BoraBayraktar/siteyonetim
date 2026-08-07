-- Link closed incidents to expense ledger entries (manager workflow)

ALTER TABLE "Incident" ADD COLUMN "ledgerEntryId" TEXT;

CREATE UNIQUE INDEX "Incident_ledgerEntryId_key" ON "Incident"("ledgerEntryId");

ALTER TABLE "Incident" ADD CONSTRAINT "Incident_ledgerEntryId_fkey"
  FOREIGN KEY ("ledgerEntryId") REFERENCES "LedgerEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
