import { ChatOpenAI } from '@langchain/openai';
import { z } from 'zod';

const model = new ChatOpenAI({
  model: process.env.LANGUAGE_MODEL ?? '',
  apiKey: process.env.LANGUAGE_MODEL_API_KEY,
  configuration: {
    baseURL: process.env.LANGUAGE_MODEL_BASE_URL ?? '',
  },
});
const systemPrompt = 'You are a career advisor. Given a resume summary, return a list of applicable job titles that match the candidate\'s experience and skills. Return only relevant, specific job titles.';

const responseFormat = z.object({
  jobTitles: z
    .array(z.string())
    .describe('A list of applicable job titles for the given resume summary')
    .max(10),
});

const structuredModel = model.withStructuredOutput(responseFormat);

export async function getApplicableJobTitles(resumeSummary: string): Promise<string[]> {
  const result = await structuredModel.invoke([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `Resume Summary:\n${resumeSummary}` }
  ]);

  const parsed = responseFormat.parse(result);
  return parsed.jobTitles;
}
