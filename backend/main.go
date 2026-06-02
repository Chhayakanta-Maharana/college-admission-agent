package main

import (
	"log"
	"os"

	"college-admission-agent-backend/config"
	"college-admission-agent-backend/routes"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	err := godotenv.Load()
	if err != nil {
		log.Println("No .env file found")
	}

	// Load and validate configuration
	if err := config.LoadConfig(); err != nil {
		log.Fatalf("Configuration error: %v", err)
	}

	r := gin.Default()

	r.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})

	routes.RegisterRoutes(r)

	cfg := config.GetConfig()
	log.Println("Server running on port", cfg.Port)
	r.Run(":" + cfg.Port)
}