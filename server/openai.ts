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
      model: "gpt-4o",  // Use available model instead of gpt-4o
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
      max_tokens: 500,
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
      model: "gpt-4o",
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
  const prompt = `Generate 3 highly specific, actionable ask-back questions to dramatically improve this Air Force performance statement. Each question should target missing critical details that would make the statement significantly more impressive to promotion boards.

Focus on:
- SPECIFIC numbers, percentages, dollar amounts, timeframes
- LEADERSHIP scope: how many people led/supervised/mentored
- STRATEGIC impact: mission-critical outcomes, broader organizational effects
- COMPETITIVE advantage: what made this achievement exceptional

Create questions that would elicit responses like "saved $2.3M annually" or "led cross-functional team of 45 personnel" rather than generic descriptions.

Respond with JSON in this format:
{
  "questions": [
    {
      "question": "What specific measurable impact did this have on [relevant metric]?",
      "example": "Reduced processing time by 35%, saving 120 manhours weekly",
      "category": "quantitative"
    }
  ]
}

Statement to improve: "${statement}"`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a senior Air Force performance evaluation expert who has reviewed thousands of promotion packages. You know exactly what quantitative details, leadership scope, and strategic impacts make statements stand out to promotion boards. Generate laser-focused questions that will uncover the most impressive missing details."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
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
      model: "gpt-4o",
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
      model: "gpt-4o",
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
