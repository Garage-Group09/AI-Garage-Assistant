package com.garagegroup.garage_backend.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "vehicle")
public class Vehicle {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "Vehicle_ID")
    private Integer vehicleId;

    @Column(name = "User_ID")
    private Integer userId;

    @Column(name = "Brand")
    private String brand;

    @Column(name = "Fuel_Type")
    private String fuelType;

    @Column(name = "Vehicle_Type")
    private String vehicleType;

    @Column(name = "Model_ID")
    private Integer modelId;

    @Column(name = "Year")
    private Integer year;

    @Transient
    private String modelName;

    public Integer getVehicleId() { return vehicleId; }
    public void setVehicleId(Integer vehicleId) { this.vehicleId = vehicleId; }

    public Integer getUserId() { return userId; }
    public void setUserId(Integer userId) { this.userId = userId; }

    public String getBrand() { return brand; }
    public void setBrand(String brand) { this.brand = brand; }

    public String getFuelType() { return fuelType; }
    public void setFuelType(String fuelType) { this.fuelType = fuelType; }

    public String getVehicleType() { return vehicleType; }
    public void setVehicleType(String vehicleType) { this.vehicleType = vehicleType; }

    public Integer getModelId() { return modelId; }
    public void setModelId(Integer modelId) { this.modelId = modelId; }

    public Integer getYear() { return year; }
    public void setYear(Integer year) { this.year = year; }

    public String getModelName() { return modelName; }
    public void setModelName(String modelName) { this.modelName = modelName; }
}
