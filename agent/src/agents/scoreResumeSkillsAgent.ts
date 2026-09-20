import { ChatOpenAI } from '@langchain/openai';
import { z } from 'zod';

const model = new ChatOpenAI({
  model: process.env.LANGUAGE_MODEL ?? '',
  apiKey: process.env.LANGUAGE_MODEL_API_KEY,
  configuration: {
    baseURL: process.env.LANGUAGE_MODEL_BASE_URL ?? '',
  },
});

const systemPrompt = `You are an assistant that scores how well a resume matches a list of required skills.
Input: a JSON array ` + "`skills`" + ` where each item is {"skill": string, "requirement": string}, and a Markdown resume string.
Output: a JSON object with a single field ` + "`scores`" + ` which is an array of integers 0-100 with the same length and order as the input skills array.

Scoring rules (simple and deterministic):
- If the resume provides clear evidence that the candidate's level for the skill is greater than or equal to the requirement, return 100. Evidence includes explicit proficiency words (e.g., "expert", "proficient", "hands-on"), concrete deployment or project statements mentioning the skill (e.g., "deployed using AWS CDK", "built on Lambda"), or multiple distinct project/bullet mentions.
- If the resume does not mention the skill or any common synonyms/indicators for it, return 0.
- Otherwise (some evidence but not clearly meeting the requirement), return an integer score between 1 and 99 based on the strength of the evidence.

Matching notes:
- Infer each skill's proficiency by analyzing the entire resume (all sections, bullets, projects, and summary); do not require the skill and a proficiency word to be adjacent.
- Consider synonyms and related indicators when matching (for example: for AWS accept "aws", "lambda", "cdk", "cloud", "cloud-native", "deployed").

Return only the JSON object matching the response schema and nothing else.`;

const responseFormat = z.object({
  scores: z.array(z.number().int().min(0).max(100)).describe('List of 0-100 integer scores matching input skills order'),
});

const structuredModel = model.withStructuredOutput(responseFormat);

export async function scoreResumeSkills(skills: Array<{ skill: string; requirement: string }>, resumeMarkdown: string): Promise<number[]> {
  const result = await structuredModel.invoke([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `Skills:\n${JSON.stringify(skills)}\n\nResume:\n${resumeMarkdown}` }
  ]);

  const parsed = responseFormat.parse(result);
  return parsed.scores;
}

export default scoreResumeSkills;
