#!/usr/bin/env node

/**
 * EmaPay Refactoring Phase Runner
 * 
 * Orchestrates the execution of refactoring phases with safety checks
 * and rollback capabilities.
 */

const RefactorTools = require('./refactor-tools');
const { execSync } = require('child_process');
const path = require('path');

class PhaseRunner {
  constructor() {
    this.tools = new RefactorTools();
    this.currentPhase = null;
  }

  /**
   * Execute a phase with safety checks
   */
  async executePhase(phaseNumber, phaseName, phaseFunction) {
    this.currentPhase = phaseNumber;
    this.tools.log(`\n🚀 Starting Phase ${phaseNumber}: ${phaseName}`);
    
    try {
      // Create checkpoint before phase
      this.createCheckpoint(phaseNumber);
      
      // Execute phase
      await phaseFunction();
      
      // Validate after phase
      if (!this.validatePhase()) {
        throw new Error('Phase validation failed');
      }
      
      // Mark phase complete
      this.markPhaseComplete(phaseNumber);
      this.tools.log(`✅ Phase ${phaseNumber} completed successfully`);
      
    } catch (error) {
      this.tools.log(`❌ Phase ${phaseNumber} failed: ${error.message}`);
      this.tools.log('Rolling back to previous checkpoint...');
      this.rollbackToCheckpoint(phaseNumber);
      throw error;
    }
  }

  /**
   * Create git checkpoint before phase
   */
  createCheckpoint(phaseNumber) {
    const message = `checkpoint: before phase ${phaseNumber}`;
    execSync(`git add -A && git commit -m "${message}"`, {
      cwd: path.join(__dirname, '..'),
      stdio: 'pipe'
    });
    this.tools.log(`Created checkpoint: ${message}`);
  }

  /**
   * Mark phase as complete with git tag
   */
  markPhaseComplete(phaseNumber) {
    const message = `refactor: phase ${phaseNumber} complete`;
    execSync(`git add -A && git commit -m "${message}"`, {
      cwd: path.join(__dirname, '..'),
      stdio: 'pipe'
    });
    
    const tag = `phase-${phaseNumber}-complete`;
    execSync(`git tag ${tag}`, {
      cwd: path.join(__dirname, '..'),
      stdio: 'pipe'
    });
    this.tools.log(`Phase ${phaseNumber} marked complete with tag: ${tag}`);
  }

  /**
   * Rollback to previous checkpoint
   */
  rollbackToCheckpoint(phaseNumber) {
    try {
      execSync(`git reset --hard HEAD~1`, {
        cwd: path.join(__dirname, '..'),
        stdio: 'pipe'
      });
      this.tools.log(`Rolled back phase ${phaseNumber}`);
    } catch (error) {
      this.tools.log(`Failed to rollback: ${error.message}`);
    }
  }

  /**
   * Validate phase completion
   */
  validatePhase() {
    this.tools.log('Validating phase completion...');
    
    // TypeScript validation
    if (!this.tools.validateTypeScript()) {
      return false;
    }
    
    // Test validation
    if (!this.tools.runTests()) {
      return false;
    }
    
    this.tools.log('✅ Phase validation passed');
    return true;
  }

  /**
   * Phase 2: Component Reorganization
   */
  async executePhase2() {
    await this.executePhase(2, 'Component Reorganization', async () => {
      // 2.1 Create new directories
      this.tools.createNewDirectories();
      
      // 2.2 Move feature components
      const componentMoves = [
        ['src/components/dashboard.tsx', 'src/components/features/dashboard/dashboard.tsx'],
        ['src/components/send.tsx', 'src/components/features/transfers/send.tsx'],
        ['src/components/receive.tsx', 'src/components/features/transfers/receive.tsx'],
        ['src/components/deposit.tsx', 'src/components/features/wallet/deposit.tsx'],
        ['src/components/withdraw.tsx', 'src/components/features/wallet/withdraw.tsx'],
        ['src/components/wallet.tsx', 'src/components/features/wallet/wallet.tsx'],
        ['src/components/sell.tsx', 'src/components/features/trading/sell.tsx'],
        ['src/components/login.tsx', 'src/components/features/auth/login.tsx'],
        ['src/components/signup.tsx', 'src/components/features/auth/signup.tsx'],
        ['src/components/transaction-details.tsx', 'src/components/features/transactions/transaction-details.tsx']
      ];

      for (const [oldPath, newPath] of componentMoves) {
        const fullOldPath = path.join(__dirname, '..', oldPath);
        const fullNewPath = path.join(__dirname, '..', newPath);
        
        if (require('fs').existsSync(fullOldPath)) {
          this.tools.moveFile(fullOldPath, fullNewPath);
        }
      }
      
      // 2.3 Update imports
      this.tools.updateAllImports(this.tools.getComponentImportMappings());
      
      // 2.4 Remove old files (after validation)
      for (const [oldPath] of componentMoves) {
        const fullOldPath = path.join(__dirname, '..', oldPath);
        this.tools.removeOldFile(fullOldPath);
      }
    });
  }

