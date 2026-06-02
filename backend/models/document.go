package models

type Document struct {
	ID          string `json:"id"`
	FileName    string `json:"fileName"`
	FilePath    string `json:"filePath"`
	UploadedAt  string `json:"uploadedAt"`
	StorageType string `json:"storageType"`
}