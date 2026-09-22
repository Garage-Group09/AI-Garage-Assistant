package com.garagegroup.garage_backend.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "Diagnosis")
public class Diagnosis {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "Diagnosis_ID")
    private Long diagnosisId;

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

    // Getters and Setters
    public Long getDiagnosisId() { return diagnosisId; }
    public void setDiagnosisId(Long diagnosisId) { this.diagnosisId = diagnosisId; }

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

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public String getModelUsed() { return modelUsed; }
    public void setModelUsed(String modelUsed) { this.modelUsed = modelUsed; }
}
