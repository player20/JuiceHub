# Future Automation Improvements

## Goal: Zero-Touch Deployments

Make database migrations and Hasura metadata tracking fully automatic with no manual steps.

---

## Current State (After This Fix)

✅ **Automated:**
- Sequelize migrations run on deployment
- Database tables created automatically
- Indexes and default data inserted

❌ **Manual:**
- Hasura table tracking (one-time per new table)
- Hasura permissions configuration
- Hasura relationship setup

---

## Proposed Solution: Hasura CLI Integration

### Step 1: Add Hasura CLI to Docker Container

**Modify:** `Core/Dockerfile`

```dockerfile
# Install Hasura CLI
RUN npm install -g hasura-cli@latest

# Or download binary directly
RUN curl -L https://github.com/hasura/graphql-engine/raw/stable/cli/get.sh | bash
```

### Step 2: Create Hasura Metadata Files

**Create:** `hasura/metadata/databases/default/tables/SystemSettings.yaml`

```yaml
table:
  name: SystemSettings
  schema: public
select_permissions:
  - role: admin
    permission:
      columns: '*'
      filter: {}
insert_permissions:
  - role: admin
    permission:
      check: {}
      columns: '*'
update_permissions:
  - role: admin
    permission:
      columns: '*'
      filter: {}
delete_permissions:
  - role: admin
    permission:
      filter: {}
```

**Create:** `hasura/metadata/databases/default/tables/ErrorLogs.yaml`

```yaml
table:
  name: ErrorLogs
  schema: public
select_permissions:
  - role: admin
    permission:
      columns: '*'
      filter: {}
insert_permissions:
  - role: admin
    permission:
      check: {}
      columns: '*'
update_permissions:
  - role: admin
    permission:
      columns: '*'
      filter: {}
delete_permissions:
  - role: admin
    permission:
      filter: {}
```

### Step 3: Update Entrypoint Script

**Modify:** `Core/entrypoint.sh`

```bash
#!/bin/sh
set -e

# Create necessary directories
mkdir -p /tmp/citrine
mkdir -p ./Server/tmp/citrine
echo "Created runtime directories"

# Default to migrate if DB_STRATEGY is not set
DB_STRATEGY=${DB_STRATEGY:-migrate}

echo "Executing DB strategy: $DB_STRATEGY"

# Run database migrations
if [ "$DB_STRATEGY" = "migrate" ]; then
    npm run migrate
elif [ "$DB_STRATEGY" = "sync" ]; then
    npm run sync-db
elif [ "$DB_STRATEGY" = "force-sync" ]; then
    npm run force-sync-db
elif [ "$DB_STRATEGY" = "none" ]; then
    echo "Skipping DB initialization."
else
    echo "Unknown DB_STRATEGY: $DB_STRATEGY. Defaulting to migrate."
    npm run migrate
fi

# NEW: Apply Hasura metadata
echo "Applying Hasura metadata..."
if [ -n "$HASURA_GRAPHQL_ENDPOINT" ] && [ -n "$HASURA_GRAPHQL_ADMIN_SECRET" ]; then
    cd /app/hasura
    hasura metadata apply \
        --endpoint "$HASURA_GRAPHQL_ENDPOINT" \
        --admin-secret "$HASURA_GRAPHQL_ADMIN_SECRET"

    hasura metadata reload \
        --endpoint "$HASURA_GRAPHQL_ENDPOINT" \
        --admin-secret "$HASURA_GRAPHQL_ADMIN_SECRET"

    echo "Hasura metadata applied successfully"
else
    echo "Warning: HASURA_GRAPHQL_ENDPOINT or HASURA_GRAPHQL_ADMIN_SECRET not set. Skipping Hasura metadata apply."
fi

echo "Starting application..."
exec npm run start-docker-cloud --prefix ./Server
```

### Step 4: Add Environment Variables to Render

**In Render Dashboard** → `juicehub-core` → Environment:

```
HASURA_GRAPHQL_ENDPOINT=https://juicehub-hasura.onrender.com
HASURA_GRAPHQL_ADMIN_SECRET=devadmin123
```

