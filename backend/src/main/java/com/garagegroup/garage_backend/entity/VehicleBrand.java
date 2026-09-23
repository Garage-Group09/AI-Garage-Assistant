package com.garagegroup.garage_backend.entity;

import jakarta.persistence.*;

/**
 * Maps to the vehicle_brand table: Brand_ID, Brand_Name.
 */
@Entity
@Table(name = "vehicle_brand")
public class VehicleBrand {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "Brand_ID")
    private Integer brandId;

    @Column(name = "Brand_Name", nullable = false, unique = true)
    private String brandName;

    // ── Getters & Setters ─────────────────────────────────────────────────────

    public Integer getBrandId()             { return brandId; }
    public void    setBrandId(Integer id)   { this.brandId = id; }

    public String  getBrandName()           { return brandName; }
    public void    setBrandName(String name){ this.brandName = name; }
}
