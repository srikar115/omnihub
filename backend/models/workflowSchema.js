/**
 * Workflow Schema - AI App Workflow Definitions
 * 
 * This module defines the schema for AI workflows (AI Apps).
 * Workflows are multi-step processes that chain AI model calls together
 * with data transformation, conditional logic, and human-in-the-loop support.
 * 
 * Use cases:
 * - Video ad generation (Arcads.ai style)
 * - Resume analysis with semantic search
 * - Content creation pipelines
 * - Multi-model image processing
 */

/**
 * @typedef {Object} WorkflowDefinition
 * @property {string} id - Unique workflow identifier
 * @property {string} name - Display name
 * @property {string} description - Workflow description
 * @property {string} category - Category (marketing, hr, content, etc.)
 * @property {string} icon - Icon name for UI
 * @property {string} color - Gradient color for UI
 * @property {boolean} isPublic - Whether workflow is available to all users
 * @property {number} estimatedCredits - Estimated credits for full run
 * @property {number} estimatedTime - Estimated time in seconds
 * @property {Array<WorkflowStep>} steps - Ordered list of steps
 * @property {Object} inputs - Required user inputs
 * @property {Object} outputs - Final outputs definition
 * @property {Object} settings - Workflow-level settings
 */

/**
 * @typedef {Object} WorkflowStep
 * @property {string} id - Step identifier (unique within workflow)
 * @property {string} name - Display name
 * @property {string} type - Step type (llm, image, video, tts, transform, condition, human)
 * @property {string} [model] - AI model ID (if applicable)
 * @property {Object} config - Step-specific configuration
 * @property {Array<string>} dependsOn - IDs of steps this depends on
 * @property {Object} inputs - Input mapping (can reference other step outputs)
 * @property {Object} outputs - Output definitions
 * @property {Object} [condition] - Conditional execution rules
 * @property {boolean} [optional] - Whether step can be skipped
 * @property {number} [retryCount] - Number of retries on failure
 * @property {number} [timeout] - Step timeout in seconds
 */

// ============ STEP TYPES ============

const STEP_TYPES = {
  // AI Generation Steps
  LLM: 'llm',           // Text generation (GPT, Claude, etc.)
  IMAGE: 'image',       // Image generation (FLUX, SDXL, etc.)
  VIDEO: 'video',       // Video generation (Kling, Luma, etc.)
  TTS: 'tts',           // Text-to-speech
  STT: 'stt',           // Speech-to-text
  EMBEDDING: 'embedding', // Vector embedding generation
  
  // Processing Steps
  TRANSFORM: 'transform',   // Data transformation
  MERGE: 'merge',           // Merge multiple inputs
  SPLIT: 'split',           // Split data into parts
  FILTER: 'filter',         // Filter/validate data
  
  // Control Flow
  CONDITION: 'condition',   // Conditional branching
  LOOP: 'loop',             // Loop over array
  PARALLEL: 'parallel',     // Parallel execution
  WAIT: 'wait',             // Wait for duration
  
  // Human Interaction
  HUMAN: 'human',           // Human approval/input
  FORM: 'form',             // User form input
  REVIEW: 'review',         // Content review step
  
  // External
  WEBHOOK: 'webhook',       // External API call
  STORAGE: 'storage',       // Save to storage
  EMAIL: 'email',           // Send email notification
};

// ============ INPUT REFERENCE SYNTAX ============
// Use ${stepId.outputName} to reference outputs from other steps
// Use ${input.fieldName} to reference workflow inputs
// Use ${env.VARIABLE} to reference environment variables

const INPUT_REFERENCE_PATTERN = /\$\{([^}]+)\}/g;

/**
 * Parse input references in a string
 * @param {string} value - String with ${...} references
 * @returns {Array<{type: string, path: string}>} - Parsed references
 */
function parseReferences(value) {
  const refs = [];
  let match;
  while ((match = INPUT_REFERENCE_PATTERN.exec(value)) !== null) {
    const [, path] = match;
    const [type, ...rest] = path.split('.');
    refs.push({ type, path: rest.join('.'), full: path });
  }
  return refs;
}

// ============ EXAMPLE WORKFLOWS ============

/**
 * Example: Video Ad Generator (Arcads.ai style)
 */
