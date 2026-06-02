package services

import "strings"

type Chunk struct {
	Text   string
	Source string
}

var InMemoryChunks []Chunk

func ClearChunks() {
	InMemoryChunks = nil
}

func SplitText(text string, chunkSize int) []string {
	words := strings.Fields(text)
	var chunks []string

	for i := 0; i < len(words); i += chunkSize {
		end := i + chunkSize
		if end > len(words) {
			end = len(words)
		}

		chunks = append(chunks, strings.Join(words[i:end], " "))
	}

	return chunks
}

func IndexDocument(source string, text string) error {
	chunks := SplitText(text, 250)

	for _, chunk := range chunks {
		InMemoryChunks = append(InMemoryChunks, Chunk{
			Text:   chunk,
			Source: source,
		})
	}

	return nil
}

func RetrieveRelevantChunks(question string) []Chunk {
	var results []Chunk

	questionWords := strings.Fields(strings.ToLower(question))

	for _, chunk := range InMemoryChunks {
		chunkLower := strings.ToLower(chunk.Text)
		score := 0

		for _, word := range questionWords {
			if strings.Contains(chunkLower, word) {
				score++
			}
		}

		if score > 0 {
			results = append(results, chunk)
		}

		if len(results) >= 3 {
			break
		}
	}

	return results
}