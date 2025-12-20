import { build } from 'esbuild';
import { glob } from 'glob';
import { fileURLToPath } from 'url';
import { dirname, join, relative } from 'path';

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
