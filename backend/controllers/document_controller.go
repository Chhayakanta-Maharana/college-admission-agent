package controllers

import (
	"net/http"
	"os"
	"strings"

	"college-admission-agent-backend/services"

	"github.com/gin-gonic/gin"
)

func UploadDocument(c *gin.Context) {
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "PDF file is required",
		})
		return
	}

	filePath := "uploads/" + file.Filename

	if err := c.SaveUploadedFile(file, filePath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to save file",
		})
		return
	}

	text, err := services.ExtractTextFromPDF(filePath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to extract text from PDF",
		})
		return
	}

	err = services.IndexDocument(file.Filename, text)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to index document",
		})
		return
	}

	doc := services.AddDocument(file.Filename, filePath, "local")

	c.JSON(http.StatusOK, gin.H{
		"message":    "Document uploaded and indexed successfully",
		"document":   doc,
		"textLength": len(text),
		"chunkCount": len(services.InMemoryChunks),
	})
}

func ListDocuments(c *gin.Context) {
	docs := services.GetDocuments()

	c.JSON(http.StatusOK, gin.H{
		"documents": docs,
	})
}

func DeleteDocument(c *gin.Context) {
	id := c.Param("id")

	deleted := services.DeleteDocument(id)
	if !deleted {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Document not found",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Document deleted successfully",
	})
}

func DebugChunks(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"chunkCount": len(services.InMemoryChunks),
		"chunks":     services.InMemoryChunks,
	})
}

// ReindexDocuments scans the uploads/ directory and re-indexes all PDFs into memory.
// Useful after a server restart (e.g. on Render) where in-memory chunks are lost.
func ReindexDocuments(c *gin.Context) {
	const uploadDir = "uploads"

	entries, err := os.ReadDir(uploadDir)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to read uploads directory: " + err.Error(),
		})
		return
	}

	// Clear existing in-memory chunks and document list before re-indexing
	services.ClearChunks()
	services.Documents = nil

	indexed := 0
	var errors []string

	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		name := entry.Name()
		if !strings.HasSuffix(strings.ToLower(name), ".pdf") {
			continue
		}

		filePath := uploadDir + "/" + name

		text, err := services.ExtractTextFromPDF(filePath)
		if err != nil {
			errors = append(errors, "Failed to extract: "+name)
			continue
		}

		_ = services.IndexDocument(name, text)
		services.AddDocument(name, filePath, "local")
		indexed++
	}

	c.JSON(http.StatusOK, gin.H{
		"message":    "Reindex complete",
		"indexed":    indexed,
		"chunkCount": len(services.InMemoryChunks),
		"errors":     errors,
	})
}