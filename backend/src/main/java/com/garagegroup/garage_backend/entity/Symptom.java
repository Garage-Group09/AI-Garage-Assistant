package com.garagegroup.garage_backend.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "symptom")
public class Symptom {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "Symptom_ID")
    private Long symptomId;

    @Column(name = "User_ID")
    private Integer userId; // nullable — set when diagnosis is triggered by a known user

    @Column(name = "Vehicle_ID")
    private Integer vehicleId; // nullable — optional if vehicle not provided

    @Column(name = "Description", nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(name = "Reported_At", nullable = false)
    private LocalDateTime reportedAt;

    @PrePersist
    public void prePersist() {
        if (reportedAt == null) {
            reportedAt = LocalDateTime.now();
        }
    }

    // Getters and Setters
    public Long getSymptomId() { return symptomId; }
    public void setSymptomId(Long symptomId) { this.symptomId = symptomId; }

    public Integer getUserId() { return userId; }
    public void setUserId(Integer userId) { this.userId = userId; }

    public Integer getVehicleId() { return vehicleId; }
    public void setVehicleId(Integer vehicleId) { this.vehicleId = vehicleId; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public LocalDateTime getReportedAt() { return reportedAt; }
    public void setReportedAt(LocalDateTime reportedAt) { this.reportedAt = reportedAt; }
}
