const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('./logger');

let genAI = null;
let model = null;

// Keys that are clearly placeholder values — never a real key
const PLACEHOLDER_KEYS = [
  'your_gemini_api_key_here',
  'your-api-key',
  'placeholder',
  'your_key_here',
  'api_key_here',
];

const getModel = () => {
  if (!model) {
    const key = (process.env.GEMINI_API_KEY || '').trim();
    if (!key || PLACEHOLDER_KEYS.some(p => key.toLowerCase() === p)) {
      logger.warn('GEMINI_API_KEY not configured. AI features will use fallback mode.');
      return null;
    }
    genAI = new GoogleGenerativeAI(key);
    model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }
  return model;
};

/**
 * Generate a detailed task explanation from task metadata.
 */
const generateTaskExplanation = async (taskData) => {
  const m = getModel();
  if (!m) {
    return {
      success: false,
      error: 'AI service not configured. Please set GEMINI_API_KEY.',
      content: null,
    };
  }

  const {
    title, description, projectName, moduleName, technologies,
    deadline, expectedDeliverables, acceptanceCriteria, priority, internName
  } = taskData;

  const prompt = `
You are an experienced software engineering mentor at an IT company. Your intern ${internName || 'the intern'} has just been assigned a new task. Write a detailed, beginner-friendly task explanation for them.

Use ONLY the information provided below. Do not invent requirements, deadlines, or technical details that are not mentioned.

TASK INFORMATION:
- Title: ${title}
- Description: ${description}
- Project: ${projectName}
- Module: ${moduleName || 'N/A'}
- Technologies: ${Array.isArray(technologies) ? technologies.join(', ') : technologies || 'As appropriate'}
- Deadline: ${deadline}
- Expected Deliverables: ${expectedDeliverables || 'As described in the task'}
- Acceptance Criteria: ${acceptanceCriteria || 'Meet all functional requirements'}
- Priority: ${priority}

Write the explanation in the following EXACT structure with these 10 numbered sections:

1. TASK OBJECTIVE
   [Clear one-paragraph summary of what this task requires and what the intern needs to accomplish]

2. WHY THIS TASK IS IMPORTANT
   [Explain the business/technical significance of this task within the project]

3. FUNCTIONAL REQUIREMENTS
   [List all specific requirements derived from the description and deliverables]

4. STEP-BY-STEP IMPLEMENTATION GUIDE
   [Practical, ordered steps to implement this task from start to finish]

5. TECHNOLOGIES TO USE
   [Describe how each technology should be used for this specific task]

6. EXPECTED OUTPUT
   [Describe exactly what the completed work should look like and produce]

7. ACCEPTANCE CRITERIA
   [List specific, testable criteria that must be met for the task to be approved]

8. TESTING INSTRUCTIONS
   [How to test the implementation, including test cases and edge cases]

9. SUBMISSION INSTRUCTIONS
   [Clear instructions on what to submit and how to submit it]

10. COMMON MISTAKES TO AVOID
    [List typical mistakes interns make on this type of task and how to avoid them]

Write in a professional but friendly tone. Be specific and practical. Use the intern's skill level as a beginner who understands fundamentals.
`;

  try {
    const result = await m.generateContent(prompt);
    const content = result.response.text();
    logger.info(`AI explanation generated for task: ${title}`);
    return { success: true, content };
  } catch (error) {
    logger.error(`Gemini API error (task explanation): ${error.message}`);
    const msg = error.message || '';
    const friendly = msg.includes('API_KEY_INVALID') || msg.includes('API key not valid')
      ? 'Gemini API key is invalid. Set GEMINI_API_KEY in server/.env to enable AI explanations.'
      : msg.includes('QUOTA_EXCEEDED') ? 'AI quota exceeded. Try again later.'
      : 'AI service temporarily unavailable.';
    return { success: false, error: friendly, content: null };
  }
};

/**
 * Generate structured AI feedback from mentor notes.
 */
