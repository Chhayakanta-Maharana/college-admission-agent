package services

import (
	"bytes"
	"io"

	"github.com/ledongthuc/pdf"
)

func ExtractTextFromPDF(path string) (string, error) {
	f, r, err := pdf.Open(path)
	if err != nil {
		return "", err
	}
	defer f.Close()

	var buf bytes.Buffer

	reader, err := r.GetPlainText()
	if err != nil {
		return "", err
	}

	_, err = io.Copy(&buf, reader)
	if err != nil {
		return "", err
	}

	return buf.String(), nil
}