const VIDEO_AD_WORKFLOW = {
  id: 'video-ad-generator',
  name: 'AI Video Ad Generator',
  description: 'Create professional video ads with AI-generated scripts, voiceovers, and visuals',
  category: 'marketing',
  icon: 'Video',
  color: 'from-purple-500 to-pink-500',
  isPublic: true,
  estimatedCredits: 50,
  estimatedTime: 300,
  
  inputs: {
    productName: {
      type: 'text',
      label: 'Product Name',
      required: true,
      placeholder: 'Enter your product name'
    },
    productDescription: {
      type: 'textarea',
      label: 'Product Description',
      required: true,
      placeholder: 'Describe your product...'
    },
    targetAudience: {
      type: 'text',
      label: 'Target Audience',
      required: true,
      placeholder: 'e.g., Young professionals, 25-35'
    },
    adStyle: {
      type: 'select',
      label: 'Ad Style',
      options: ['professional', 'casual', 'energetic', 'luxury'],
      default: 'professional'
    },
    duration: {
      type: 'select',
      label: 'Video Duration',
      options: ['15', '30', '60'],
      default: '30'
    }
  },
  
  steps: [
    {
      id: 'generate-script',
      name: 'Generate Ad Script',
      type: STEP_TYPES.LLM,
      model: 'gpt-4o',
      config: {
        temperature: 0.7,
        maxTokens: 500
      },
      inputs: {
        prompt: `You are an expert ad copywriter. Create a ${"\${input.duration}"}-second video ad script for:

Product: ${"\${input.productName}"}
Description: ${"\${input.productDescription}"}
Target Audience: ${"\${input.targetAudience}"}
Style: ${"\${input.adStyle}"}

Format your response as:
HOOK: [Opening hook, 3-5 seconds]
PROBLEM: [Problem statement, 5-7 seconds]
SOLUTION: [How product solves it, 10-15 seconds]
CTA: [Call to action, 3-5 seconds]

Keep it punchy and engaging.`
      },
      outputs: {
        script: { type: 'text', description: 'Generated ad script' }
      },
      dependsOn: []
    },
    {
      id: 'extract-scenes',
      name: 'Extract Scene Descriptions',
      type: STEP_TYPES.LLM,
      model: 'gpt-4o-mini',
      config: {
        temperature: 0.3
      },
      inputs: {
        prompt: `Given this ad script, extract 4 visual scene descriptions for video generation:

Script: ${"\${generate-script.script}"}

Return a JSON array of 4 scene descriptions, each should be a detailed image prompt suitable for AI image generation. Focus on visual elements, composition, and mood.

Example format:
["Scene 1 description...", "Scene 2 description...", ...]`
      },
      outputs: {
        scenes: { type: 'json', description: 'Array of scene descriptions' }
      },
      dependsOn: ['generate-script']
    },
    {
      id: 'generate-voiceover',
      name: 'Generate Voiceover',
      type: STEP_TYPES.TTS,
      model: 'elevenlabs-turbo',
      config: {
        voice: 'professional-male',
        speed: 1.0
      },
      inputs: {
        text: '${generate-script.script}'
      },
      outputs: {
        audio: { type: 'audio', description: 'Voiceover audio file' },
        duration: { type: 'number', description: 'Audio duration in seconds' }
      },
      dependsOn: ['generate-script']
    },
    {
      id: 'generate-images',
      name: 'Generate Scene Images',
      type: STEP_TYPES.LOOP,
      config: {
        items: '${extract-scenes.scenes}',
        parallel: true,
        maxParallel: 2
      },
      steps: [
        {
          id: 'scene-image',
          type: STEP_TYPES.IMAGE,
          model: 'flux-pro-1.1',
          inputs: {
            prompt: '${item}, professional advertising photography, high quality, 16:9 aspect ratio'
          },
          outputs: {
            image: { type: 'image' }
          }
        }
      ],
      outputs: {
        images: { type: 'array', items: 'image' }
      },
      dependsOn: ['extract-scenes']
    },
    {
      id: 'human-review',
      name: 'Review Generated Content',
      type: STEP_TYPES.HUMAN,
      config: {
        message: 'Please review the generated script and images before creating the final video.',
        actions: ['approve', 'regenerate', 'edit']
      },
      inputs: {
        script: '${generate-script.script}',
        images: '${generate-images.images}'
      },
      outputs: {
        approved: { type: 'boolean' },
        editedScript: { type: 'text', optional: true }
      },
      dependsOn: ['generate-script', 'generate-images']
    },
    {
      id: 'create-video',
      name: 'Create Final Video',
      type: STEP_TYPES.VIDEO,
      model: 'kling-1.5-pro',
      condition: {
        if: '${human-review.approved}',
        equals: true
      },
      inputs: {
        images: '${generate-images.images}',
        audio: '${generate-voiceover.audio}',
        duration: '${input.duration}'
      },
      outputs: {
        video: { type: 'video', description: 'Final video ad' }
      },
      dependsOn: ['generate-images', 'generate-voiceover', 'human-review']
    }
  ],
  
  outputs: {
    video: '${create-video.video}',
    script: '${generate-script.script}',
    images: '${generate-images.images}',
    voiceover: '${generate-voiceover.audio}'
  },
  
  settings: {
    allowPartialExecution: true,
    saveIntermediateResults: true,
    notifyOnCompletion: true
  }
};

