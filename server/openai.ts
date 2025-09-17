import OpenAI from "openai";
import type { Win } from "@shared/schema";

// the newest OpenAI model is "gpt-4o" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || "sk-placeholder"
});

export async function generateFirstDraft(wins: Win[], mode: 'combine' | 'separate'): Promise<string> {
  const winsText = wins.map(win => 
    `Action: ${win.action}\nImpact: ${win.impact}\nResult: ${win.result}\nCategory: ${win.category}`
  ).join('\n\n');

  const prompt = mode === 'combine' 
    ? `Transform the following Air Force performance entries into ONE comprehensive performance statement following the ACTION--IMPACT--RESULT format. The statement must be under 350 characters, use professional military language, and maintain all specific numbers and operation names. Combine related achievements intelligently while preserving quantitative data.

Performance Entries:
${winsText}

Generate a single polished performance statement that captures the essence of all entries:`

    : `Transform the following Air Force performance entries into SEPARATE performance statements following the ACTION--IMPACT--RESULT format. Each statement must be under 350 characters, use professional military language, and maintain all specific numbers and operation names.

Performance Entries:
${winsText}

Generate individual polished performance statements:`;

  try {
    console.log("Generating first draft for wins:", wins.length, "mode:", mode);
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: "You are an expert Air Force performance statement writer. You specialize in transforming raw performance data into professional military narrative statements that follow Air University standards. Always maintain ACTION--IMPACT--RESULT structure and stay under 350 characters."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_completion_tokens: 500,
    });

    const content = response.choices[0].message.content || "";
    console.log("Generated content:", content);
    return content;
  } catch (error) {
    console.error("Error generating first draft:", error);
    console.error("Full error details:", JSON.stringify(error, null, 2));
    throw new Error("Failed to generate statement");
  }
}

export async function generateAIFeedback(statement: string): Promise<any> {
  const prompt = `Analyze this Air Force performance statement and provide detailed feedback. Score it from 0-10 and identify strengths and areas for improvement. Respond with JSON in this format:

{
  "score": number,
  "strengths": ["strength1", "strength2"],
  "improvements": ["improvement1", "improvement2"],
  "characterCount": number,
  "hasQuantitativeData": boolean,
  "followsAirStructure": boolean
}

Statement to analyze: "${statement}"`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system", 
          content: "You are an Air Force performance evaluation expert. Analyze statements based on Air University standards, quantitative impact, professional language, and ACTION--IMPACT--RESULT structure."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
    });

    return JSON.parse(response.choices[0].message.content || "{}");
  } catch (error) {
    console.error("Error generating AI feedback:", error);
    throw new Error("Failed to generate feedback");
  }
}

