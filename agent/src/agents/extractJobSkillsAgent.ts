import { createAgent } from 'langchain';
import { ChatOpenAI } from '@langchain/openai';
import { z } from 'zod';

const model = new ChatOpenAI({
  model: process.env.LANGUAGE_MODEL ?? '',
  apiKey: process.env.LANGUAGE_MODEL_API_KEY,
  configuration: {
    baseURL: process.env.LANGUAGE_MODEL_BASE_URL ?? '',
  },
});

const systemPrompt = `You are an assistant that extracts all required skills from a job description.
Given a job description, return an array of objects where each object has three fields:
- skill: a concise skill name or certification (e.g. "Python", "AWS Certified Solutions Architect", "React").
- requirement: a short phrase describing the requirement level for that skill (e.g. "3+ years", "recent experience", "proficient", "hands-on experience").
- weight: an integer representing the importance or relevance of the skill for the job, ranging from 1-10 (must-have=10, nice-to-have=3; use a reasonable integer for other descriptions)

Do NOT invent skills that are not implied by the description. Prefer short, factual requirement phrases and a reasonable integer weight. Return only the structured JSON defined in the response format.`;

const responseFormat = z.object({
  skills: z.array(
    z.object({
      skill: z.string().describe('Skill or certification'),
      requirement: z.string().describe('Requirement details for the skill'),
      weight: z.number().int().nonnegative().describe('Importance weight for the skill'),
    })
  ).describe('List of skill objects'),
});

const structuredModel = model.withStructuredOutput(responseFormat);

export async function extractJobSkills(jobDescription: string): Promise<Array<{ skill: string; requirement: string; weight: number }>> {
  const result = await structuredModel.invoke([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `Job Description:\n${jobDescription}` }
  ]);

  const parsed = responseFormat.parse(result);
  return parsed.skills;
}
