package com.garagegroup.garage_backend.dto;

public class DiagnosisRequest {
    private String message;
    private String language;

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public String getLanguage() { return language; }
    public void setLanguage(String language) { this.language = language; }
}