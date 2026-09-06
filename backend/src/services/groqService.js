// backend/src/services/groqService.js
import Groq from 'groq-sdk';
import dotenv from 'dotenv';

dotenv.config();

// ✅ API key is secure in backend
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const SYSTEM_PROMPT = `You are an AI task management assistant for Schedulfy, a productivity app.
Your job is to help users manage their tasks through natural language.

You can perform these actions:
1. CREATE tasks - when user wants to add a new task
2. UPDATE tasks - when user wants to modify existing tasks
3. DELETE tasks - when user wants to remove tasks (ALWAYS require confirmation)
4. QUERY tasks - when user wants to find or list tasks

Parse the user's request and respond with a structured JSON object.
Always ask for confirmation before deleting ANY task.

Response format:
{
  "intent": "create" | "update" | "delete" | "query" | "unknown",
  "data": {
    // For create:
    "title": "task title",
    "description": "task description (optional)",
    "priority": "low" | "medium" | "high" | "urgent",
    "due_date": "YYYY-MM-DD" or null,
    "status": "todo" | "in_progress" | "done",
    "tags": ["tag1", "tag2"]
    
    // For update:
    "ids": ["task_id1", "task_id2"],
    "changes": {
      "title": "new title",
      "priority": "urgent",
      "status": "done",
    }
    
    // For delete:
    "ids": ["task_id1", "task_id2"],
    "reason": "optional reason"
    
    // For query:
    "query": "search text",
    "status": "todo" | "in_progress" | "done",
    "priority": "low" | "medium" | "high" | "urgent",
    "tags": ["tag1"]
  },
  "confidence": 0.0-1.0,
  "message": "Human-readable message for the user"
}

Always include a clear, friendly message explaining what you're about to do.
For deletions, ALWAYS set requires_confirmation: true.`;

class GroqService {
  constructor() {
    this.model = process.env.AI_MODEL || 'mixtral-8x7b-32768';
    this.temperature = parseFloat(process.env.AI_TEMPERATURE || '0.3');
    this.maxTokens = parseInt(process.env.AI_MAX_TOKENS || '1024');
  }

  async processCommand(command, context) {
    try {
      const userMessage = this.buildUserMessage(command, context);

      const completion = await groq.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
        temperature: this.temperature,
        max_tokens: this.maxTokens,
        response_format: { type: 'json_object' },
      });

      const content = completion.choices[0].message.content;

      let parsed;
      try {
        parsed = JSON.parse(content);
      } catch (e) {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('Invalid response format');
        }
      }

      return parsed;
    } catch (error) {
      console.error('Groq API error:', error);
      throw error;
    }
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
      message += `\nUser: ${context.user.full_name || context.user.email || 'Unknown'}`;
    }

    message += '\n\nPlease respond with a JSON object following the specified format.';
    return message;
  }
}

export default new GroqService();