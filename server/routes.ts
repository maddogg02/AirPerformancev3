import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertWinSchema, insertStatementSchema, performanceCategories } from "@shared/schema";
import { generateFirstDraft, generateAIFeedback, generateAskBackQuestions, generateSynonymSuggestions, regenerateStatement } from "./openai";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Win routes
  app.post('/api/wins', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertWinSchema.parse({
        ...req.body,
        userId,
      });
      
      const win = await storage.createWin(validatedData);
      res.json(win);
    } catch (error) {
      console.error("Error creating win:", error);
      res.status(400).json({ message: "Failed to create win" });
    }
  });

  app.get('/api/wins', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const wins = await storage.getWinsByUserId(userId);
      res.json(wins);
    } catch (error) {
      console.error("Error fetching wins:", error);
      res.status(500).json({ message: "Failed to fetch wins" });
    }
  });

  app.put('/api/wins/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const win = await storage.updateWin(id, updates);
      res.json(win);
    } catch (error) {
      console.error("Error updating win:", error);
      res.status(400).json({ message: "Failed to update win" });
    }
  });

  app.delete('/api/wins/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteWin(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting win:", error);
      res.status(500).json({ message: "Failed to delete win" });
    }
  });

  // Statement routes
  app.post('/api/statements/generate', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { winIds, mode } = req.body; // mode: 'combine' | 'separate'
      
      // Get the wins to transform
      const wins = [];
      for (const winId of winIds) {
        const win = await storage.getWinById(winId);
        if (win) wins.push(win);
      }
      
      if (wins.length === 0) {
        return res.status(400).json({ message: "No valid wins provided" });
      }
      
      // Generate first draft using AI
      const generatedContent = await generateFirstDraft(wins, mode);
      
      // Create the statement
      const statement = await storage.createStatement({
        userId,
        content: generatedContent,
        category: wins[0].category, // Use first win's category
        sourceWinIds: winIds,
        isCompleted: false,
      });
      
      // Create refinement session
      await storage.createRefinementSession({
        statementId: statement.id,
        userId,
        currentStep: 1,
        isCompleted: false,
      });
      
      res.json(statement);
    } catch (error) {
      console.error("Error generating statement:", error);
      res.status(500).json({ message: "Failed to generate statement" });
    }
  });

  app.get('/api/statements', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const statements = await storage.getStatementsByUserId(userId);
      res.json(statements);
    } catch (error) {
      console.error("Error fetching statements:", error);
      res.status(500).json({ message: "Failed to fetch statements" });
    }
  });

  app.get('/api/statements/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const statement = await storage.getStatementById(id);
      
      if (!statement) {
        return res.status(404).json({ message: "Statement not found" });
      }
      
      res.json(statement);
    } catch (error) {
      console.error("Error fetching statement:", error);
      res.status(500).json({ message: "Failed to fetch statement" });
    }
  });

  // Refinement workflow routes
  app.post('/api/refinement/:statementId/feedback', isAuthenticated, async (req: any, res) => {
    try {
      const { statementId } = req.params;
      const statement = await storage.getStatementById(statementId);
      
      if (!statement) {
        return res.status(404).json({ message: "Statement not found" });
      }
      
      const feedback = await generateAIFeedback(statement.content);
      
      // Update refinement session
      const session = await storage.getRefinementSessionByStatementId(statementId);
      if (session) {
        await storage.updateRefinementSession(session.id, {
          aiFeeds: feedback,
          currentStep: 2,
        });
      }
      
      res.json(feedback);
    } catch (error) {
      console.error("Error generating feedback:", error);
      res.status(500).json({ message: "Failed to generate feedback" });
    }
  });

  app.post('/api/refinement/:statementId/askbacks', isAuthenticated, async (req: any, res) => {
    try {
      const { statementId } = req.params;
      const statement = await storage.getStatementById(statementId);
      
      if (!statement) {
        return res.status(404).json({ message: "Statement not found" });
      }
      
      const askBacks = await generateAskBackQuestions(statement.content);
      
      res.json(askBacks);
    } catch (error) {
      console.error("Error generating ask-backs:", error);
      res.status(500).json({ message: "Failed to generate ask-backs" });
    }
  });

  app.post('/api/refinement/:statementId/regenerate', isAuthenticated, async (req: any, res) => {
    try {
      const { statementId } = req.params;
      const { askBackAnswers } = req.body;
      
      const statement = await storage.getStatementById(statementId);
      if (!statement) {
        return res.status(404).json({ message: "Statement not found" });
      }
      
      // Regenerate statement with ask-back answers
      const regenerated = await regenerateStatement(statement.content, askBackAnswers);
      
      // Update statement
      await storage.updateStatement(statementId, {
        content: regenerated,
      });
      
      // Update refinement session
      const session = await storage.getRefinementSessionByStatementId(statementId);
      if (session) {
        await storage.updateRefinementSession(session.id, {
          askBackAnswers,
          currentStep: 4,
        });
      }
      
      res.json({ content: regenerated });
    } catch (error) {
      console.error("Error regenerating statement:", error);
      res.status(500).json({ message: "Failed to regenerate statement" });
    }
  });

  app.post('/api/refinement/:statementId/synonyms', isAuthenticated, async (req: any, res) => {
    try {
      const { statementId } = req.params;
      const statement = await storage.getStatementById(statementId);
      
      if (!statement) {
        return res.status(404).json({ message: "Statement not found" });
      }
      
      const synonyms = await generateSynonymSuggestions(statement.content);
      
      // Update refinement session
      const session = await storage.getRefinementSessionByStatementId(statementId);
      if (session) {
        await storage.updateRefinementSession(session.id, {
          synonymSuggestions: synonyms,
          currentStep: 4,
        });
      }
      
      res.json(synonyms);
    } catch (error) {
      console.error("Error generating synonyms:", error);
      res.status(500).json({ message: "Failed to generate synonyms" });
    }
  });

  app.post('/api/refinement/:statementId/complete', isAuthenticated, async (req: any, res) => {
    try {
      const { statementId } = req.params;
      
      // Mark statement as completed
      await storage.updateStatement(statementId, {
        isCompleted: true,
      });
      
      // Mark refinement session as completed
      const session = await storage.getRefinementSessionByStatementId(statementId);
      if (session) {
        await storage.updateRefinementSession(session.id, {
          currentStep: 5,
          isCompleted: true,
        });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error completing refinement:", error);
      res.status(500).json({ message: "Failed to complete refinement" });
    }
  });

  // Export route
  app.get('/api/export/statement/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const statement = await storage.getStatementById(id);
      
      if (!statement) {
        return res.status(404).json({ message: "Statement not found" });
      }
      
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="statement-${id}.txt"`);
      res.send(statement.content);
    } catch (error) {
      console.error("Error exporting statement:", error);
      res.status(500).json({ message: "Failed to export statement" });
    }
  });

  // Performance categories endpoint
  app.get('/api/categories', (req, res) => {
    res.json(performanceCategories);
  });

  const httpServer = createServer(app);
  return httpServer;
}
