import { ChatOpenAI } from '@langchain/openai';
import { z } from 'zod';

const model = new ChatOpenAI({
  model: process.env.LANGUAGE_MODEL ?? '',
  apiKey: process.env.LANGUAGE_MODEL_API_KEY,
  configuration: {
    baseURL: process.env.LANGUAGE_MODEL_BASE_URL ?? '',
  },
});

const answerRules = `Answer rules (read the question type and constraints carefully):
- text: return text that meets the constraints
- single-select: return only the option's "value" field (not its "label") of the selected option
- multi-select: return an array containing only the "value" fields (not "label") of the selected options
- number: return a number that meets the constraints
- date: return a date that meets the constraints

Use English to generate short answers with simple words and clear sentences. Keep text answers under 300 characters; only exceed this (up to 600 characters max) if the question explicitly requires more detail.
Confidence score 0–100: 100 = answer explicitly stated in resume or notes; lower = increasing reliance on inference.`;

const systemPromptNew = `You are filling out a job application on behalf of a job applicant, writing in their first-person voice. Given a job description, their resume summary, and their notes, answer the job application question.

Today's date is ${new Date().toISOString().slice(0, 10)}.

${answerRules}`;

const systemPromptRetry = `You are filling out a job application on behalf of a job applicant, writing in their first-person voice. Given a job description, their resume summary, and their notes, your previous answer was rejected due to an error or user remark. Review the error and/or remark carefully and provide a corrected answer.

Today's date is ${new Date().toISOString().slice(0, 10)}.

${answerRules}`;

const confidenceField = z.number().int().min(0).max(100).describe('Confidence score from 0 to 100');

function responseFormat(type: string) {
  switch (type) {
    case 'text':
      return z.object({
        answer: z.string().describe('Answer for text questions'),
        confidence: confidenceField,
      });
    case 'single-select':
      return z.object({
        answer: z.string().describe('Selected value for single-select questions'),
        confidence: confidenceField,
      });
    case 'multi-select':
      return z.object({
        answer: z.array(z.string()).describe('Selected values for multi-select questions'),
        confidence: confidenceField,
      });
    case 'number':
      return z.object({
        answer: z.number().describe('Answer for number questions'),
        confidence: confidenceField,
      });
    case 'date':
      return z.object({
        answer: z.string().describe('Answer for date questions in the constraints-specified format, or YYYY-MM-DD format if no specific format is provided'),
        confidence: confidenceField,
      });
    default:
      throw new Error(`Unsupported question type: ${type}`);
  }
}

function structuredModel(schema: ReturnType<typeof responseFormat>) {
  return model.withStructuredOutput(schema);
}

export async function generateAnswer(jobDescription: string, resume: string, notes: string, question: string, type: string, constraints: string, answer?: string, error?: string, remark?: string): Promise<{ answer: string | string[]; confidence: number }> {
  const responseSchema = responseFormat(type);
  const result = await structuredModel(responseSchema).invoke([
    { role: 'system', content: error || remark ? systemPromptRetry : systemPromptNew },
    { role: 'user', content: error || remark ? `Job Description:\n${jobDescription}\n\nResume Summary:\n${resume}\n\nApplicant Notes:\n${notes}\n\nQuestion:\n${question}\n\nType:\n${type}\n\nConstraints:\n${constraints}\n\nError:\n${error ?? ''}\n\nPrevious Answer:\n${answer ?? ''}\n\nRemark:\n${remark ?? ''}` : `Job Description:\n${jobDescription}\n\nResume Summary:\n${resume}\n\nApplicant Notes:\n${notes}\n\nQuestion:\n${question}\n\nType:\n${type}\n\nConstraints:\n${constraints}` }
  ]);

  const parsed = responseSchema.parse(result);
  return { answer: typeof parsed.answer === 'number' ? String(parsed.answer) : parsed.answer, confidence: parsed.confidence };
}