  /**
   * Phase 3: Library Simplification
   */
  async executePhase3() {
    await this.executePhase(3, 'Library Simplification', async () => {
      const fs = require('fs');
      
      // 3.1 Consolidate API client
      const apiFiles = [
        'src/lib/api/responses.ts',
        'src/lib/api/cors.ts'
      ];
      
      let consolidatedApi = `// Consolidated API client\n`;
      consolidatedApi += `import { NextResponse } from 'next/server';\n\n`;
      
      // Merge API files
      for (const file of apiFiles) {
        const fullPath = path.join(__dirname, '..', file);
        if (fs.existsSync(fullPath)) {
          const content = fs.readFileSync(fullPath, 'utf8');
          consolidatedApi += `// From ${file}\n${content}\n\n`;
        }
      }
      
      // Write consolidated API file
      fs.writeFileSync(path.join(__dirname, '..', 'src/lib/api.ts'), consolidatedApi);
      
      // 3.2 Rename validation file
      const oldValidation = path.join(__dirname, '..', 'src/lib/validation.ts');
      const newValidation = path.join(__dirname, '..', 'src/lib/validations.ts');
      
      if (fs.existsSync(oldValidation)) {
        this.tools.moveFile(oldValidation, newValidation);
      }
      
      // 3.3 Update imports
      this.tools.updateAllImports(this.tools.getComponentImportMappings());
    });
  }

  /**
   * Phase 4: Modern State Management
   */
  async executePhase4() {
    await this.executePhase(4, 'Modern State Management', async () => {
      // 4.1 Install React Query
      this.tools.log('Installing React Query...');
      execSync('npm install @tanstack/react-query', {
        cwd: path.join(__dirname, '..'),
        stdio: 'inherit'
      });
      
      // 4.2 Create API hooks (placeholder)
      const apiHooksContent = `// React Query API hooks
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// TODO: Implement API hooks
export const useAuth = () => {
  // Auth hooks implementation
};

export const useWallet = () => {
  // Wallet hooks implementation
};

export const useTransfers = () => {
  // Transfer hooks implementation
};
`;
      
      require('fs').writeFileSync(
        path.join(__dirname, '..', 'src/hooks/use-api.ts'),
        apiHooksContent
      );
    });
  }

  /**
   * Run all phases
   */
  async runAllPhases() {
    try {
      await this.executePhase2();
      await this.executePhase3();
      await this.executePhase4();
      
      this.tools.log('\n🎉 All phases completed successfully!');
      
    } catch (error) {
      this.tools.log(`\n💥 Refactoring failed at phase ${this.currentPhase}`);
      this.tools.log('Check the logs and fix issues before continuing.');
      process.exit(1);
    }
  }
}

// CLI usage
if (require.main === module) {
  const runner = new PhaseRunner();
  const command = process.argv[2];

  switch (command) {
    case 'phase2':
      runner.executePhase2();
      break;
    case 'phase3':
      runner.executePhase3();
      break;
    case 'phase4':
      runner.executePhase4();
      break;
    case 'all':
      runner.runAllPhases();
      break;
    default:
      console.log('Usage: node phase-runner.js [phase2|phase3|phase4|all]');
  }
}

module.exports = PhaseRunner;
