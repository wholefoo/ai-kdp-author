import { Router } from "express";
import { ContentQualityService } from "../services/contentQualityService";
import { isAuthenticated } from "../replitAuth";

const router = Router();
const qualityService = new ContentQualityService();

// Validate content quality
router.post("/validate", isAuthenticated, async (req, res) => {
  try {
    const { content, standards } = req.body;
    
    if (!content || typeof content !== 'string') {
      return res.status(400).json({ message: "Content is required" });
    }

    const validation = await qualityService.validateContent(content, standards || {});
    res.json(validation);
  } catch (error) {
    console.error("Error validating content:", error);
    res.status(500).json({ 
      message: "Failed to validate content",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Fix common quality issues
router.post("/fix", isAuthenticated, async (req, res) => {
  try {
    const { content } = req.body;
    
    if (!content || typeof content !== 'string') {
      return res.status(400).json({ message: "Content is required" });
    }

    const fixedContent = await qualityService.fixCommonIssues(content);
    res.json({ originalContent: content, fixedContent });
  } catch (error) {
    console.error("Error fixing content:", error);
    res.status(500).json({ 
      message: "Failed to fix content",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Enhance chapter content
router.post("/enhance-chapter", isAuthenticated, async (req, res) => {
  try {
    const { content, chapterNumber, standards } = req.body;
    
    if (!content || typeof content !== 'string' || !chapterNumber) {
      return res.status(400).json({ message: "Content and chapter number are required" });
    }

    const enhancedContent = await qualityService.enhanceChapterContent(
      content, 
      chapterNumber, 
      standards || {}
    );
    
    res.json({ originalContent: content, enhancedContent });
  } catch (error) {
    console.error("Error enhancing chapter:", error);
    res.status(500).json({ 
      message: "Failed to enhance chapter",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

export default router;