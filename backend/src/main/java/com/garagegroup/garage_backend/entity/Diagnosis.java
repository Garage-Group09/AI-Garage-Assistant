package com.garagegroup.garage_backend.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "diagnosis")
public class Diagnosis {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "Diagnosis_ID")
    private Long diagnosisId;

    @Column(name = "response_type")
    @Enumerated(EnumType.STRING)
    private ResponseType responseType;

    @Column(name = "Symptom_ID", nullable = false)
    private Long symptomId;

    @Column(name = "Fault_Name")
    private String faultName;

    @Column(name = "Confidence_Level")
    private Double confidenceLevel;

    @Column(name = "Possible_Cause", columnDefinition = "TEXT")
    private String possibleCause;

    @Column(name = "Safe_To_Drive")
    private Boolean safeToDrive;

    @Column(name = "Min_Cost")
    private Double minCost;

    @Column(name = "Max_Cost")
    private Double maxCost;

    @Column(name = "cost_estimate_source")
    private String costEstimateSource;

    @Column(name = "cost_currency")
    private String costCurrency = "LKR";

    @Column(name = "cost_assumptions")
    private String costAssumptions;

    @Column(name = "Created_At", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "Model_Used", nullable = false)
    private String modelUsed;

    @PrePersist
    public void prePersist() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (modelUsed == null || modelUsed.isBlank()) {
            modelUsed = "groq-gpt-oss-20b";
        }
    }

    public enum ResponseType {
        GREETING, CLARIFICATION, DIAGNOSIS
    }

    @Column(name = "session_id", length = 64)
    private String sessionId;
    public String getSessionId() { return sessionId; }
    public void setSessionId(String value) { sessionId = value; }

    // Getters and Setters
    public Long getDiagnosisId() { return diagnosisId; }
    public void setDiagnosisId(Long diagnosisId) { this.diagnosisId = diagnosisId; }

    public ResponseType getResponseType() { return responseType; }
    public void setResponseType(ResponseType responseType) { this.responseType = responseType; }

    public Long getSymptomId() { return symptomId; }
    public void setSymptomId(Long symptomId) { this.symptomId = symptomId; }

    public String getFaultName() { return faultName; }
    public void setFaultName(String faultName) { this.faultName = faultName; }

    public Double getConfidenceLevel() { return confidenceLevel; }
    public void setConfidenceLevel(Double confidenceLevel) { this.confidenceLevel = confidenceLevel; }

    public String getPossibleCause() { return possibleCause; }
    public void setPossibleCause(String possibleCause) { this.possibleCause = possibleCause; }

    public Boolean getSafeToDrive() { return safeToDrive; }
    public void setSafeToDrive(Boolean safeToDrive) { this.safeToDrive = safeToDrive; }

    public Double getMinCost() { return minCost; }
    public void setMinCost(Double minCost) { this.minCost = minCost; }

    public Double getMaxCost() { return maxCost; }
    public void setMaxCost(Double maxCost) { this.maxCost = maxCost; }

    public String getCostEstimateSource() { return costEstimateSource; }
    public void setCostEstimateSource(String costEstimateSource) { this.costEstimateSource = costEstimateSource; }

    public String getCostCurrency() { return costCurrency; }
    public void setCostCurrency(String costCurrency) { this.costCurrency = costCurrency; }

    public String getCostAssumptions() { return costAssumptions; }
    public void setCostAssumptions(String costAssumptions) { this.costAssumptions = costAssumptions; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public String getModelUsed() { return modelUsed; }
    public void setModelUsed(String modelUsed) { this.modelUsed = modelUsed; }
}
