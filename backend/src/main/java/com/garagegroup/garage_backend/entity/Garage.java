package com.garagegroup.garage_backend.entity;

import jakarta.persistence.*;

/**
 * Maps to the garage table: Garage_ID, Garage_Name, Location,
 * Specialization, Rating, Phone_No.
 */
@Entity
@Table(name = "garage")
public class Garage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "Garage_ID")
    private Integer garageId;

    @Column(name = "Garage_Name")
    private String garageName;

    @Column(name = "Location")
    private String location;

    @Column(name = "Specialization")
    private String specialization;

    @Column(name = "Rating")
    private Double rating;

    @Column(name = "Phone_No")
    private String phoneNo;

    // ── Getters & Setters ─────────────────────────────────────────────────────

    public Integer getGarageId()                  { return garageId; }
    public void    setGarageId(Integer id)         { this.garageId = id; }

    public String  getGarageName()                 { return garageName; }
    public void    setGarageName(String name)      { this.garageName = name; }

    public String  getLocation()                   { return location; }
    public void    setLocation(String location)    { this.location = location; }

    public String  getSpecialization()             { return specialization; }
    public void    setSpecialization(String spec)  { this.specialization = spec; }

    public Double  getRating()                     { return rating; }
    public void    setRating(Double rating)        { this.rating = rating; }

    public String  getPhoneNo()                    { return phoneNo; }
    public void    setPhoneNo(String phoneNo)      { this.phoneNo = phoneNo; }
}