/**
 * Example: Resume Analyzer (HR Tool)
 */
const RESUME_ANALYZER_WORKFLOW = {
  id: 'resume-analyzer',
  name: 'AI Resume Analyzer',
  description: 'Analyze resumes against job requirements using semantic search and AI',
  category: 'hr',
  icon: 'FileText',
  color: 'from-blue-500 to-cyan-500',
  isPublic: true,
  estimatedCredits: 5,
  estimatedTime: 60,
  
  inputs: {
    resume: {
      type: 'file',
      label: 'Resume (PDF)',
      accept: '.pdf,.docx',
      required: true
    },
    jobDescription: {
      type: 'textarea',
      label: 'Job Description',
      required: true
    },
    requirements: {
      type: 'textarea',
      label: 'Key Requirements (one per line)',
      required: true
    }
  },
  
  steps: [
    {
      id: 'extract-resume',
      name: 'Extract Resume Text',
      type: STEP_TYPES.TRANSFORM,
      config: {
        operation: 'pdf-to-text'
      },
      inputs: {
        file: '${input.resume}'
      },
      outputs: {
        text: { type: 'text' }
      },
      dependsOn: []
    },
    {
      id: 'embed-resume',
      name: 'Create Resume Embeddings',
      type: STEP_TYPES.EMBEDDING,
      model: 'text-embedding-3-small',
      inputs: {
        text: '${extract-resume.text}'
      },
      outputs: {
        embedding: { type: 'vector' }
      },
      dependsOn: ['extract-resume']
    },
    {
      id: 'embed-requirements',
      name: 'Create Requirements Embeddings',
      type: STEP_TYPES.EMBEDDING,
      model: 'text-embedding-3-small',
      inputs: {
        text: '${input.requirements}'
      },
      outputs: {
        embedding: { type: 'vector' }
      },
      dependsOn: []
    },
    {
      id: 'semantic-match',
      name: 'Semantic Matching',
      type: STEP_TYPES.TRANSFORM,
      config: {
        operation: 'cosine-similarity'
      },
      inputs: {
        vectorA: '${embed-resume.embedding}',
        vectorB: '${embed-requirements.embedding}'
      },
      outputs: {
        score: { type: 'number' },
        matches: { type: 'json' }
      },
      dependsOn: ['embed-resume', 'embed-requirements']
    },
    {
      id: 'analyze',
      name: 'AI Analysis',
      type: STEP_TYPES.LLM,
      model: 'gpt-4o',
      inputs: {
        prompt: `Analyze this resume against the job requirements.

RESUME:
${"\${extract-resume.text}"}

JOB DESCRIPTION:
${"\${input.jobDescription}"}

KEY REQUIREMENTS:
${"\${input.requirements}"}

SEMANTIC MATCH SCORE: ${"\${semantic-match.score}"}

Provide:
1. Overall fit score (0-100)
2. Matching skills and experience
3. Missing requirements
4. Red flags or concerns
5. Recommended interview questions

Format as structured JSON.`
      },
      outputs: {
        analysis: { type: 'json' }
      },
      dependsOn: ['extract-resume', 'semantic-match']
    }
  ],
  
  outputs: {
    analysis: '${analyze.analysis}',
    matchScore: '${semantic-match.score}'
  }
};

/**
 * Example: Content Creation Pipeline
 */
