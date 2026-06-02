package routes

import (
	"college-admission-agent-backend/controllers"

	"github.com/gin-gonic/gin"
)

func RegisterRoutes(r *gin.Engine) {
	api := r.Group("/api")

	api.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"message": "College Admission Agent backend running",
		})
	})

	api.POST("/documents/upload", controllers.UploadDocument)
	api.GET("/documents", controllers.ListDocuments)
	api.DELETE("/documents/:id", controllers.DeleteDocument)
	api.POST("/documents/reindex", controllers.ReindexDocuments)
	api.GET("/debug/chunks", controllers.DebugChunks)
	api.POST("/chat", controllers.ChatWithAgent)
}