---

## Benefits of Full Automation

### For Development:
- ✅ Add new table → Create migration → Git push → Everything works
- ✅ No manual Hasura console clicks
- ✅ Metadata versioned in git
- ✅ Reproducible across environments (dev, staging, prod)

### For Scaling:
- ✅ Add new environment → Deploy → Tables + permissions auto-created
- ✅ Rollback deployment → Metadata auto-reverts
- ✅ Multi-tenant → Same schema across all tenants

### For Operations:
- ✅ Zero-downtime deployments
- ✅ Audit trail (all changes in git)
- ✅ Test migrations before production
- ✅ Automated rollback on failure

---

## Alternative: Post-Migration Hook Script

**Create:** `Core/scripts/post-migration-hasura.ts`

```typescript
import axios from 'axios';

const HASURA_ENDPOINT = process.env.HASURA_GRAPHQL_ENDPOINT;
const ADMIN_SECRET = process.env.HASURA_GRAPHQL_ADMIN_SECRET;

async function trackTable(tableName: string, schema: string = 'public') {
  try {
    await axios.post(
      `${HASURA_ENDPOINT}/v1/metadata`,
      {
        type: 'pg_track_table',
        args: {
          source: 'default',
          schema: schema,
          name: tableName,
        },
      },
      {
        headers: {
          'X-Hasura-Admin-Secret': ADMIN_SECRET,
        },
      }
    );
    console.log(`✅ Tracked table: ${tableName}`);
  } catch (error: any) {
    if (error.response?.data?.error?.includes('already tracked')) {
      console.log(`⚠️  Table already tracked: ${tableName}`);
    } else {
      console.error(`❌ Failed to track table ${tableName}:`, error.message);
    }
  }
}

async function setPermissions(tableName: string) {
  const permissions = ['select', 'insert', 'update', 'delete'];

  for (const permission of permissions) {
    try {
      await axios.post(
        `${HASURA_ENDPOINT}/v1/metadata`,
        {
          type: `pg_create_${permission}_permission`,
          args: {
            source: 'default',
            table: { schema: 'public', name: tableName },
            role: 'admin',
            permission: permission === 'select'
              ? { columns: '*', filter: {} }
              : permission === 'insert'
              ? { check: {}, columns: '*' }
              : permission === 'update'
              ? { columns: '*', filter: {} }
              : { filter: {} }, // delete
          },
        },
        {
          headers: {
            'X-Hasura-Admin-Secret': ADMIN_SECRET,
          },
        }
      );
      console.log(`✅ Set ${permission} permission for ${tableName}`);
    } catch (error: any) {
      if (error.response?.data?.error?.includes('already exists')) {
        console.log(`⚠️  Permission already exists: ${tableName}.${permission}`);
      } else {
        console.error(`❌ Failed to set permission ${tableName}.${permission}:`, error.message);
      }
    }
  }
}

async function main() {
  console.log('🔄 Auto-tracking new tables in Hasura...');

  const newTables = ['SystemSettings', 'ErrorLogs'];

  for (const table of newTables) {
    await trackTable(table);
    await setPermissions(table);
  }

  console.log('✅ Hasura auto-tracking complete');
}

main().catch(console.error);
```

**Modify:** `Core/package.json`

```json
{
  "scripts": {
    "migrate": "npx sequelize-cli db:migrate && ts-node ./scripts/post-migration-hasura.ts && echo migration completed successfully"
  }
}
```

---

## Recommendation

**For now:** Use manual Hasura tracking (one-time per table)

**Next iteration:** Implement post-migration hook script (easier than Hasura CLI)

**Long-term:** Full Hasura CLI + metadata versioning (production-grade)

---

## Implementation Priority

1. **Immediate** (This PR): Sequelize migrations ✅
2. **Next sprint**: Post-migration Hasura auto-tracking script
3. **Q1 2026**: Full Hasura CLI integration + metadata versioning
4. **Q2 2026**: Multi-environment support (dev/staging/prod)

---

**Last Updated**: January 7, 2026
**Status**: Planning - Not yet implemented
