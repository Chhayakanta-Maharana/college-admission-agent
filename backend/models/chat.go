package models

type ChatRequest struct {
	Question string `json:"question"`
	Mode     string `json:"mode"`
}

type ChatResponse struct {
	Answer  string   `json:"answer"`
	Sources []string `json:"sources"`
}