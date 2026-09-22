package com.garagegroup.garage_backend.dto;

/**
 * Request body for POST /api/admin/brands.
 */
public class CreateBrandRequest {

    private String brandName;

    public String getBrandName()             { return brandName; }
    public void   setBrandName(String name)  { this.brandName = name; }
}