const CONTENT_CREATION_WORKFLOW = {
  id: 'content-pipeline',
  name: 'Content Creation Pipeline',
  description: 'Generate blog posts with AI images and social media variants',
  category: 'content',
  icon: 'PenTool',
  color: 'from-green-500 to-teal-500',
  isPublic: true,
  estimatedCredits: 15,
  estimatedTime: 120,
  
  inputs: {
    topic: { type: 'text', label: 'Topic', required: true },
    keywords: { type: 'text', label: 'Keywords (comma-separated)' },
    tone: { 
      type: 'select', 
      label: 'Tone',
      options: ['professional', 'casual', 'educational', 'entertaining'],
      default: 'professional'
    },
    wordCount: {
      type: 'number',
      label: 'Target Word Count',
      default: 800,
      min: 300,
      max: 2000
    }
  },
  
  steps: [
    {
      id: 'outline',
      name: 'Generate Outline',
      type: STEP_TYPES.LLM,
      model: 'gpt-4o-mini',
      inputs: {
        prompt: `Create a detailed blog post outline for: "${"\${input.topic}"}"
Keywords: ${"\${input.keywords}"}
Target: ${"\${input.wordCount}"} words
Tone: ${"\${input.tone}"}

Include 4-6 main sections with bullet points.`
      },
      outputs: { outline: { type: 'text' } },
      dependsOn: []
    },
    {
      id: 'write-post',
      name: 'Write Blog Post',
      type: STEP_TYPES.LLM,
      model: 'gpt-4o',
      config: { temperature: 0.7 },
      inputs: {
        prompt: `Write a complete blog post based on this outline:

${"\${outline.outline}"}

Make it engaging, informative, and approximately ${"\${input.wordCount}"} words.
Tone: ${"\${input.tone}"}

Include a compelling introduction and conclusion.`
      },
      outputs: { article: { type: 'text' } },
      dependsOn: ['outline']
    },
    {
      id: 'generate-hero',
      name: 'Generate Hero Image',
      type: STEP_TYPES.IMAGE,
      model: 'flux-pro-1.1',
      inputs: {
        prompt: `Professional blog header image for article about: ${"\${input.topic}"}. Modern, clean design, 16:9 aspect ratio, suitable for professional blog.`
      },
      outputs: { image: { type: 'image' } },
      dependsOn: []
    },
    {
      id: 'social-variants',
      name: 'Generate Social Posts',
      type: STEP_TYPES.LLM,
      model: 'gpt-4o-mini',
      inputs: {
        prompt: `Create social media variants for this blog post:

${"\${write-post.article}"}

Generate:
1. Twitter/X thread (5 tweets)
2. LinkedIn post (professional tone)
3. Instagram caption (engaging, with emojis)

Format as JSON with keys: twitter, linkedin, instagram`
      },
      outputs: { socialPosts: { type: 'json' } },
      dependsOn: ['write-post']
    }
  ],
  
  outputs: {
    article: '${write-post.article}',
    heroImage: '${generate-hero.image}',
    socialPosts: '${social-variants.socialPosts}'
  }
};

// ============ WORKFLOW REGISTRY ============

const WORKFLOW_REGISTRY = {
  'video-ad-generator': VIDEO_AD_WORKFLOW,
  'resume-analyzer': RESUME_ANALYZER_WORKFLOW,
  'content-pipeline': CONTENT_CREATION_WORKFLOW,
};

// ============ DATABASE SCHEMA (SQL) ============

