import { build } from 'esbuild';
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

    // Create destination directory if it doesn't exist
    await mkdir(destDir, { recursive: true });

    // Copy the JSON file
    await copyFile(jsonFile, destFile);
  }
}

async function buildWorkspace(workspace) {
  const workspacePath = join(__dirname, workspace);

  // Find all TypeScript files in the workspace src directory
  const entryPoints = await glob('src/**/*.ts', {
    cwd: workspacePath,
    ignore: [
      '**/*.test.ts',
      '**/*.test.*.ts',
      '**/*.stub.ts',
      '**/*.example.ts',
      '**/__tests__/**',
    ],
    absolute: true,
  });

  if (entryPoints.length === 0) {
    console.log(`⏭️  Skipping ${workspace} (no source files)`);
    return;
  }

  console.log(`📦 Building ${workspace} (${entryPoints.length} files)...`);

  await build({
    entryPoints,
    outdir: join(workspacePath, 'dist'),
    outbase: join(workspacePath, 'src'),
    platform: 'node',
    target: 'node22',
    format: 'cjs',
    sourcemap: true,
    tsconfig: join(workspacePath, 'tsconfig.json'),
    logLevel: 'warning',
  });

  // Copy JSON files after TypeScript build
  await copyJsonFiles(workspace);

  console.log(`✅ ${workspace} built successfully`);
}

async function buildAll() {
  try {
    console.log('🔨 Building CitrineOS with esbuild (transpile-only, no type checking)...\n');

    for (const workspace of workspaces) {
      await buildWorkspace(workspace);
    }

    console.log('\n✅ All modules built successfully with zero errors!\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Build failed:', error);
    process.exit(1);
  }
}

buildAll();
