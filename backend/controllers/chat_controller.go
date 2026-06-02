package controllers

import (
	"net/http"
	"os"
	"strings"

	"college-admission-agent-backend/models"
	"college-admission-agent-backend/services"

	"github.com/gin-gonic/gin"
)

func isGreeting(q string) bool {
	q = strings.ToLower(strings.TrimSpace(q))
	greetings := []string{"hello", "hi", "hey", "hola", "howdy", "good morning", "good afternoon", "good evening", "how are you", "who are you", "what are you", "greet"}
	for _, g := range greetings {
		if strings.Contains(q, g) {
			return true
		}
	}
	return false
}

func ChatWithAgent(c *gin.Context) {
	var req models.ChatRequest

	if err := c.ShouldBindJSON(&req); err != nil || req.Question == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Question is required",
		})
		return
	}

	useOrchestrate := true
	if req.Mode == "granite" {
		useOrchestrate = false
	}

	// 1. watsonx Orchestrate Mode (Official College Assistant)
	if useOrchestrate {
		agentID := os.Getenv("ORCHESTRATE_AGENT_ID")
		if agentID == "" {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "watsonx Orchestrate Agent ID is not configured in the backend environment variables.",
			})
			return
		}

		answer, err := services.GenerateWithOrchestrate(req.Question)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Failed to generate answer from watsonx Orchestrate",
				"details": err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, models.ChatResponse{
			Answer:  answer,
			Sources: []string{"IBM watsonx Orchestrate"},
		})
		return
	}

	// 2. Custom Document Sandbox (Local Granite RAG)

	// 2a. Handle Greetings
	if isGreeting(req.Question) {
		prompt := `You are a friendly College Admission Assistant. 
The student says: "` + req.Question + `"
Respond to their greeting politely. Let them know you are ready to help them analyze their uploaded document. Mention that they can upload a PDF brochure, syllabus, or FAQ sheet in the sandbox area to get started.`

		answer, err := services.GenerateWithGranite(prompt)
		if err != nil {
			c.JSON(http.StatusOK, models.ChatResponse{
				Answer:  "Hello! Please upload your custom PDF document in the sandbox sidebar, and I'll answer questions directly based on its content!",
				Sources: []string{},
			})
			return
		}

		c.JSON(http.StatusOK, models.ChatResponse{
			Answer:  answer,
			Sources: []string{},
		})
		return
	}

	// 2b. Retrieve chunks if any documents are uploaded
	var contextBuilder strings.Builder
	var sources []string

	if len(services.InMemoryChunks) > 0 {
		chunks := services.RetrieveRelevantChunks(req.Question)
		for _, chunk := range chunks {
			contextBuilder.WriteString(chunk.Text)
			contextBuilder.WriteString("\n\n")
			sources = append(sources, chunk.Source)
		}
	}

	prompt := ""
	if contextBuilder.Len() > 0 {
		prompt = `You are a professional AI Document Assistant.

The user has uploaded a custom brochure or PDF. Here is the relevant extracted context from the document:
---
` + contextBuilder.String() + `
---

User Question: "` + req.Question + `"

Please answer the user's question. 
- Prioritize answering using the provided context from the document.
- If the question goes outside the document context or asks for general/broader details, use your general knowledge to provide a highly professional, helpful, and direct answer. Do not say you cannot find it, simply answer it anyway using your general knowledge!`
	} else {
		prompt = `You are a professional AI Assistant.

User Question: "` + req.Question + `"

Please answer the user's question with your general knowledge in a highly helpful, professional, and clear manner.`
	}

	answer, err := services.GenerateWithGranite(prompt)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to generate answer from IBM Granite",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, models.ChatResponse{
		Answer:  answer,
		Sources: sources,
	})
}
