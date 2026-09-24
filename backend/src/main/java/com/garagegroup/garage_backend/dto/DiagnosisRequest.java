package com.garagegroup.garage_backend.dto;

public class DiagnosisRequest {
    private Integer userId;
    private Integer vehicleId;  // optional — links symptom to a vehicle
    private String message;
    private String language;
    private String modelUsed;   // optional — override model label (Isfak's pipeline)
    private String sessionId;   // optional — scopes chat history to active session

    public Integer getUserId() { return userId; }
    public void setUserId(Integer userId) { this.userId = userId; }

    public Integer getVehicleId() { return vehicleId; }
    public void setVehicleId(Integer vehicleId) { this.vehicleId = vehicleId; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public String getLanguage() { return language; }
    public void setLanguage(String language) { this.language = language; }

    public String getModelUsed() { return modelUsed; }
    public void setModelUsed(String modelUsed) { this.modelUsed = modelUsed; }

    public String getSessionId() { return sessionId; }
    public void setSessionId(String sessionId) { this.sessionId = sessionId; }
}