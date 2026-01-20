/**
 * Workflow Execution Engine
 * 
 * Handles the execution of multi-step AI workflows with:
 * - Dependency resolution (topological sort)
 * - State persistence between steps
 * - Error handling and automatic retries
 * - Human-in-the-loop task creation
 * - Credit tracking per step
 * - Parallel step execution
 */

const { v4: uuidv4 } = require('uuid');
const { STEP_TYPES, parseReferences } = require('../models/workflowSchema');

// ============ WORKFLOW EXECUTOR CLASS ============

class WorkflowExecutor {
  /**
   * @param {Object} options
   * @param {Object} options.db - Database connection
   * @param {Function} options.getSetting - Function to get settings
   * @param {Object} options.providers - Provider functions for generation
   * @param {Function} options.logError - Error logging function
   */
  constructor({ db, getSetting, providers, logError }) {
    this.db = db;
    this.getSetting = getSetting;
    this.providers = providers;
    this.logError = logError;
    this.activeRuns = new Map();
  }

  /**
   * Start a new workflow run
   * @param {string} workflowId - Workflow template ID
   * @param {string} userId - User starting the workflow
   * @param {Object} inputs - User-provided inputs
   * @param {string} [workspaceId] - Optional workspace
   * @returns {Promise<Object>} - Run info
   */
  async startRun(workflowId, userId, inputs, workspaceId = null) {
    // Get workflow definition
    const workflow = await this.getWorkflow(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    // Validate inputs
    this.validateInputs(workflow, inputs);

    // Create run record
    const runId = uuidv4();
    const run = {
      id: runId,
      workflowId,
      userId,
      workspaceId,
      status: 'pending',
      inputs: JSON.stringify(inputs),
      state: JSON.stringify({
        completedSteps: [],
        stepOutputs: {},
        currentStep: null
      }),
      creditsUsed: 0,
      createdAt: new Date().toISOString()
    };

    // Insert run record
    await this.insertRun(run);

    // Start execution in background
    this.executeRun(runId, workflow, inputs).catch(err => {
      console.error(`[WORKFLOW] Run ${runId} failed:`, err.message);
    });

    return { runId, status: 'pending', workflowId, workflowName: workflow.name };
  }

  /**
   * Execute a workflow run
   * @param {string} runId - Run ID
   * @param {Object} workflow - Workflow definition
   * @param {Object} inputs - User inputs
   */
  async executeRun(runId, workflow, inputs) {
    console.log(`[WORKFLOW] Starting execution: ${runId}`);

    // Mark as running
    await this.updateRunStatus(runId, 'running', { startedAt: new Date().toISOString() });

    // Get execution order (topological sort)
    const executionOrder = this.getExecutionOrder(workflow.steps);
    console.log(`[WORKFLOW] Execution order: ${executionOrder.join(' → ')}`);

    // Initialize state
    let state = {
      completedSteps: [],
      stepOutputs: { input: inputs },
      currentStep: null
    };

    try {
      // Execute steps in order
      for (const stepId of executionOrder) {
        const step = workflow.steps.find(s => s.id === stepId);
        
        // Check if dependencies are met
        if (!this.areDependenciesMet(step, state.completedSteps)) {
          console.log(`[WORKFLOW] Step ${stepId} dependencies not met, skipping`);
          continue;
        }

        // Check conditions
        if (step.condition && !this.evaluateCondition(step.condition, state.stepOutputs)) {
          console.log(`[WORKFLOW] Step ${stepId} condition not met, skipping`);
          state.completedSteps.push(stepId);
          continue;
        }

        // Update current step
        state.currentStep = stepId;
        await this.updateRunState(runId, state);

        // Execute step
        console.log(`[WORKFLOW] Executing step: ${stepId} (${step.type})`);
        const stepResult = await this.executeStep(runId, step, state.stepOutputs, workflow);

        // Handle human-in-the-loop
        if (stepResult.requiresHuman) {
          console.log(`[WORKFLOW] Step ${stepId} requires human input, pausing`);
          await this.updateRunStatus(runId, 'paused', { currentStepId: stepId });
          await this.updateRunState(runId, state);
          return; // Will resume when human task is completed
        }

        // Store step outputs
        state.stepOutputs[stepId] = stepResult.outputs;
        state.completedSteps.push(stepId);

        // Update credits
        if (stepResult.creditsUsed) {
          await this.addCreditsToRun(runId, stepResult.creditsUsed);
        }

        // Persist state
        await this.updateRunState(runId, state);
      }

      // All steps completed - build final outputs
      const finalOutputs = this.buildFinalOutputs(workflow.outputs, state.stepOutputs);

      // Mark as completed
      await this.updateRunStatus(runId, 'completed', {
        outputs: JSON.stringify(finalOutputs),
        completedAt: new Date().toISOString()
      });

      console.log(`[WORKFLOW] Run ${runId} completed successfully`);

    } catch (error) {
      console.error(`[WORKFLOW] Run ${runId} failed:`, error.message);
      
      await this.updateRunStatus(runId, 'failed', {
        error: error.message,
        completedAt: new Date().toISOString()
      });

      if (this.logError) {
        this.logError('workflow', null, runId, workflow.id, 'execution_failed', error.message, error.stack);
      }
    }
  }

  /**
   * Execute a single step
   * @param {string} runId - Run ID
   * @param {Object} step - Step definition
   * @param {Object} context - Current outputs context
   * @param {Object} workflow - Full workflow definition
   * @returns {Promise<Object>} - Step result
   */
  async executeStep(runId, step, context, workflow) {
    const stepRunId = uuidv4();
    const startTime = new Date().toISOString();

    // Create step run record
    await this.insertStepRun({
      id: stepRunId,
      runId,
      stepId: step.id,
      status: 'running',
      startedAt: startTime
    });

    try {
      // Resolve input references
      const resolvedInputs = this.resolveInputs(step.inputs || {}, context);

      // Update step with resolved inputs
      await this.updateStepRun(stepRunId, { inputs: JSON.stringify(resolvedInputs) });

      let outputs = {};
      let creditsUsed = 0;
      let requiresHuman = false;

      // Execute based on step type
      switch (step.type) {
        case STEP_TYPES.LLM:
          ({ outputs, creditsUsed } = await this.executeLLMStep(step, resolvedInputs));
          break;

        case STEP_TYPES.IMAGE:
          ({ outputs, creditsUsed } = await this.executeImageStep(step, resolvedInputs));
          break;

        case STEP_TYPES.VIDEO:
          ({ outputs, creditsUsed } = await this.executeVideoStep(step, resolvedInputs));
          break;

        case STEP_TYPES.TRANSFORM:
          outputs = await this.executeTransformStep(step, resolvedInputs);
          break;

        case STEP_TYPES.HUMAN:
          requiresHuman = true;
          await this.createHumanTask(runId, step, resolvedInputs);
          break;

        case STEP_TYPES.LOOP:
          ({ outputs, creditsUsed } = await this.executeLoopStep(step, resolvedInputs, context, workflow));
          break;

        case STEP_TYPES.CONDITION:
          outputs = this.executeConditionStep(step, resolvedInputs, context);
          break;

        case STEP_TYPES.EMBEDDING:
          ({ outputs, creditsUsed } = await this.executeEmbeddingStep(step, resolvedInputs));
          break;

        case STEP_TYPES.WEBHOOK:
          outputs = await this.executeWebhookStep(step, resolvedInputs);
          break;

        default:
          throw new Error(`Unknown step type: ${step.type}`);
      }

      // Mark step as completed
      await this.updateStepRun(stepRunId, {
        status: requiresHuman ? 'pending' : 'completed',
        outputs: JSON.stringify(outputs),
        creditsUsed,
        completedAt: requiresHuman ? null : new Date().toISOString()
      });

      return { outputs, creditsUsed, requiresHuman };

    } catch (error) {
      console.error(`[WORKFLOW] Step ${step.id} failed:`, error.message);

      // Check if we should retry
      const retryCount = step.retryCount || 0;
      const currentRetry = await this.getStepRetryCount(stepRunId);

      if (currentRetry < retryCount) {
        console.log(`[WORKFLOW] Retrying step ${step.id} (${currentRetry + 1}/${retryCount})`);
        await this.updateStepRun(stepRunId, { retryCount: currentRetry + 1 });
        return this.executeStep(runId, step, context, workflow);
      }

      // Mark as failed
      await this.updateStepRun(stepRunId, {
        status: 'failed',
        error: error.message,
        completedAt: new Date().toISOString()
      });

      throw error;
    }
  }

  // ============ STEP TYPE EXECUTORS ============

  async executeLLMStep(step, inputs) {
    const model = step.model || 'gpt-4o-mini';
    const config = step.config || {};

    // Call LLM via OpenRouter or other provider
    const prompt = inputs.prompt;
    if (!prompt) throw new Error('LLM step requires prompt input');

    // Use OpenRouter for chat/LLM
    if (this.providers?.callOpenRouter) {
      const response = await this.providers.callOpenRouter(model, prompt, [], this.getSetting('openrouterApiKey'));
      return {
        outputs: { [Object.keys(step.outputs)[0]]: response },
        creditsUsed: this.calculateLLMCredits(model, prompt.length)
      };
    }

    throw new Error('LLM provider not configured');
  }

  async executeImageStep(step, inputs) {
    const model = step.model || 'flux-schnell';
    const prompt = inputs.prompt;
    if (!prompt) throw new Error('Image step requires prompt input');

    if (this.providers?.generateImage) {
      const result = await this.providers.generateImage(model, prompt, inputs.options || {}, inputs.images || []);
      return {
        outputs: { image: result.url || result.urls?.[0] },
        creditsUsed: this.calculateImageCredits(model)
      };
    }

    throw new Error('Image provider not configured');
  }

  async executeVideoStep(step, inputs) {
    const model = step.model || 'kling-1.5';
    const prompt = inputs.prompt;

    if (this.providers?.generateVideo) {
      const result = await this.providers.generateVideo(model, prompt, inputs.options || {}, inputs.images || []);
      return {
        outputs: { video: result.url },
        creditsUsed: this.calculateVideoCredits(model)
      };
    }

    throw new Error('Video provider not configured');
  }

  async executeEmbeddingStep(step, inputs) {
    const model = step.model || 'text-embedding-3-small';
    const text = inputs.text;
    if (!text) throw new Error('Embedding step requires text input');

    // For now, return a placeholder
    // In production, call OpenAI or other embedding provider
    console.log(`[WORKFLOW] Embedding step would process: ${text.substring(0, 50)}...`);
    return {
      outputs: { embedding: new Array(1536).fill(0).map(() => Math.random()) },
      creditsUsed: 0.01
    };
  }

  async executeTransformStep(step, inputs) {
    const operation = step.config?.operation;
    
    switch (operation) {
      case 'pdf-to-text':
        // Placeholder - would use PDF extraction library
        return { text: inputs.file?.content || 'Extracted text placeholder' };
      
      case 'cosine-similarity':
        // Calculate cosine similarity between vectors
        const score = this.cosineSimilarity(inputs.vectorA, inputs.vectorB);
        return { score, matches: [] };
      
      case 'json-parse':
        return { data: JSON.parse(inputs.text) };
      
      case 'merge':
        return { merged: { ...inputs } };
      
      default:
        return inputs;
    }
  }

  executeConditionStep(step, inputs, context) {
    const condition = step.config?.condition;
    const result = this.evaluateCondition(condition, context);
    return { result };
  }

  async executeLoopStep(step, inputs, context, workflow) {
    const items = inputs.items || step.config?.items;
    const parallel = step.config?.parallel || false;
    const maxParallel = step.config?.maxParallel || 4;

    // Resolve items if it's a reference
    let itemsArray = Array.isArray(items) ? items : this.resolveValue(items, context);
    if (typeof itemsArray === 'string') {
      try { itemsArray = JSON.parse(itemsArray); } catch {}
    }

    if (!Array.isArray(itemsArray)) {
      throw new Error('Loop items must be an array');
    }

    const results = [];
    let totalCredits = 0;

    if (parallel) {
      // Execute in parallel batches
      for (let i = 0; i < itemsArray.length; i += maxParallel) {
        const batch = itemsArray.slice(i, i + maxParallel);
        const batchResults = await Promise.all(
          batch.map(async (item, idx) => {
            // Execute inner steps with item context
            const innerContext = { ...context, item, itemIndex: i + idx };
            // For now, just return the item - full implementation would execute nested steps
            return { item };
          })
        );
        results.push(...batchResults);
      }
    } else {
      // Execute sequentially
      for (let i = 0; i < itemsArray.length; i++) {
        const innerContext = { ...context, item: itemsArray[i], itemIndex: i };
        results.push({ item: itemsArray[i] });
      }
    }

    return {
      outputs: { items: results },
      creditsUsed: totalCredits
    };
  }

  async executeWebhookStep(step, inputs) {
    const url = step.config?.url;
    const method = step.config?.method || 'POST';
    
    // Would make HTTP request here
    console.log(`[WORKFLOW] Webhook: ${method} ${url}`);
    return { response: { success: true } };
  }

  async createHumanTask(runId, step, inputs) {
    const taskId = uuidv4();
    const task = {
      id: taskId,
      runId,
      stepId: step.id,
      type: step.config?.type || 'approval',
      title: step.name || 'Action Required',
      description: step.config?.message,
      data: JSON.stringify(inputs),
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    await this.insertHumanTask(task);
    console.log(`[WORKFLOW] Created human task: ${taskId}`);
  }

  // ============ HELPER METHODS ============

  /**
   * Topological sort for step execution order
   */
  getExecutionOrder(steps) {
    const graph = new Map();
    const inDegree = new Map();

    // Initialize
    for (const step of steps) {
      graph.set(step.id, []);
      inDegree.set(step.id, 0);
    }

    // Build graph
    for (const step of steps) {
      for (const dep of step.dependsOn || []) {
        if (graph.has(dep)) {
          graph.get(dep).push(step.id);
          inDegree.set(step.id, inDegree.get(step.id) + 1);
        }
      }
    }

    // Kahn's algorithm
    const queue = [];
    const order = [];

    for (const [id, degree] of inDegree) {
      if (degree === 0) queue.push(id);
    }

    while (queue.length > 0) {
      const id = queue.shift();
      order.push(id);

      for (const neighbor of graph.get(id)) {
        const newDegree = inDegree.get(neighbor) - 1;
        inDegree.set(neighbor, newDegree);
        if (newDegree === 0) queue.push(neighbor);
      }
    }

    return order;
  }

  /**
   * Check if all dependencies are complete
   */
  areDependenciesMet(step, completedSteps) {
    return (step.dependsOn || []).every(dep => completedSteps.includes(dep));
  }

  /**
   * Resolve input references
   */
  resolveInputs(inputs, context) {
    const resolved = {};
    for (const [key, value] of Object.entries(inputs)) {
      resolved[key] = this.resolveValue(value, context);
    }
    return resolved;
  }

  /**
   * Resolve a single value with references
   */
  resolveValue(value, context) {
    if (typeof value !== 'string') return value;

    // Replace all ${...} references
    return value.replace(/\$\{([^}]+)\}/g, (match, path) => {
      const parts = path.split('.');
      let result = context;
      for (const part of parts) {
        if (result && typeof result === 'object') {
          result = result[part];
        } else {
          return match; // Keep original if not found
        }
      }
      return result !== undefined ? result : match;
    });
  }

  /**
   * Evaluate a condition
   */
  evaluateCondition(condition, context) {
    if (!condition) return true;

    const value = this.resolveValue(condition.if, context);
    const expected = condition.equals;
    
    if (expected !== undefined) {
      return value === expected;
    }
    
    if (condition.notEquals !== undefined) {
      return value !== condition.notEquals;
    }
    
    if (condition.contains !== undefined) {
      return String(value).includes(condition.contains);
    }

    return Boolean(value);
  }

  /**
   * Build final outputs from references
   */
  buildFinalOutputs(outputDefs, context) {
    const outputs = {};
    for (const [key, ref] of Object.entries(outputDefs || {})) {
      outputs[key] = this.resolveValue(ref, context);
    }
    return outputs;
  }

  /**
   * Calculate cosine similarity
   */
  cosineSimilarity(a, b) {
    if (!a || !b || a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Validate user inputs against workflow definition
   */
  validateInputs(workflow, inputs) {
    const errors = [];
    
    for (const [key, def] of Object.entries(workflow.inputs || {})) {
      if (def.required && (inputs[key] === undefined || inputs[key] === '')) {
        errors.push(`Required input missing: ${key}`);
      }
    }
    
    if (errors.length > 0) {
      throw new Error(`Input validation failed: ${errors.join(', ')}`);
    }
  }

  // ============ CREDIT CALCULATIONS ============

  calculateLLMCredits(model, inputLength) {
    const rates = {
      'gpt-4o': 0.01,
      'gpt-4o-mini': 0.003,
      'claude-3-opus': 0.015,
      'claude-3-sonnet': 0.003
    };
    return (rates[model] || 0.005) * Math.ceil(inputLength / 1000);
  }

  calculateImageCredits(model) {
    const rates = {
      'flux-pro-1.1': 0.04,
      'flux-schnell': 0.003,
      'sdxl': 0.02
    };
    return rates[model] || 0.03;
  }

  calculateVideoCredits(model) {
    const rates = {
      'kling-1.5-pro': 0.5,
      'kling-1.5': 0.3,
      'luma-dream-machine': 0.4
    };
    return rates[model] || 0.4;
  }

  // ============ DATABASE OPERATIONS ============

  async getWorkflow(id) {
    const row = this.db.prepare('SELECT * FROM workflows WHERE id = ?').get(id);
    if (row) {
      row.definition = JSON.parse(row.definition);
      return { ...row.definition, ...row };
    }
    return null;
  }

  async insertRun(run) {
    this.db.prepare(`
      INSERT INTO workflow_runs (id, workflowId, userId, workspaceId, status, inputs, state, creditsUsed, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(run.id, run.workflowId, run.userId, run.workspaceId, run.status, run.inputs, run.state, run.creditsUsed, run.createdAt);
  }

  async updateRunStatus(runId, status, updates = {}) {
    const sets = ['status = ?'];
    const values = [status];

    for (const [key, value] of Object.entries(updates)) {
      sets.push(`${key} = ?`);
      values.push(value);
    }

    values.push(runId);
    this.db.prepare(`UPDATE workflow_runs SET ${sets.join(', ')} WHERE id = ?`).run(...values);
  }

  async updateRunState(runId, state) {
    this.db.prepare('UPDATE workflow_runs SET state = ? WHERE id = ?').run(JSON.stringify(state), runId);
  }

  async addCreditsToRun(runId, credits) {
    this.db.prepare('UPDATE workflow_runs SET creditsUsed = creditsUsed + ? WHERE id = ?').run(credits, runId);
  }

  async insertStepRun(stepRun) {
    this.db.prepare(`
      INSERT INTO workflow_step_runs (id, runId, stepId, status, startedAt)
      VALUES (?, ?, ?, ?, ?)
    `).run(stepRun.id, stepRun.runId, stepRun.stepId, stepRun.status, stepRun.startedAt);
  }

  async updateStepRun(stepRunId, updates) {
    const sets = [];
    const values = [];

    for (const [key, value] of Object.entries(updates)) {
      sets.push(`${key} = ?`);
      values.push(value);
    }

    if (sets.length > 0) {
      values.push(stepRunId);
      this.db.prepare(`UPDATE workflow_step_runs SET ${sets.join(', ')} WHERE id = ?`).run(...values);
    }
  }

  async getStepRetryCount(stepRunId) {
    const row = this.db.prepare('SELECT retryCount FROM workflow_step_runs WHERE id = ?').get(stepRunId);
    return row?.retryCount || 0;
  }

  async insertHumanTask(task) {
    this.db.prepare(`
      INSERT INTO workflow_tasks (id, runId, stepId, type, title, description, data, status, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(task.id, task.runId, task.stepId, task.type, task.title, task.description, task.data, task.status, task.createdAt);
  }

  /**
   * Resume a paused workflow run (after human task completion)
   */
  async resumeRun(runId, taskResponse) {
    const run = this.db.prepare('SELECT * FROM workflow_runs WHERE id = ?').get(runId);
    if (!run) throw new Error('Run not found');
    if (run.status !== 'paused') throw new Error('Run is not paused');

    const workflow = await this.getWorkflow(run.workflowId);
    const state = JSON.parse(run.state);
    const inputs = JSON.parse(run.inputs);

    // Add task response to context
    state.stepOutputs[state.currentStep] = taskResponse;
    state.completedSteps.push(state.currentStep);

    await this.updateRunState(runId, state);
    await this.updateRunStatus(runId, 'running');

    // Continue execution
    this.executeRun(runId, workflow, inputs).catch(err => {
      console.error(`[WORKFLOW] Resume failed:`, err.message);
    });
  }

  /**
   * Cancel a running workflow
   */
  async cancelRun(runId) {
    await this.updateRunStatus(runId, 'cancelled', {
      completedAt: new Date().toISOString()
    });
  }

  /**
   * Get run status with details
   */
  async getRunStatus(runId) {
    const run = this.db.prepare('SELECT * FROM workflow_runs WHERE id = ?').get(runId);
    if (!run) return null;

    const steps = this.db.prepare('SELECT * FROM workflow_step_runs WHERE runId = ? ORDER BY startedAt').all(runId);
    const tasks = this.db.prepare('SELECT * FROM workflow_tasks WHERE runId = ? AND status = ?').all(runId, 'pending');

    return {
      ...run,
      inputs: JSON.parse(run.inputs || '{}'),
      outputs: JSON.parse(run.outputs || '{}'),
      state: JSON.parse(run.state || '{}'),
      steps: steps.map(s => ({
        ...s,
        inputs: JSON.parse(s.inputs || '{}'),
        outputs: JSON.parse(s.outputs || '{}')
      })),
      pendingTasks: tasks.map(t => ({
        ...t,
        data: JSON.parse(t.data || '{}')
      }))
    };
  }
}

// ============ EXPORTS ============

module.exports = {
  WorkflowExecutor,
  
  // Factory function
  createWorkflowExecutor: (options) => new WorkflowExecutor(options),
};