const generateFeedback = async (feedbackData) => {
  const m = getModel();
  if (!m) {
    return {
      success: false,
      error: 'AI service not configured. Please set GEMINI_API_KEY.',
      content: null,
    };
  }

  const { mentorNotes, taskTitle, taskDescription, acceptanceCriteria, internName, reviewStage } = feedbackData;

  const prompt = `
You are an AI assistant helping a software engineering mentor structure their review feedback.

The mentor has reviewed intern ${internName || "the intern"}'s work on the task: "${taskTitle}"

Task Description: ${taskDescription || 'N/A'}
Acceptance Criteria: ${acceptanceCriteria || 'N/A'}
Review Stage: ${reviewStage || 'N/A'}

MENTOR'S NOTES:
${mentorNotes}

Convert the mentor's notes into a structured improvement report. Use ONLY information from the mentor's notes. Do NOT invent problems or requirements not mentioned.

Return your response as a valid JSON object with this exact structure:
{
  "completedRequirements": ["list of things the intern completed well"],
  "identifiedProblems": ["specific problems found"],
  "missingRequirements": ["requirements not yet implemented"],
  "recommendedCorrections": ["specific corrections to make"],
  "improvementInstructions": ["step-by-step instructions to fix the issues"],
  "learningResources": ["relevant learning resources if mentioned or implied"],
  "tasksBeforeNextReview": ["specific tasks to complete before next review"]
}

Each array should contain strings. If a category has no items based on the mentor's notes, use an empty array [].
Return ONLY the JSON object, no additional text.
`;

  try {
    const result = await m.generateContent(prompt);
    let text = result.response.text().trim();
    // Remove markdown code blocks if present
    text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
    
    const parsed = JSON.parse(text);
    logger.info(`AI feedback generated for task: ${taskTitle}`);
    return { success: true, content: parsed, rawText: text };
  } catch (error) {
    logger.error(`Gemini API error (feedback): ${error.message}`);
    const msg = error.message || '';
    const friendly = msg.includes('API_KEY_INVALID') || msg.includes('API key not valid')
      ? 'Gemini API key is invalid. Set GEMINI_API_KEY in server/.env to enable AI feedback.'
      : 'AI feedback generation temporarily unavailable.';
    return { success: false, error: friendly, content: null };
  }
};

/**
 * Local fallback chat — answers from real task data without Gemini.
 * Handles the most common intern questions rule-based.
 */
const localChatFallback = (message, context) => {
  const { internName, tasks = [], upcomingMeetings = [] } = context;
  const q = message.toLowerCase();

  // Submit / how to submit — check FIRST before generic 'work' match
  if (q.includes('submit') || q.includes('how to') || q.includes('how do i') || q.includes('upload')) {
    return { success: true, content: `To submit your work, ${internName}:\n\n1. Go to **Tasks** in the sidebar\n2. Open the task you want to submit\n3. Click the **Submit Work** tab\n4. Paste your GitHub/deployment link and add notes\n5. Click **Submit Task**\n\nYour mentor will then review it and schedule a review meeting if needed. Make sure your code is pushed and the link works before submitting!` };
  }

  // Task list
  if (q.includes('task') || q.includes('assigned') || q.includes('work') || (q.includes('what') && q.includes('do'))) {
    if (tasks.length === 0) {
      return { success: true, content: `Hi ${internName}! You currently have no tasks assigned. Check back soon or speak with your mentor.` };
    }
    const taskList = tasks.map((t, i) =>
      `${i + 1}. **${t.title}** — Status: ${t.status} | Deadline: ${new Date(t.deadline).toLocaleDateString()} | Project: ${t.project?.name || 'N/A'}`
    ).join('\n');
    return { success: true, content: `Hi ${internName}! Here are your current tasks:\n\n${taskList}\n\nFocus on tasks that are "assigned" or "in-progress" first. Let me know if you have questions about any specific task!` };
  }

  // Deadline / urgent
  if (q.includes('deadline') || q.includes('due') || q.includes('urgent') || q.includes('overdue')) {
    const sorted = [...tasks].sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
    const upcoming = sorted.filter(t => !['approved', 'overdue'].includes(t.status)).slice(0, 3);
    if (upcoming.length === 0) return { success: true, content: `Great news ${internName}! You have no pending deadlines right now.` };
    const list = upcoming.map(t => `• **${t.title}** — Due: ${new Date(t.deadline).toLocaleDateString()} (${t.status})`).join('\n');
    return { success: true, content: `${internName}, here are your nearest deadlines:\n\n${list}\n\nMake sure to submit before the deadline and update your task status to "in-progress" while working!` };
  }

  // Meeting / review
  if (q.includes('meeting') || q.includes('review') || q.includes('schedule') || q.includes('next')) {
    if (upcomingMeetings.length === 0) {
      return { success: true, content: `${internName}, you have no upcoming review meetings scheduled right now. Your mentor will schedule one when your task is ready for review.` };
    }
    const meetList = upcomingMeetings.map(m =>
      `• ${m.reviewStage} — ${new Date(m.scheduledAt).toLocaleString()}`
    ).join('\n');
    return { success: true, content: `${internName}, your upcoming meetings:\n\n${meetList}\n\nMake sure your work is ready before the meeting and prepare to explain what you built!` };
  }

  // Status / progress
  if (q.includes('progress') || q.includes('status') || q.includes('how am i')) {
    const counts = { assigned: 0, 'in-progress': 0, submitted: 0, approved: 0, overdue: 0 };
    tasks.forEach(t => { if (counts[t.status] !== undefined) counts[t.status]++; });
    return { success: true, content: `${internName}, here's your progress summary:\n\n✅ Approved: ${counts.approved}\n⚙️ In Progress: ${counts['in-progress']}\n📤 Submitted: ${counts.submitted}\n📋 Assigned: ${counts.assigned}\n🔴 Overdue: ${counts.overdue}\n\nKeep up the good work! Focus on your in-progress tasks and submit when ready.` };
  }

  // Greeting
  if (q.includes('hello') || q.includes('hi') || q.includes('hey') || q.includes('how are you')) {
    const activeCount = tasks.filter(t => ['assigned', 'in-progress'].includes(t.status)).length;
    return { success: true, content: `Hello ${internName}! 👋 I'm your InternFlow AI Assistant.\n\nYou currently have **${tasks.length} task(s)**, with **${activeCount} active**.\n\nI can help you with:\n• Checking your tasks and deadlines\n• Understanding how to submit work\n• Reviewing your upcoming meetings\n• Tracking your progress\n\n> ℹ️ *Full AI responses require a Gemini API key. Ask your admin to configure GEMINI_API_KEY in the server.*\n\nWhat would you like to know?` };
  }

  // Default
  return {
    success: true,
    content: `${internName}, I can help you with information about your tasks, deadlines, and upcoming meetings.\n\nTry asking:\n• "What are my tasks?"\n• "When are my deadlines?"\n• "When is my next meeting?"\n• "How do I submit my work?"\n• "What's my progress?"\n\n> ℹ️ *Full AI-powered answers (explaining code, tech concepts, etc.) require a valid Gemini API key configured in server/.env.*`,
  };
};


