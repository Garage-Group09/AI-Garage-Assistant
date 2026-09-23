package com.garagegroup.garage_backend.dto;

/**
 * Request body for POST /api/admin/garages and PUT /api/admin/garages/{id}.
 * All fields are optional on PUT so partial updates are supported.
 */
public class GarageRequest {

    private String garageName;
    private String location;
    private String specialization;
    private Double rating;
    private String phoneNo;

    // ── Getters & Setters ─────────────────────────────────────────────────────

    public String  getGarageName()               { return garageName; }
    public void    setGarageName(String name)    { this.garageName = name; }

    public String  getLocation()                 { return location; }
    public void    setLocation(String loc)       { this.location = loc; }

    public String  getSpecialization()           { return specialization; }
    public void    setSpecialization(String s)   { this.specialization = s; }

    public Double  getRating()                   { return rating; }
    public void    setRating(Double r)           { this.rating = r; }

    public String  getPhoneNo()                  { return phoneNo; }
    public void    setPhoneNo(String p)          { this.phoneNo = p; }
}
