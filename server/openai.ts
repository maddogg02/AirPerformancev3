import OpenAI from "openai";
import type { Win } from "@shared/schema";

// the newest OpenAI model is "gpt-4o" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || "sk-placeholder"
});

// GPT-5 helper function using Responses API correctly
async function gpt5Text(userPrompt: string, opts?: { max?: number; temperature?: number; jsonSchema?: any; jsonName?: string; instructions?: string }) {
  const systemPrompt = opts?.instructions || "You are a helpful assistant.";
  const maxOutputTokens = opts?.max || 512;

  const requestPayload: any = {
    model: 'gpt-5',
    instructions: systemPrompt,                     // system/developer guidance
    input: [
      { role: "user", content: [{ type: "input_text", text: userPrompt }] }
    ],
    reasoning: { effort: "minimal" },               // keep thinking cheap so output tokens remain
    max_output_tokens: maxOutputTokens             // budget for final answer
    // ❌ Do NOT send temperature/top_p for reasoning models
  };

  // Add JSON schema if requested
  if (opts?.jsonSchema) {
    requestPayload.text = {
      verbosity: "medium",
      format: {
        type: "json_schema",
        name: opts.jsonName || "Result",
        schema: opts.jsonSchema,
        strict: true
      }
    };
  } else {
    // Plain text format
    requestPayload.text = { 
      verbosity: "medium", 
      format: { type: "text" } 
    };
  }

  const resp = await openai.responses.create(requestPayload);
  
  // Robust extraction following OpenAI cookbook
  let text = '';
  
  if (Array.isArray(resp.output)) {
    for (const item of resp.output) {
      // messages carry user-visible text
      if ((item as any).content) {
        for (const c of (item as any).content) {
          if (typeof c?.text === "string") text += c.text;
        }
      }
    }
  }
  
  // Fallback to output_text when present
  if (!text && typeof (resp as any).output_text === "string") {
    text = (resp as any).output_text;
  }

  if (!text?.trim()) {
    console.error('Empty output from GPT-5, full response:', JSON.stringify(resp, null, 2));
    console.error('Usage:', resp.usage);
    throw new Error('Empty output from GPT-5');
  }
  
  return text.trim();
}

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
    const instructions = "You are an expert Air Force performance statement writer. You specialize in transforming raw performance data into professional military narrative statements that follow Air University standards. Always maintain ACTION--IMPACT--RESULT structure and stay under 350 characters.";
    
    const content = await gpt5Text(prompt, { max: 512, instructions });
    console.log("Generated content:", content);
    return content;
  } catch (error) {
    console.error("Error generating first draft:", error);
    console.error("Full error details:", JSON.stringify(error, null, 2));
    throw new Error(`Failed to generate statement: ${(error as Error).message}`);
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
    const instructions = "You are an Air Force performance evaluation expert. Analyze statements based on Air University standards, quantitative impact, professional language, and ACTION--IMPACT--RESULT structure.";
    
    const feedbackSchema = {
      type: "object",
      properties: {
        score: { type: "number" },
        strengths: { type: "array", items: { type: "string" } },
        improvements: { type: "array", items: { type: "string" } },
        characterCount: { type: "number" },
        hasQuantitativeData: { type: "boolean" },
        followsAirStructure: { type: "boolean" }
      },
      required: ["score", "strengths", "improvements", "characterCount", "hasQuantitativeData", "followsAirStructure"],
      additionalProperties: false
    };
    
    const content = await gpt5Text(prompt, { max: 512, jsonSchema: feedbackSchema, jsonName: "Feedback", instructions });
    return JSON.parse(content);
  } catch (error) {
    console.error("Error generating AI feedback:", error);
    throw new Error(`Failed to generate feedback: ${(error as Error).message}`);
  }
}

