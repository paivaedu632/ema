#!/usr/bin/env node

/**
 * EmaPay Refactoring Tools
 *
 * Automated tools for safely refactoring the EmaPay project structure.
 * Provides utilities for moving files, updating imports, and validating changes.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class RefactorTools {
  constructor() {
    this.srcDir = path.join(__dirname, '..', 'src');
    this.backupDir = path.join(__dirname, '..', 'backup');
    this.logFile = path.join(__dirname, '..', 'refactor.log');
  }

  /**
   * Log refactoring operations
   */
  log(message) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}\n`;
    console.log(logEntry.trim());
    fs.appendFileSync(this.logFile, logEntry);
  }

  /**
   * Create backup of current structure
   */
  createBackup() {
    this.log('Creating backup of current structure...');
    
    if (fs.existsSync(this.backupDir)) {
      fs.rmSync(this.backupDir, { recursive: true });
    }
    
    this.copyDirectory(this.srcDir, this.backupDir);
    this.log(`Backup created at: ${this.backupDir}`);
  }

  /**
   * Copy directory recursively
   */
  copyDirectory(src, dest) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }

    const entries = fs.readdirSync(src, { withFileTypes: true });
    
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      
      if (entry.isDirectory()) {
        this.copyDirectory(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  /**
   * Find all TypeScript/React files
   */
  findSourceFiles() {
    const files = [];
    
    const scanDirectory = (dir) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          scanDirectory(fullPath);
        } else if (entry.name.match(/\.(ts|tsx)$/)) {
          files.push(fullPath);
        }
      }
    };
    
    scanDirectory(this.srcDir);
    return files;
  }

  /**
   * Update import paths in a file
   */
  updateImportsInFile(filePath, importMappings) {
    let content = fs.readFileSync(filePath, 'utf8');
    let updated = false;

    for (const [oldPath, newPath] of Object.entries(importMappings)) {
      const oldImportRegex = new RegExp(`from ['"]${oldPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`, 'g');
      const newImportStatement = `from '${newPath}'`;
      
      if (oldImportRegex.test(content)) {
        content = content.replace(oldImportRegex, newImportStatement);
        updated = true;
        this.log(`Updated import in ${filePath}: ${oldPath} → ${newPath}`);
      }
    }

    if (updated) {
      fs.writeFileSync(filePath, content);
    }

    return updated;
  }

  /**
   * Update all import paths across the codebase
   */
  updateAllImports(importMappings) {
    this.log('Updating import paths across codebase...');
    
    const files = this.findSourceFiles();
    let totalUpdated = 0;

    for (const file of files) {
      if (this.updateImportsInFile(file, importMappings)) {
        totalUpdated++;
      }
    }

    this.log(`Updated imports in ${totalUpdated} files`);
    return totalUpdated;
  }

  /**
   * Move file safely with import updates
   */
  moveFile(oldPath, newPath) {
    this.log(`Moving file: ${oldPath} → ${newPath}`);
    
    // Ensure destination directory exists
    const destDir = path.dirname(newPath);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    // Copy file to new location
    fs.copyFileSync(oldPath, newPath);
    
    // Verify copy was successful
    if (!fs.existsSync(newPath)) {
      throw new Error(`Failed to copy file to ${newPath}`);
    }

    this.log(`File moved successfully: ${newPath}`);
    return newPath;
  }

  /**
   * Remove old file after verification
   */
  removeOldFile(filePath) {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      this.log(`Removed old file: ${filePath}`);
    }
  }

  /**
   * Validate TypeScript compilation
   */
  validateTypeScript() {
    this.log('Validating TypeScript compilation...');
    
    try {
      execSync('npx tsc --noEmit', { 
        cwd: path.join(__dirname, '..'),
        stdio: 'pipe'
      });
      this.log('✅ TypeScript validation passed');
      return true;
    } catch (error) {
      this.log('❌ TypeScript validation failed:');
      this.log(error.stdout?.toString() || error.message);
      return false;
    }
  }

  /**
   * Run tests to validate changes
   */
  runTests() {
    this.log('Running tests to validate changes...');
    
    try {
      execSync('npm test -- --passWithNoTests', { 
        cwd: path.join(__dirname, '..'),
        stdio: 'pipe'
      });
      this.log('✅ Tests passed');
      return true;
    } catch (error) {
      this.log('❌ Tests failed:');
      this.log(error.stdout?.toString() || error.message);
      return false;
    }
  }

  /**
   * Create directory structure for new organization
   */
  createNewDirectories() {
    const directories = [
      'src/components/layout',
      'src/components/forms', 
      'src/components/features/auth',
      'src/components/features/dashboard',
      'src/components/features/transfers',
      'src/components/features/wallet',
      'src/components/features/trading',
      'src/components/features/transactions',
      'src/components/features/kyc'
    ];

    this.log('Creating new directory structure...');
    
    for (const dir of directories) {
      const fullPath = path.join(__dirname, '..', dir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
        this.log(`Created directory: ${dir}`);
      }
    }
  }

  /**
   * Generate import mapping for component reorganization
   */
  getComponentImportMappings() {
    return {
      // Feature components
      '@/components/dashboard': '@/components/features/dashboard/dashboard',
      '@/components/send': '@/components/features/transfers/send',
      '@/components/receive': '@/components/features/transfers/receive',
      '@/components/deposit': '@/components/features/wallet/deposit',
      '@/components/withdraw': '@/components/features/wallet/withdraw',
      '@/components/wallet': '@/components/features/wallet/wallet',
      '@/components/sell': '@/components/features/trading/sell',
      '@/components/login': '@/components/features/auth/login',
      '@/components/signup': '@/components/features/auth/signup',
      '@/components/transaction-details': '@/components/features/transactions/transaction-details',
      
      // Library simplification
      '@/lib/api/responses': '@/lib/api',
      '@/lib/api/cors': '@/lib/api',
      '@/lib/auth/jwt-service': '@/lib/auth',
      '@/lib/auth/middleware': '@/lib/auth',
      '@/lib/database/functions': '@/lib/database',
      '@/lib/validation/helpers': '@/lib/validations',
      '@/lib/validation/schemas': '@/lib/validations',
      '@/lib/validation': '@/lib/validations',
      
      // Types consolidation
      '@/types/emapay.types': '@/types',
    };
  }
}

// Export for use in other scripts
export default RefactorTools;

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const tools = new RefactorTools();
  const command = process.argv[2];

  switch (command) {
    case 'backup':
      tools.createBackup();
      break;
    case 'validate':
      tools.validateTypeScript() && tools.runTests();
      break;
    case 'create-dirs':
      tools.createNewDirectories();
      break;
    case 'update-imports':
      tools.updateAllImports(tools.getComponentImportMappings());
      break;
    default:
      console.log('Usage: node refactor-tools.js [backup|validate|create-dirs|update-imports]');
  }
}
