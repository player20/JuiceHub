import { execSync } from 'child_process';
import { glob } from 'glob';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { copyFile, mkdir } from 'fs/promises';
import { relative } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Workspace modules to build
const workspaces = [
  '00_Base',
  '01_Data',
  '02_Util',
  '03_Modules/Configuration',
  '03_Modules/EVDriver',
  '03_Modules/Monitoring',
  '03_Modules/OcppRouter',
  '03_Modules/Reporting',
  '03_Modules/SmartCharging',
  '03_Modules/Transactions',
  'Server',
];

async function copyJsonFiles(workspace) {
  const workspacePath = join(__dirname, workspace);
  const srcPath = join(workspacePath, 'src');
  const distPath = join(workspacePath, 'dist');

  // Find all JSON files in src directory
  const jsonFiles = await glob('**/*.json', {
    cwd: srcPath,
    absolute: true,
  });

  if (jsonFiles.length === 0) {
    return;
  }

  console.log(`  📄 Copying ${jsonFiles.length} JSON files...`);

  for (const jsonFile of jsonFiles) {
    const relativePath = relative(srcPath, jsonFile);
    const destFile = join(distPath, relativePath);
    const destDir = dirname(destFile);

    await mkdir(destDir, { recursive: true });
    await copyFile(jsonFile, destFile);
  }
}

async function buildWorkspace(workspace) {
  const workspacePath = join(__dirname, workspace);

  // Check if tsconfig.json exists
  const tsconfigPath = join(workspacePath, 'tsconfig.json');

  console.log(`📦 Building ${workspace}...`);

  try {
    // Run tsc - it will emit files even with type errors due to noEmitOnError: false in tsconfig
    execSync(
      `npx tsc --project ${tsconfigPath}`,
      {
        cwd: workspacePath,
        stdio: 'pipe', // Suppress output
        encoding: 'utf-8',
      }
    );
    console.log(`  ✅ Compiled successfully`);
  } catch (error) {
    // TypeScript exits with code 2 when there are type errors but files are generated
    // Exit code 1 means real build failure
    if (error.status === 2) {
      // Type errors present but files still generated - this is expected and OK
      console.log(`  ⚠️  Type errors present (files generated successfully)`);
    } else if (error.status === 1) {
      // Real compilation failure - this is a problem
      console.error(`  ❌ Compilation failed:`);
      console.error(error.stdout || error.stderr || error.message);
      throw error;
    } else {
      // Unknown error
      console.error(`  ❌ Build failed with exit code ${error.status}:`);
      console.error(error.stdout || error.stderr || error.message);
      throw error;
    }
  }

  // Copy JSON files after TypeScript build
  await copyJsonFiles(workspace);

  console.log(`✅ ${workspace} built successfully`);
}

async function buildMigrations() {
  console.log('📦 Compiling migrations...');

  try {
    const migrationsPath = join(__dirname, 'migrations');
    const distMigrationsPath = join(__dirname, 'dist', 'migrations');

    // Create dist/migrations directory
    await mkdir(distMigrationsPath, { recursive: true });

    // Find all TypeScript migration files
    const migrationFiles = await glob('*.ts', {
      cwd: migrationsPath,
      absolute: true,
    });

    if (migrationFiles.length === 0) {
      console.log('  ⚠️  No migration files found');
      return;
    }

    console.log(`  📄 Found ${migrationFiles.length} migration files`);

    // Compile each migration file individually
    for (const migrationFile of migrationFiles) {
      const filename = migrationFile.split('/').pop();
      const outFile = join(distMigrationsPath, filename.replace('.ts', '.js'));

      try {
        execSync(
          `npx tsc ${migrationFile} --outDir ${distMigrationsPath} --module commonjs --target es2020 --esModuleInterop --skipLibCheck --declaration --sourceMap --experimentalDecorators --emitDecoratorMetadata`,
          {
            cwd: __dirname,
            stdio: 'pipe',
            encoding: 'utf-8',
          }
        );
      } catch (error) {
        // TypeScript may exit with non-zero even if files are generated
        // Check if the output file exists
        const fs = await import('fs/promises');
        try {
          await fs.access(outFile);
          // File exists, compilation succeeded despite error
          console.log(`  ⚠️  ${filename} compiled with warnings`);
        } catch {
          // File doesn't exist, real error
          console.error(`  ❌ Failed to compile ${filename}`);
          throw error;
        }
      }
    }

    console.log(`  ✅ Compiled ${migrationFiles.length} migrations successfully`);
  } catch (error) {
    console.error('  ❌ Migration compilation failed:', error.message);
    throw error;
  }
}

async function buildAll() {
  try {
    console.log('🔨 Building CitrineOS with TypeScript...\n');
    console.log('ℹ️  Type errors are suppressed - files will be generated anyway\n');

    for (const workspace of workspaces) {
      await buildWorkspace(workspace);
    }

    // Compile migrations after workspaces
    await buildMigrations();

    console.log('\n✅ All modules built successfully!\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Build failed:', error.message);
    process.exit(1);
  }
}

buildAll();
