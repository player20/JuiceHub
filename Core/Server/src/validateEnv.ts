// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

/**
 * Environment validation script
 * Run this before starting the application to ensure all required
 * environment variables are present and valid.
 */

interface EnvVar {
  name: string;
  required: boolean;
  description: string;
  validator?: (value: string) => boolean;
}

const ENV_VARS: EnvVar[] = [
  // Database
  {
    name: 'BOOTSTRAP_CITRINEOS_DATABASE_HOST',
    required: true,
    description: 'PostgreSQL database host',
  },
  {
    name: 'BOOTSTRAP_CITRINEOS_DATABASE_PORT',
    required: false,
    description: 'PostgreSQL database port (default: 5432)',
  },
  {
    name: 'BOOTSTRAP_CITRINEOS_DATABASE_NAME',
    required: true,
    description: 'PostgreSQL database name',
  },
  {
    name: 'BOOTSTRAP_CITRINEOS_DATABASE_USERNAME',
    required: true,
    description: 'PostgreSQL database username',
  },
  {
    name: 'BOOTSTRAP_CITRINEOS_DATABASE_PASSWORD',
    required: true,
    description: 'PostgreSQL database password',
  },

  // Message Queue
  {
    name: 'AMQP_URL',
    required: true,
    description: 'RabbitMQ/AMQP connection URL',
    validator: (value: string) => value.startsWith('amqp://') || value.startsWith('amqps://'),
  },

  // File Storage
  {
    name: 'BOOTSTRAP_CITRINEOS_FILE_ACCESS_TYPE',
    required: false,
    description: 'File storage type (local, s3, directus)',
  },
  {
    name: 'BOOTSTRAP_CITRINEOS_FILE_ACCESS_LOCAL_DEFAULT_FILE_PATH',
    required: false,
    description: 'Local file storage path (required if FILE_ACCESS_TYPE=local)',
  },

  // Application
  {
    name: 'NODE_ENV',
    required: false,
    description: 'Node environment (development, production)',
  },
  {
    name: 'PORT',
    required: false,
    description: 'HTTP server port (default: 8080)',
  },

  // Email (optional but recommended)
  {
    name: 'RESEND_API_KEY',
    required: false,
    description: 'Resend API key for email notifications',
  },
];

function validateEnvironment(): void {
  console.log('🔍 Validating environment variables...\n');

  let hasErrors = false;
  const warnings: string[] = [];

  for (const envVar of ENV_VARS) {
    const value = process.env[envVar.name];

    if (!value) {
      if (envVar.required) {
        console.error(`❌ MISSING REQUIRED: ${envVar.name}`);
        console.error(`   Description: ${envVar.description}\n`);
        hasErrors = true;
      } else {
        warnings.push(`⚠️  Optional variable not set: ${envVar.name}`);
      }
      continue;
    }

    // Validate format if validator provided
    if (envVar.validator && !envVar.validator(value)) {
      console.error(`❌ INVALID FORMAT: ${envVar.name}`);
      console.error(`   Description: ${envVar.description}`);
      console.error(`   Current value format is invalid\n`);
      hasErrors = true;
      continue;
    }

    console.log(`✅ ${envVar.name}`);
  }

  // Show warnings
  if (warnings.length > 0) {
    console.log('\n' + warnings.join('\n'));
  }

  // Final result
  console.log('\n' + '='.repeat(50));
  if (hasErrors) {
    console.error('\n❌ Environment validation FAILED');
    console.error('Fix the missing/invalid variables above before deploying.\n');
    process.exit(1);
  } else {
    console.log('\n✅ Environment validation PASSED');
    console.log('All required variables are present and valid.\n');
  }
}

// Run validation if executed directly
if (require.main === module) {
  validateEnvironment();
}

export { validateEnvironment };