/**
 * Chat with AI assistant as intern context.

 */
const chatWithAssistant = async (message, context) => {
  const m = getModel();
  if (!m) {
    // ── Local fallback: answer from real task data without Gemini ──
    return localChatFallback(message, context);
  }

  const { internName, tasks, upcomingMeetings } = context;

  const taskContext = tasks && tasks.length > 0
    ? tasks.map(t => `
Task: ${t.title}
Status: ${t.status}
Project: ${t.project?.name || 'N/A'}
Deadline: ${t.deadline}
Technologies: ${(t.technologies || []).join(', ')}
${t.aiExplanation ? `Explanation: ${t.aiExplanation.substring(0, 500)}...` : ''}
`).join('\n---\n')
    : 'No tasks currently assigned.';

  const meetingContext = upcomingMeetings && upcomingMeetings.length > 0
    ? upcomingMeetings.map(m => `Meeting: ${m.reviewStage} on ${new Date(m.scheduledAt).toLocaleString()}`).join('\n')
    : 'No upcoming meetings.';

  const systemPrompt = `
You are the InternFlow AI Assistant, a helpful technical mentor for ${internName}.

Your role is to help this intern understand their assigned tasks, technical concepts, and what they need to do. You have access to their task information below.

INTERN'S ASSIGNED TASKS:
${taskContext}

UPCOMING MEETINGS:
${meetingContext}

IMPORTANT RULES:
1. ONLY provide information about THIS intern's tasks and information shown above.
2. Do NOT make up or reveal information about other interns.
3. Do NOT change or promise changes to deadlines, task assignments, or meeting schedules — always tell the intern to speak with their mentor.
4. Be helpful, encouraging, and explain technical concepts clearly for a beginner.
5. If asked something outside your scope, politely explain you can only help with task-related questions.
6. Keep responses concise but thorough.

INTERN'S QUESTION: ${message}
`;

  try {
    const result = await m.generateContent(systemPrompt);
    const content = result.response.text();
    return { success: true, content };
  } catch (error) {
    logger.error(`Gemini API error (chat): ${error.message}`);
    // Sanitize: extract friendly message instead of raw JSON blob
    let friendly = 'AI assistant is temporarily unavailable.';
    const msg = error.message || '';
    if (msg.includes('API_KEY_INVALID') || msg.includes('API key not valid')) {
      friendly = 'The Gemini API key is not configured or is invalid. Please set a valid GEMINI_API_KEY in the server .env file to enable AI features.';
    } else if (msg.includes('QUOTA_EXCEEDED') || msg.includes('429')) {
      friendly = 'AI quota exceeded. Please try again in a few moments.';
    } else if (msg.includes('503') || msg.includes('overloaded')) {
      friendly = 'The AI service is temporarily overloaded. Please try again shortly.';
    } else if (msg.includes('network') || msg.includes('ECONNREFUSED')) {
      friendly = 'Cannot reach the AI service. Please check your internet connection.';
    }
    return { success: false, error: friendly, content: null };
  }
};

module.exports = {
  generateTaskExplanation,
  generateFeedback,
  chatWithAssistant,
};