export async function generateAskBackQuestions(statement: string): Promise<any> {
  try {
    const prompt = `You are a USAF performance SME. Generate exactly 3 targeted follow‑up questions to strengthen an ACTION–IMPACT–RESULT statement. CRITICAL RULES: NEVER use these banned words in questions: evidence, source, sourcing, validate, validation, proof, documentation, cite, citation, verify, verification, audit trail, supporting data, data source. Do NOT question metrics legitimacy or ask how metrics were measured. Focus ONLY on: missing action specifics, causal gaps, scope/timeline, or content clarity issues. Categories are fixed: quantitative, leadership, strategic.

Produce JSON per schema for this statement:
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

EXAMPLE:
Statement: Led COMSEC inventory overhaul for 127 devices across 3 squadrons—cut audit findings by 68%.
Response: {
 "questions": [
  {"id":"quantitative","category":"quantitative","question":"What specific scope of COMSEC program management and timeline accomplishments supported this 68% audit improvement?","example":"Led comprehensive COMSEC program overhaul across 15 work centers affecting 450 personnel while implementing automated tracking system that reduced inventory processing time by 240 hours monthly and eliminated $1.2M in potential security violations."},
  {"id":"leadership","category":"leadership","question":"What multi-squadron coordination and personnel development occurred during this inventory transformation?","example":"Mentored 12 junior NCOs through advanced COMSEC procedures while coordinating with 8 squadron COMSEC managers during RED FLAG 24-2 deployment that maintained 100% operational security across 3,200 classified items."},
  {"id":"strategic","category":"strategic","question":"How did this COMSEC enhancement connect to broader wing readiness and strategic mission capabilities?","example":"Enabled seamless transition to Combat Comm operations during PACIFIC THUNDER exercise while supporting classified mission planning for 2,400 sorties that directly contributed to $45M cost avoidance in contract security services."}
 ]
}

NOW, using the same schema and rules, generate questions for this statement:
"${statement}"`;

    const instructions = "You are a USAF performance SME. Generate exactly 3 targeted follow‑up questions to strengthen an ACTION–IMPACT–RESULT statement. CRITICAL RULES: NEVER use these banned words in questions: evidence, source, sourcing, validate, validation, proof, documentation, cite, citation, verify, verification, audit trail, supporting data, data source. Do NOT question metrics legitimacy or ask how metrics were measured. Focus ONLY on: missing action specifics, causal gaps, scope/timeline, or content clarity issues. Categories are fixed: quantitative, leadership, strategic.";
    
    const questionsSchema = {
      type: "object",
      properties: {
        questions: {
          type: "array",
          minItems: 3,
          maxItems: 3,
          items: {
            type: "object",
            properties: {
              id: { type: "string", enum: ["quantitative", "leadership", "strategic"] },
              category: { type: "string", enum: ["quantitative", "leadership", "strategic"] },
              question: { type: "string" },
              example: { type: "string" }
            },
            required: ["id", "category", "question", "example"],
            additionalProperties: false
          }
        }
      },
      required: ["questions"],
      additionalProperties: false
    };
    
    const content = await gpt5Text(prompt, { max: 512, jsonSchema: questionsSchema, jsonName: "AskBackQuestions", instructions });
    return JSON.parse(content);
  } catch (error) {
    console.error("Error generating ask-back questions:", error);
    throw new Error(`Failed to generate ask-back questions: ${(error as Error).message}`);
  }
}

export async function regenerateStatement(originalStatement: string, askBackAnswers: Record<string, string>): Promise<string> {
  const answersText = Object.entries(askBackAnswers)
    .filter(([_, answer]) => answer.trim())
    .map(([questionId, answer]) => {
      // Convert question IDs to more descriptive labels
      const questionLabels: Record<string, string> = {
        quantitative: "Quantitative Impact",
        leadership: "Leadership Examples", 
        strategic: "Strategic Importance",
        specifics: "Specific Details",
        metrics: "Performance Metrics",
        scope: "Scope & Scale"
      };
      const label = questionLabels[questionId] || questionId;
      return `Q (${label}): ${answer}`;
    })
    .join('\n\n');

  const prompt = `Improve this Air Force performance statement using the additional details provided. Maintain ACTION--IMPACT--RESULT structure, stay under 350 characters, and incorporate the new information to strengthen quantitative impact and leadership details.

Original Statement: "${originalStatement}"

Additional Details:
${answersText}

Generate the improved statement:`;

  try {
    const instructions = "You are an expert Air Force performance statement writer. Improve statements by incorporating additional details while maintaining professional military language and ACTION--IMPACT--RESULT structure.";
    
    const content = await gpt5Text(prompt, { max: 512, instructions });
    return content || originalStatement;
  } catch (error) {
    console.error("Error regenerating statement:", error);
    throw new Error(`Failed to regenerate statement: ${(error as Error).message}`);
  }
}

