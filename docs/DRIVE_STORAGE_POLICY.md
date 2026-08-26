# Google Drive storage policy
Drive is valuable for business documents, exports, backups and user-visible files.
Do NOT use Excel/Sheets as a parallel transactional database for POS/Core.
PostgreSQL/Supabase remains system of record for tenants, users, permissions, subscriptions and transactions.
Drive integrations should store external_file_id, company_id, branch_id where applicable, metadata and audit trail in PostgreSQL.
