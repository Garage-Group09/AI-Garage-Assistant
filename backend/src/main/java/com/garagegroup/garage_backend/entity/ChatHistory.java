package com.garagegroup.garage_backend.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "chat_history")
public class ChatHistory {

    public enum Sender {
        user, ai
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "Chat_ID")
    private Long chatId;

    @Column(name = "User_ID", nullable = false)
    private Integer userId;

    @Column(name = "Vehicle_ID")
    private Integer vehicleId;

    @Column(name = "session_id", length = 64)
    private String sessionId;

    @Enumerated(EnumType.STRING)
    @Column(name = "Sender", nullable = false)
    private Sender sender;

    @Column(name = "Message", nullable = false, columnDefinition = "TEXT")
    private String message;

    @Column(name = "Created_At", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }

    @Column(name = "metadata_json", columnDefinition = "TEXT")
    private String metadataJson;
    public String getMetadataJson() { return metadataJson; }
    public void setMetadataJson(String value) { metadataJson = value; }

    // Getters and Setters
    public Long getChatId() { return chatId; }
    public void setChatId(Long chatId) { this.chatId = chatId; }

    public Integer getUserId() { return userId; }
    public void setUserId(Integer userId) { this.userId = userId; }

    public Integer getVehicleId() { return vehicleId; }
    public void setVehicleId(Integer vehicleId) { this.vehicleId = vehicleId; }

    public String getSessionId() { return sessionId; }
    public void setSessionId(String sessionId) { this.sessionId = sessionId; }

    public Sender getSender() { return sender; }
    public void setSender(Sender sender) { this.sender = sender; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