const WORKFLOW_DB_SCHEMA = `
-- Workflow Templates
CREATE TABLE IF NOT EXISTS workflows (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  icon TEXT DEFAULT 'Workflow',
  color TEXT DEFAULT 'from-purple-500 to-pink-500',
  isPublic INTEGER DEFAULT 0,
  estimatedCredits REAL DEFAULT 0,
  estimatedTime INTEGER DEFAULT 60,
  definition TEXT NOT NULL, -- JSON workflow definition
  createdBy TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  version INTEGER DEFAULT 1,
  isActive INTEGER DEFAULT 1
);

-- Workflow Runs (Executions)
CREATE TABLE IF NOT EXISTS workflow_runs (
  id TEXT PRIMARY KEY,
  workflowId TEXT NOT NULL REFERENCES workflows(id),
  userId TEXT NOT NULL REFERENCES users(id),
  workspaceId TEXT REFERENCES workspaces(id),
  status TEXT DEFAULT 'pending', -- pending, running, paused, completed, failed, cancelled
  inputs TEXT, -- JSON user inputs
  outputs TEXT, -- JSON final outputs
  state TEXT, -- JSON current execution state
  currentStepId TEXT,
  creditsUsed REAL DEFAULT 0,
  startedAt TIMESTAMP,
  completedAt TIMESTAMP,
  error TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Step Executions
CREATE TABLE IF NOT EXISTS workflow_step_runs (
  id TEXT PRIMARY KEY,
  runId TEXT NOT NULL REFERENCES workflow_runs(id) ON DELETE CASCADE,
  stepId TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, running, completed, failed, skipped
  inputs TEXT, -- JSON resolved inputs
  outputs TEXT, -- JSON step outputs
  error TEXT,
  creditsUsed REAL DEFAULT 0,
  startedAt TIMESTAMP,
  completedAt TIMESTAMP,
  retryCount INTEGER DEFAULT 0
);

-- Human-in-the-loop Tasks
CREATE TABLE IF NOT EXISTS workflow_tasks (
  id TEXT PRIMARY KEY,
  runId TEXT NOT NULL REFERENCES workflow_runs(id) ON DELETE CASCADE,
  stepId TEXT NOT NULL,
  userId TEXT REFERENCES users(id),
  type TEXT DEFAULT 'approval', -- approval, input, review
  title TEXT NOT NULL,
  description TEXT,
  data TEXT, -- JSON data to display
  response TEXT, -- JSON user response
  status TEXT DEFAULT 'pending', -- pending, completed, expired
  expiresAt TIMESTAMP,
  completedAt TIMESTAMP,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Workflow Categories
CREATE TABLE IF NOT EXISTS workflow_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT 'Folder',
  color TEXT DEFAULT 'from-gray-500 to-gray-600',
  displayOrder INTEGER DEFAULT 0
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_workflow_runs_userId ON workflow_runs(userId);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_status ON workflow_runs(status);
CREATE INDEX IF NOT EXISTS idx_workflow_step_runs_runId ON workflow_step_runs(runId);
CREATE INDEX IF NOT EXISTS idx_workflow_tasks_runId ON workflow_tasks(runId);
CREATE INDEX IF NOT EXISTS idx_workflow_tasks_userId ON workflow_tasks(userId);
`;

// ============ EXPORTS ============

module.exports = {
  // Types
  STEP_TYPES,
  
  // Helpers
  parseReferences,
  
  // Example workflows
  VIDEO_AD_WORKFLOW,
  RESUME_ANALYZER_WORKFLOW,
  CONTENT_CREATION_WORKFLOW,
  
  // Registry
  WORKFLOW_REGISTRY,
  
  // Schema
  WORKFLOW_DB_SCHEMA,
  
  // Get workflow by ID
  getWorkflow: (id) => WORKFLOW_REGISTRY[id],
  
  // List all workflows
  listWorkflows: () => Object.values(WORKFLOW_REGISTRY),
  
  // Validate workflow definition
  validateWorkflow: (workflow) => {
    const errors = [];
    
    if (!workflow.id) errors.push('Workflow ID is required');
    if (!workflow.name) errors.push('Workflow name is required');
    if (!workflow.steps || workflow.steps.length === 0) {
      errors.push('Workflow must have at least one step');
    }
    
    // Validate steps
    const stepIds = new Set();
    for (const step of workflow.steps || []) {
      if (!step.id) errors.push('Step ID is required');
      if (stepIds.has(step.id)) errors.push(`Duplicate step ID: ${step.id}`);
      stepIds.add(step.id);
      
      if (!step.type) errors.push(`Step ${step.id} missing type`);
      if (!Object.values(STEP_TYPES).includes(step.type)) {
        errors.push(`Step ${step.id} has invalid type: ${step.type}`);
      }
      
      // Validate dependencies exist
      for (const dep of step.dependsOn || []) {
        if (!stepIds.has(dep) && dep !== step.id) {
          // Check if it's defined later
          const depStep = workflow.steps.find(s => s.id === dep);
          if (!depStep) {
            errors.push(`Step ${step.id} depends on unknown step: ${dep}`);
          }
        }
      }
    }
    
    return { valid: errors.length === 0, errors };
  }
};