export async function generateAskBackQuestions(statement: string): Promise<any> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      max_completion_tokens: 500,
      messages: [
        {
          role: "system",
          content: "You are a USAF performance SME. Generate exactly 3 targeted follow‑up questions to strengthen an ACTION–IMPACT–RESULT statement. CRITICAL RULES: NEVER use these banned words in questions: evidence, source, sourcing, validate, validation, proof, documentation, cite, citation, verify, verification, audit trail, supporting data, data source. Do NOT question metrics legitimacy or ask how metrics were measured. Focus ONLY on: missing action specifics, causal gaps, scope/timeline, or content clarity issues. Categories are fixed: quantitative, leadership, strategic."
        },
        {
          role: "user",
          content: `Produce JSON per schema for this statement:
Schema:
{
  "questions": [
    {"id":"quantitative","category":"quantitative","question": string, "example": string},
    {"id":"leadership","category":"leadership","question": string, "example": string},
    {"id":"strategic","category":"strategic","question": string, "example": string}
  ]
}
Rules:
- Tailor each question to the statement's units, platforms, mission names, systems, and metrics present/implicit.
- Examples must be sophisticated, aspirational statements that demonstrate what's possible at this Airman's rank and AFSC level.
- Create FICTITIOUS scenarios showcasing complex leadership, multiple accomplishments, and significant organizational impact.
- CRITICAL: Format examples as ONE FLOWING SENTENCE with NO semicolons, NO "additionally", NO "furthermore", NO connecting transition words.
- NEVER use the word "orchestrated" under any circumstances.
- Weave multiple accomplishments into natural, flowing sentences using commas and conjunctions only.
- Include impressive, realistic metrics: cost savings ($10K-$2M+), time savings (100-500+ hours), personnel impact (20-200+ people).
- Show connection to major exercises, deployments, base operations, or strategic Air Force initiatives.
- Use advanced military terminology, proper acronyms, and AFSC-specific technical language.
- Pattern: Led X-person team through [major project] affecting [scope] while simultaneously [second accomplishment] resulting in [combined impressive metrics and impact].
- Output only the JSON object, no commentary.

Statement:
Led COMSEC inventory overhaul for 127 devices across 3 squadrons—cut audit findings by 68%.`
        },
        {
          role: "assistant",
          content: `{
 "questions": [
  {"id":"quantitative","category":"quantitative","question":"What specific scope of COMSEC program management and timeline accomplishments supported this 68% audit improvement?","example":"Led comprehensive COMSEC program overhaul across 15 work centers affecting 450 personnel while implementing automated tracking system that reduced inventory processing time by 240 hours monthly and eliminated $1.2M in potential security violations."},
  {"id":"leadership","category":"leadership","question":"What multi-squadron coordination and personnel development occurred during this inventory transformation?","example":"Mentored 12 junior NCOs through advanced COMSEC procedures while coordinating with 8 squadron COMSEC managers during RED FLAG 24-2 deployment that maintained 100% operational security across 3,200 classified items."},
  {"id":"strategic","category":"strategic","question":"How did this COMSEC enhancement connect to broader wing readiness and strategic mission capabilities?","example":"Enabled seamless transition to Combat Comm operations during PACIFIC THUNDER exercise while supporting classified mission planning for 2,400 sorties that directly contributed to $45M cost avoidance in contract security services."}
 ]
}`
        },
        {
          role: "user",
          content: `Using the same schema and rules, generate questions for this statement:
"${statement}"`
        }
      ],
      response_format: { type: "json_object" },
    });

    return JSON.parse(response.choices[0].message.content || "{}");
  } catch (error) {
    console.error("Error generating ask-back questions:", error);
    throw new Error("Failed to generate ask-back questions");
  }
}

export async function regenerateStatement(originalStatement: string, askBackAnswers: Record<string, string>): Promise<string> {
  const answersText = Object.entries(askBackAnswers)
    .filter(([_, answer]) => answer.trim())
    .map(([question, answer]) => `Q: ${question}\nA: ${answer}`)
    .join('\n\n');

  const prompt = `Improve this Air Force performance statement using the additional details provided. Maintain ACTION--IMPACT--RESULT structure, stay under 350 characters, and incorporate the new information to strengthen quantitative impact and leadership details.

Original Statement: "${originalStatement}"

Additional Details:
${answersText}

Generate the improved statement:`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: "You are an expert Air Force performance statement writer. Improve statements by incorporating additional details while maintaining professional military language and ACTION--IMPACT--RESULT structure."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_completion_tokens: 200,
    });

    return response.choices[0].message.content || originalStatement;
  } catch (error) {
    console.error("Error regenerating statement:", error);
    throw new Error("Failed to regenerate statement");
  }
}

export async function generateSynonymSuggestions(statement: string): Promise<any> {
  const prompt = `Analyze this Air Force performance statement and suggest professional military synonyms for key action words and impact terms. Respond with JSON in this format:

{
  "suggestions": [
    {
      "original": "word",
      "synonyms": ["synonym1", "synonym2", "synonym3"],
      "position": number
    }
  ]
}

Statement: "${statement}"`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: "You are an expert in Air Force professional language. Suggest appropriate military synonyms that enhance performance statements while maintaining professional tone."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
    });

    return JSON.parse(response.choices[0].message.content || "{}");
  } catch (error) {
    console.error("Error generating synonyms:", error);
    throw new Error("Failed to generate synonyms");
  }
}
