package services

import (
	"time"

	"college-admission-agent-backend/models"

	"github.com/google/uuid"
)

var Documents []models.Document

func AddDocument(fileName string, filePath string, storageType string) models.Document {
	doc := models.Document{
		ID:          uuid.New().String(),
		FileName:    fileName,
		FilePath:    filePath,
		UploadedAt:  time.Now().Format(time.RFC3339),
		StorageType: storageType,
	}

	Documents = append(Documents, doc)

	return doc
}

func GetDocuments() []models.Document {
	return Documents
}

func DeleteDocument(id string) bool {
	for i, doc := range Documents {
		if doc.ID == id {
			Documents = append(Documents[:i], Documents[i+1:]...)
			return true
		}
	}

	return false
}