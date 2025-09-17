import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertWinSchema, insertStatementSchema, updateUserProfileSchema, performanceCategories } from "@shared/schema";
import { generateFirstDraft, generateAIFeedback, generateAskBackQuestions, regenerateStatement, enhancedRegenerateStatement, testGPT5Connection } from "./openai";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);
  
  // Startup migration: Add enhanced_steps column if it doesn't exist
  try {
    const { pool } = await import("./db");
    await pool.query(`
      ALTER TABLE refinement_sessions 
      ADD COLUMN IF NOT EXISTS enhanced_steps jsonb;
    `);
    console.log("✅ Database schema migration completed: enhanced_steps column ensured");
  } catch (error) {
    console.error("⚠️ Database migration warning:", error);
    // Don't fail startup - the column might already exist
  }

  // Test route for GPT-5 connectivity
  app.get('/api/test/gpt5', async (req: any, res) => {
    try {
      const result = await testGPT5Connection();
      res.json({ status: 'success', response: result });
    } catch (error) {
      console.error('GPT-5 test failed:', error);
      res.status(500).json({ status: 'error', error: error.message });
    }
  });

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

  // Profile routes
  app.get('/api/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getUserProfile(userId);
      
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }
      
      res.json(profile);
    } catch (error) {
      console.error("Error fetching profile:", error);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  app.put('/api/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Validate request body using zod schema
      const validatedData = updateUserProfileSchema.parse(req.body);
      
      const updatedProfile = await storage.updateUserProfile(userId, validatedData);
      res.json(updatedProfile);
    } catch (error) {
      console.error("Error updating profile:", error);
      if (error instanceof Error && error.message === 'User not found') {
        return res.status(404).json({ message: "Profile not found" });
      }
      res.status(400).json({ message: "Failed to update profile" });
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
      
      // Enhanced two-stage regeneration with AI feedback loop
      const enhancedResult = await enhancedRegenerateStatement(statement.content, askBackAnswers);
      
      // Update statement with final result
      await storage.updateStatement(statementId, {
        content: enhancedResult.finalResult,
      });
      
      // Update refinement session with all intermediate steps
      const session = await storage.getRefinementSessionByStatementId(statementId);
      if (session) {
        await storage.updateRefinementSession(session.id, {
          askBackAnswers,
          enhancedSteps: {
            stage1Result: enhancedResult.stage1Result,
            aiFeedback: enhancedResult.aiFeedback,
            finalResult: enhancedResult.finalResult
          },
          currentStep: 4,
        });
      }
      
      res.json({ 
        content: enhancedResult.finalResult,
        intermediateSteps: {
          stage1Result: enhancedResult.stage1Result,
          aiFeedback: enhancedResult.aiFeedback,
          finalResult: enhancedResult.finalResult
        }
      });
    } catch (error) {
      console.error("Error in enhanced regeneration:", error);
      res.status(500).json({ message: "Failed to regenerate statement" });
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

  // Helper functions for export generation
  function generateFullReport(wins: any[], statements: any[]) {
    let content = `AIR FORCE PERFORMANCE TRACKER - FULL REPORT\n\n`;
    content += `Generated: ${new Date().toLocaleDateString()}\n\n`;
    
    content += `PERFORMANCE ENTRIES (${wins.length}):\n`;
    content += `${'='.repeat(50)}\n\n`;
    
    wins.forEach((win, index) => {
      content += `${index + 1}. ${win.category}\n`;
      content += `Action: ${win.action}\n`;
      content += `Impact: ${win.impact}\n`;
      content += `Result: ${win.result}\n`;
      content += `Date: ${new Date(win.createdAt).toLocaleDateString()}\n\n`;
    });
    
    content += `\nREFINED STATEMENTS (${statements.length}):\n`;
    content += `${'='.repeat(50)}\n\n`;
    
    statements.forEach((statement, index) => {
      content += `${index + 1}. ${statement.category}\n`;
      content += `${statement.content}\n`;
      content += `Status: ${statement.isCompleted ? 'Completed' : 'Draft'}\n`;
      content += `Date: ${new Date(statement.createdAt).toLocaleDateString()}\n\n`;
    });
    
    return content;
  }

  function generateCategoryReport(wins: any[], statements: any[]) {
    let content = `AIR FORCE PERFORMANCE TRACKER - CATEGORY SUMMARY\n\n`;
    content += `Generated: ${new Date().toLocaleDateString()}\n\n`;
    
    const categories = Array.from(new Set([...wins.map(w => w.category), ...statements.map(s => s.category)]));
    
    categories.forEach(category => {
      content += `${category.toUpperCase()}\n`;
      content += `${'='.repeat(category.length)}\n\n`;
      
      const categoryWins = wins.filter(w => w.category === category);
      const categoryStatements = statements.filter(s => s.category === category);
      
      content += `Entries: ${categoryWins.length}\n`;
      content += `Statements: ${categoryStatements.length}\n\n`;
      
      categoryStatements.forEach(statement => {
        content += `• ${statement.content}\n`;
      });
      
      content += `\n`;
    });
    
    return content;
  }

  function generateTimelineReport(wins: any[], statements: any[]) {
    let content = `AIR FORCE PERFORMANCE TRACKER - TIMELINE VIEW\n\n`;
    content += `Generated: ${new Date().toLocaleDateString()}\n\n`;
    
    const allItems = [
      ...wins.map(w => ({ ...w, type: 'entry', date: new Date(w.createdAt) })),
      ...statements.map(s => ({ ...s, type: 'statement', date: new Date(s.createdAt) }))
    ].sort((a, b) => b.date.getTime() - a.date.getTime());
    
    let currentMonth = '';
    
    allItems.forEach(item => {
      const monthYear = item.date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      
      if (monthYear !== currentMonth) {
        currentMonth = monthYear;
        content += `\n${monthYear}\n`;
        content += `${'-'.repeat(monthYear.length)}\n\n`;
      }
      
      if (item.type === 'entry') {
        content += `${item.date.toLocaleDateString()} - ENTRY: ${item.category}\n`;
        content += `  ${item.action} - ${item.impact} - ${item.result}\n\n`;
      } else {
        content += `${item.date.toLocaleDateString()} - STATEMENT: ${item.category}\n`;
        content += `  ${item.content}\n\n`;
      }
    });
    
    return content;
  }

  function generateStatementsReport(statements: any[]) {
    let content = `AIR FORCE PERFORMANCE TRACKER - STATEMENTS ONLY\n\n`;
    content += `Generated: ${new Date().toLocaleDateString()}\n\n`;
    
    statements.forEach((statement, index) => {
      content += `${index + 1}. [${statement.category}] ${statement.content}\n\n`;
    });
    
    return content;
  }

  function generateCSVContent(wins: any[], statements: any[]) {
    let csv = 'Type,Category,Content,Date,Status\n';
    
    wins.forEach(win => {
      const content = `"${win.action} - ${win.impact} - ${win.result}"`;
      csv += `Entry,"${win.category}",${content},"${new Date(win.createdAt).toLocaleDateString()}","Active"\n`;
    });
    
    statements.forEach(statement => {
      const content = `"${statement.content}"`;
      const status = statement.isCompleted ? 'Completed' : 'Draft';
      csv += `Statement,"${statement.category}",${content},"${new Date(statement.createdAt).toLocaleDateString()}","${status}"\n`;
    });
    
    return csv;
  }

  // Export routes
  app.post('/api/export', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { format, view, categories, dateRange } = req.body;

      // Fetch user data based on filters
      let wins = await storage.getWinsByUserId(userId);
      let statements = await storage.getStatementsByUserId(userId);

      // Apply category filter
      if (categories && categories.length > 0) {
        wins = wins.filter((win: any) => categories.includes(win.category));
        statements = statements.filter((statement: any) => categories.includes(statement.category));
      }

      // Apply date filter
      if (dateRange) {
        const { start, end } = dateRange;
        if (start) {
          const startDate = new Date(start);
          wins = wins.filter((win: any) => new Date(win.createdAt) >= startDate);
          statements = statements.filter((statement: any) => new Date(statement.createdAt) >= startDate);
        }
        if (end) {
          const endDate = new Date(end);
          wins = wins.filter((win: any) => new Date(win.createdAt) <= endDate);
          statements = statements.filter((statement: any) => new Date(statement.createdAt) <= endDate);
        }
      }

      // Generate content based on view
      let exportContent = '';
      if (view === 'Full Report') {
        exportContent = generateFullReport(wins, statements);
      } else if (view === 'Category-only') {
        exportContent = generateCategoryReport(wins, statements);
      } else if (view === 'Timeline') {
        exportContent = generateTimelineReport(wins, statements);
      } else if (view === 'Statements Only') {
        exportContent = generateStatementsReport(statements);
      }

      // Set headers based on format
      if (format === 'PDF') {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="af-performance.pdf"');
        // For now, send as text (in real app, would generate actual PDF)
        res.send(`PDF Export:\n\n${exportContent}`);
      } else if (format === 'DOCX') {
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', 'attachment; filename="af-performance.docx"');
        // For now, send as text (in real app, would generate actual DOCX)
        res.send(`DOCX Export:\n\n${exportContent}`);
      } else if (format === 'CSV') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="af-performance.csv"');
        res.send(generateCSVContent(wins, statements));
      } else {
        res.status(400).json({ message: "Invalid format" });
      }

    } catch (error) {
      console.error("Error exporting data:", error);
      res.status(500).json({ message: "Failed to export data" });
    }
  });

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
