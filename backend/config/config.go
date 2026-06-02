package config

import (
	"os"
)

type Config struct {
	Port               string
	IBMAPIKey          string
	IBMProjectID       string
	IBMRegionURL       string
	IBMGraniteModelID  string
	OrchestrateAPIKey  string
	OrchestrateURL     string
	OrchestrateAgentID string
}

var AppConfig *Config

func LoadConfig() error {
	config := &Config{
		Port:               os.Getenv("PORT"),
		IBMAPIKey:          os.Getenv("IBM_API_KEY"),
		IBMProjectID:       os.Getenv("IBM_PROJECT_ID"),
		IBMRegionURL:       os.Getenv("IBM_REGION_URL"),
		IBMGraniteModelID:  os.Getenv("IBM_GRANITE_MODEL_ID"),
		OrchestrateAPIKey:  os.Getenv("ORCHESTRATE_API_KEY"),
		OrchestrateURL:     os.Getenv("ORCHESTRATE_URL"),
		OrchestrateAgentID: os.Getenv("ORCHESTRATE_AGENT_ID"),
	}

	// Set default port if not provided
	if config.Port == "" {
		config.Port = "8080"
	}

	AppConfig = config
	return nil
}

func GetConfig() *Config {
	return AppConfig
}
