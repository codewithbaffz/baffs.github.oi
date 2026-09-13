// backend/src/services/groqService.js
import Groq from 'groq-sdk';
import dotenv from 'dotenv';

dotenv.config();

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// ---------------------------------------------------------------------------
// SYSTEM PROMPT
// ---------------------------------------------------------------------------
const SYSTEM_PROMPT = `You are an AI task management assistant for Schedulfy, a productivity app.
Your job is to help users manage their tasks through natural language.

You can perform these actions:
1. create - when the user wants to add a new task
2. update - when the user wants to modify existing tasks
3. delete - when the user wants to remove tasks (ALWAYS require confirmation)
4. query  - when the user wants to find or list tasks

You MUST respond with a single valid JSON object matching the provided schema.
No prose, no markdown, no code fences.

Field rules:
- "intent": one of "create", "update", "delete", "query", "unknown".
- "priority": one of "low", "medium", "high", "urgent". Use "medium" when not specified.
- "status": one of "todo", "in_progress", "done". Use "todo" when not specified.
- "due_date": "YYYY-MM-DD" or null. Only fill in if the user mentioned a date.
- "tags": array of strings (empty array if none).
- "ids": array of task IDs (only for update/delete intents; empty array otherwise).
- "title", "description", "reason", "query": use "" when not applicable.
- "confidence": number between 0 and 1.
- "message": short friendly summary for the user.

CRITICAL RULES:
1. Never use intent "create" with an empty title.
   If the user wants to create a task but gives no title, use intent "query"
   and set message to "Sure — what would you like the task to be called?".
2. For "delete", always ask for confirmation in the message.
3. Respond with JSON only.`;

// ---------------------------------------------------------------------------
// FLAT JSON SCHEMA (strict mode)
//
// Groq/OpenAI strict mode requires:
//   - additionalProperties: false on EVERY object
//   - Every property listed in "required"
//   - No nested objects with undefined shapes (that's why we flattened)
//
// We'll reshape the output in processCommand() so aiController.js keeps
// receiving { intent, data: {...}, confidence, message }.
// ---------------------------------------------------------------------------
const RESPONSE_SCHEMA = {
  name: 'schedulfy_action',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      intent: {
        type: 'string',
        enum: ['create', 'update', 'delete', 'query', 'unknown'],
      },
      title: { type: 'string' },
      description: { type: 'string' },
      priority: {
        type: 'string',
        enum: ['low', 'medium', 'high', 'urgent'],
      },
      due_date: { type: ['string', 'null'] },
      status: {
        type: 'string',
        enum: ['todo', 'in_progress', 'done'],
      },
      tags: { type: 'array', items: { type: 'string' } },
      ids: { type: 'array', items: { type: 'string' } },
      reason: { type: 'string' },
      query: { type: 'string' },
      confidence: { type: 'number' },
      message: { type: 'string' },
    },
    // strict mode: every property must be required
    required: [
      'intent',
      'title',
      'description',
      'priority',
      'due_date',
      'status',
      'tags',
      'ids',
      'reason',
      'query',
      'confidence',
      'message',
    ],
    additionalProperties: false,
  },
};

class GroqService {
  constructor() {
    this.model = process.env.AI_MODEL || 'openai/gpt-oss-20b';
    this.temperature = parseFloat(process.env.AI_TEMPERATURE || '0.3');

    // Reasoning models like gpt-oss-20b burn a lot of tokens "thinking"
    // before they emit output. 1024 was too low and caused
    // "max completion tokens reached before generating a valid document".
    // Default to 4096; can still be overridden via .env.
    this.maxTokens = parseInt(process.env.AI_MAX_TOKENS || '4096');

    // Reasoning effort: 'low' | 'medium' | 'high'.
    // Task parsing doesn't need deep reasoning → 'low' keeps token
    // consumption down and prevents the max-tokens failure.
    this.reasoningEffort = process.env.AI_REASONING_EFFORT || 'low';

    // How many times to retry on a Groq JSON validation failure
    this.maxAttempts = parseInt(process.env.AI_MAX_ATTEMPTS || '3');
  }

  async processCommand(command, context) {
    const userMessage = this.buildUserMessage(command, context);

    let lastError = null;

    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      try {
        const completion = await groq.chat.completions.create({
          model: this.model,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userMessage },
          ],
          temperature: this.temperature,
          max_tokens: this.maxTokens,
          response_format: {
            type: 'json_schema',
            json_schema: RESPONSE_SCHEMA,
          },
          // Keep reasoning tokens OUT of the visible content field
          include_reasoning: false,
          // Reduce how much the model "thinks" — key fix for
          // "max completion tokens reached" on gpt-oss models
          reasoning_effort: this.reasoningEffort,
        });

