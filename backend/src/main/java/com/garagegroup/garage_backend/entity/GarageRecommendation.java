package com.garagegroup.garage_backend.entity;

import jakarta.persistence.*;

/**
 * Stores a snapshot of a garage recommendation made for a specific user.
 * Maps to the garage_recommendation table.
 */
@Entity
@Table(name = "garage_recommendation")
public class GarageRecommendation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "Recommendation_ID")
    private Long recommendationId;

    @Column(name = "User_ID", nullable = false)
    private Integer userId;

    @Column(name = "Garage_ID", nullable = false)
    private Integer garageId;

    /**
     * Distance in kilometres between the user's location and the garage.
     * Nullable — populated when location data is available.
     */
    @Column(name = "Distance")
    private Double distance;

    /**
     * Normalised relevance score (0.0 – 1.0) based on specialization keyword match.
     * Currently a static value; Isfak's pipeline will make this dynamic.
     */
    @Column(name = "Match_Score")
    private Double matchScore;

    // Getters and Setters
    public Long getRecommendationId() { return recommendationId; }
    public void setRecommendationId(Long recommendationId) { this.recommendationId = recommendationId; }

    public Integer getUserId() { return userId; }
    public void setUserId(Integer userId) { this.userId = userId; }

    public Integer getGarageId() { return garageId; }
    public void setGarageId(Integer garageId) { this.garageId = garageId; }

    public Double getDistance() { return distance; }
    public void setDistance(Double distance) { this.distance = distance; }

    public Double getMatchScore() { return matchScore; }
    public void setMatchScore(Double matchScore) { this.matchScore = matchScore; }
}