// Enhanced two-stage regeneration with AI feedback loop
export async function enhancedRegenerateStatement(originalStatement: string, askBackAnswers: Record<string, string>): Promise<{
  stage1Result: string;
  aiFeedback: any;
  finalResult: string;
}> {
  const answersText = Object.entries(askBackAnswers)
    .filter(([_, answer]) => answer.trim())
    .map(([questionId, answer]) => {
      const questionLabels: Record<string, string> = {
        quantitative: "Quantitative Impact",
        leadership: "Leadership Examples", 
        strategic: "Strategic Importance",
        specifics: "Specific Details",
        metrics: "Performance Metrics",
        scope: "Scope & Scale"
      };
      const label = questionLabels[questionId] || questionId;
      return `Q (${label}): ${answer}`;
    })
    .join('\n\n');

  try {
    console.log("Stage 1: Generating statement with user answers...");
    
    // STAGE 1: Generate with user answers (soft 400-450 char limit)
    const stage1Prompt = `Improve this Air Force performance statement using the additional details provided. Maintain ACTION--IMPACT--RESULT structure, allow up to 450 characters, and incorporate ALL the new information to strengthen quantitative impact and leadership details.

Original Statement: "${originalStatement}"

Additional Details:
${answersText}

Generate the improved statement with ALL user-provided details incorporated:`;

    const stage1Instructions = "You are an expert Air Force performance statement writer. Incorporate ALL user-provided details while maintaining professional military language and ACTION--IMPACT--RESULT structure. Preserve ALL facts, numbers, mission names, and scope exactly as provided by the user.";
    
    const stage1Result = await gpt5Text(stage1Prompt, { max: 512, instructions: stage1Instructions });
    
    console.log("Stage 2: Running AI feedback analysis...");
    
    // STAGE 2: Generate AI feedback on Stage 1 result
    const feedbackPrompt = `Analyze this Air Force performance statement for style, clarity, and structure improvements. Focus ONLY on improving readability and professional presentation. DO NOT suggest changing any facts, numbers, mission names, or scope details provided by the user.

Statement to analyze: "${stage1Result}"

Provide feedback focusing on:
- Clarity and readability improvements
- Professional military language enhancements  
- ACTION--IMPACT--RESULT structure optimization
- Character count reduction techniques (target ≤350 chars)

NEVER suggest changing user-provided facts, numbers, or specific details.`;

    const aiFeedback = await generateAIFeedback(stage1Result);
    
    console.log("Stage 3: Polishing with AI feedback...");
    
    // STAGE 3: Polish using AI insights (strict 350 char limit)
    const stage3Prompt = `Polish this Air Force performance statement using the AI feedback provided. Maintain ACTION--IMPACT--RESULT structure, enforce strict 350 character limit, and preserve ALL user-provided facts and numbers exactly.

Current Statement: "${stage1Result}"

AI Feedback for Improvement:
${JSON.stringify(aiFeedback.improvements, null, 2)}

CRITICAL RULES:
- Preserve ALL facts, numbers, mission names, and scope exactly as written
- Focus ONLY on style, clarity, and structure improvements
- Enforce strict ≤350 character limit
- Maintain professional military language

Generate the final polished statement:`;

    const stage3Instructions = "You are an expert Air Force performance statement writer specializing in final polish. Preserve ALL user facts while improving style and enforcing the 350-character limit. Never change specific details, numbers, or mission information.";
    
    const finalResult = await gpt5Text(stage3Prompt, { max: 512, instructions: stage3Instructions });
    
    console.log("Enhanced regeneration completed successfully");
    
    return {
      stage1Result,
      aiFeedback,
      finalResult: finalResult || stage1Result
    };
    
  } catch (error) {
    console.error("Error in enhanced regeneration:", error);
    throw new Error(`Failed to enhance statement: ${(error as Error).message}`);
  }
}

// Test function to verify GPT-5 connectivity
export async function testGPT5Connection(): Promise<string> {
  try {
    console.log("Testing GPT-5 connection...");
    const content = await gpt5Text("Say 'GPT-5 is working properly' and nothing else.", { max: 256, instructions: "You are a helpful assistant." });
    console.log("GPT-5 test response:", content);
    return content;
  } catch (error) {
    console.error("GPT-5 connection test failed:", error);
    throw new Error(`GPT-5 test failed: ${error}`);
  }
}