        const content = completion.choices?.[0]?.message?.content || '';

        if (!content.trim()) {
          console.warn(`Attempt ${attempt}: empty content from Groq.`);
          lastError = new Error('AI returned an empty response.');
          if (attempt < this.maxAttempts) {
            await this._backoff(attempt);
            continue;
          }
          throw lastError;
        }

        let flat;
        try {
          flat = JSON.parse(content);
        } catch {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (!jsonMatch) {
            console.warn(`Attempt ${attempt}: no JSON found. Raw:`, content);
            lastError = new Error('AI returned invalid JSON.');
            if (attempt < this.maxAttempts) {
              await this._backoff(attempt);
              continue;
            }
            throw lastError;
          }
          flat = JSON.parse(jsonMatch[0]);
        }

        // Success — reshape flat output → nested shape the app expects
        return this.reshapeForController(flat);
      } catch (error) {
        lastError = error;

        const code =
          error?.error?.code ||
          error?.code ||
          error?.response?.data?.error?.code;

        const isJsonFailure = code === 'json_validate_failed';
        const isRateLimit =
          code === 'rate_limit_exceeded' || error?.status === 429;

        console.warn(
          `Groq attempt ${attempt} failed. code=${code || 'unknown'} msg=${error.message}`
        );

        // Fail fast on non-retryable errors (auth, bad schema, etc.)
        if (!isJsonFailure && !isRateLimit) {
          throw error;
        }

        if (attempt === this.maxAttempts) {
          throw error;
        }

        await this._backoff(attempt);
      }
    }

    throw lastError || new Error('AI failed after multiple attempts.');
  }

  // Simple exponential-ish backoff (300ms, 600ms, 900ms...)
  _backoff(attempt) {
    const ms = 300 * attempt;
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Convert the flat strict-mode output into the { intent, data, confidence, message }
  // structure that aiController.js already consumes.
  reshapeForController(flat) {
    const intent = flat.intent || 'query';
    const data = {};

    if (intent === 'create') {
      data.title = flat.title || '';
      data.description = flat.description || '';
      data.priority = flat.priority || 'medium';
      data.status = flat.status || 'todo';
      data.due_date = flat.due_date || null;
      data.tags = Array.isArray(flat.tags) ? flat.tags : [];
    } else if (intent === 'update') {
      data.ids = Array.isArray(flat.ids) ? flat.ids : [];
      data.changes = {};
      if (flat.title) data.changes.title = flat.title;
      if (flat.description) data.changes.description = flat.description;
      if (flat.priority) data.changes.priority = flat.priority;
      if (flat.status) data.changes.status = flat.status;
      if (flat.due_date) data.changes.due_date = flat.due_date;
      if (Array.isArray(flat.tags) && flat.tags.length) data.changes.tags = flat.tags;
    } else if (intent === 'delete') {
      data.ids = Array.isArray(flat.ids) ? flat.ids : [];
      data.reason = flat.reason || '';
    } else if (intent === 'query') {
      data.query = flat.query || '';
      if (flat.status) data.status = flat.status;
      if (flat.priority) data.priority = flat.priority;
      if (Array.isArray(flat.tags) && flat.tags.length) data.tags = flat.tags;
    }

    return {
      intent,
      type: intent, // convenience alias for the frontend
      data,
      confidence: typeof flat.confidence === 'number' ? flat.confidence : 0.8,
      message: flat.message || '',
    };
  }

  buildUserMessage(command, context) {
    let message = `User command: "${command}"\n\n`;

    if (context.tasks && context.tasks.length > 0) {
      message += `Current tasks (${context.tasks.length} total):\n`;
      const recentTasks = context.tasks.slice(0, 10);
      recentTasks.forEach((task, i) => {
        const id = task._id || task.id;
        message += `${i + 1}. ID: ${id} | "${task.title}" | Status: ${task.status || 'todo'} | Priority: ${task.priority || 'medium'}`;
        if (task.due_date) {
          message += ` | Due: ${new Date(task.due_date).toLocaleDateString()}`;
        }
        message += '\n';
      });
      if (context.tasks.length > 10) {
        message += `... and ${context.tasks.length - 10} more tasks\n`;
      }
    } else {
      message += 'No tasks currently exist.\n';
    }

    if (context.user) {
      const name = context.user.full_name || context.user.name || context.user.email || 'Unknown';
      message += `\nUser: ${name}`;
    }

    message += '\n\nRespond with a single JSON object matching the schema.';
    return message;
  }
}

export default new GroqService();