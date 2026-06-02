package services

import (
	"fmt"
	"os"

	"github.com/go-resty/resty/v2"
)

func GetIBMAccessToken() (string, error) {
	apiKey := os.Getenv("IBM_API_KEY")

	client := resty.New()

	resp, err := client.R().
		SetHeader("Content-Type", "application/x-www-form-urlencoded").
		SetFormData(map[string]string{
			"grant_type": "urn:ibm:params:oauth:grant-type:apikey",
			"apikey":    apiKey,
		}).
		SetResult(map[string]interface{}{}).
		Post("https://iam.cloud.ibm.com/identity/token")

	if err != nil {
		return "", err
	}

	if resp.StatusCode() != 200 {
		return "", fmt.Errorf("IBM IAM auth returned status code %d: %s", resp.StatusCode(), resp.String())
	}

	result := resp.Result().(*map[string]interface{})
	token, ok := (*result)["access_token"].(string)
	if !ok {
		return "", fmt.Errorf("failed to parse access token from IBM response")
	}

	return token, nil
}

func GetOrchestrateToken() (string, error) {
	apiKey := os.Getenv("ORCHESTRATE_API_KEY")
	if apiKey == "" {
		apiKey = os.Getenv("IBM_API_KEY")
	}

	client := resty.New()

	resp, err := client.R().
		SetHeader("Content-Type", "application/x-www-form-urlencoded").
		SetFormData(map[string]string{
			"grant_type": "urn:ibm:params:oauth:grant-type:apikey",
			"apikey":    apiKey,
		}).
		SetResult(map[string]interface{}{}).
		Post("https://iam.cloud.ibm.com/identity/token")

	if err != nil {
		return "", err
	}

	if resp.StatusCode() != 200 {
		return "", fmt.Errorf("IBM IAM auth for Orchestrate returned status code %d: %s", resp.StatusCode(), resp.String())
	}

	result := resp.Result().(*map[string]interface{})
	token, ok := (*result)["access_token"].(string)
	if !ok {
		return "", fmt.Errorf("failed to parse orchestrate access token from IBM response")
	}

	return token, nil
}

func GenerateWithGranite(prompt string) (string, error) {
	token, err := GetIBMAccessToken()
	if err != nil {
		return "", err
	}

	projectID := os.Getenv("IBM_PROJECT_ID")
	modelID := os.Getenv("IBM_GRANITE_MODEL_ID")
	regionURL := os.Getenv("IBM_REGION_URL")

	client := resty.New()

	body := map[string]interface{}{
		"input":      prompt,
		"model_id":   modelID,
		"project_id": projectID,
		"parameters": map[string]interface{}{
			"decoding_method": "greedy",
			"max_new_tokens":  400,
			"temperature":     0.2,
		},
	}

	url := regionURL + "/ml/v1/text/generation?version=2024-05-01"

	resp, err := client.R().
		SetHeader("Authorization", "Bearer "+token).
		SetHeader("Content-Type", "application/json").
		SetBody(body).
		SetResult(map[string]interface{}{}).
		Post(url)

	if err != nil {
		return "", err
	}

	if resp.StatusCode() != 200 {
		return "", fmt.Errorf("IBM Granite API returned status code %d: %s", resp.StatusCode(), resp.String())
	}

	result := resp.Result().(*map[string]interface{})

	results, ok := (*result)["results"].([]interface{})
	if !ok || len(results) == 0 {
		return "", fmt.Errorf("no response from IBM Granite")
	}

	first := results[0].(map[string]interface{})
	answer, ok := first["generated_text"].(string)
	if !ok {
		return "", fmt.Errorf("generated_text not found")
	}

	return answer, nil
}

func GenerateWithOrchestrate(question string) (string, error) {
	token, err := GetOrchestrateToken()
	if err != nil {
		return "", err
	}

	orchestrateURL := os.Getenv("ORCHESTRATE_URL")
	agentID := os.Getenv("ORCHESTRATE_AGENT_ID")

	client := resty.New()

	body := map[string]interface{}{
		"stream": false,
		"messages": []map[string]interface{}{
			{
				"role":    "user",
				"content": question,
			},
		},
	}

	url := fmt.Sprintf("%s/v1/orchestrate/%s/chat/completions", orchestrateURL, agentID)

	resp, err := client.R().
		SetHeader("Authorization", "Bearer "+token).
		SetHeader("Content-Type", "application/json").
		SetBody(body).
		SetResult(map[string]interface{}{}).
		Post(url)

	if err != nil {
		return "", err
	}

	if resp.StatusCode() != 200 {
		return "", fmt.Errorf("watsonx Orchestrate API returned status code %d: %s", resp.StatusCode(), resp.String())
	}

	result := resp.Result().(*map[string]interface{})

	choices, ok := (*result)["choices"].([]interface{})
	if !ok || len(choices) == 0 {
		return "", fmt.Errorf("no response choices from watsonx Orchestrate. Check if agent ID is correct and active")
	}

	firstChoice, ok := choices[0].(map[string]interface{})
	if !ok {
		return "", fmt.Errorf("invalid choice format from watsonx Orchestrate")
	}

	message, ok := firstChoice["message"].(map[string]interface{})
	if !ok {
		return "", fmt.Errorf("invalid message format from watsonx Orchestrate")
	}

	content, ok := message["content"].(string)
	if !ok {
		return "", fmt.Errorf("invalid content format from watsonx Orchestrate")
	}

	return content, nil
}