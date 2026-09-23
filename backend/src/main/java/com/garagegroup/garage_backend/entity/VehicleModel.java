package com.garagegroup.garage_backend.entity;

import jakarta.persistence.*;

/**
 * Maps to the vehicle_model table: Model_ID, Brand_ID (FK), Model_Name.
 */
@Entity
@Table(name = "vehicle_model")
public class VehicleModel {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "Model_ID")
    private Integer modelId;

    /**
     * Stored as a plain FK integer — avoids a lazy-load join when only the
     * brand ID is needed and keeps the entity simple.
     */
    @Column(name = "Brand_ID", nullable = false)
    private Integer brandId;

    @Column(name = "Model_Name", nullable = false)
    private String modelName;

    // ── Getters & Setters ─────────────────────────────────────────────────────

    public Integer getModelId()              { return modelId; }
    public void    setModelId(Integer id)    { this.modelId = id; }

    public Integer getBrandId()              { return brandId; }
    public void    setBrandId(Integer id)    { this.brandId = id; }

    public String  getModelName()            { return modelName; }
    public void    setModelName(String name) { this.modelName = name; }
}
