package com.garagegroup.garage_backend.dto;

import java.util.List;

/**
 * Request body for PUT /api/admin/brands/{id}.
 */
public class UpdateBrandRequest {

    private String brandName;
    private List<String> models;

    public String getBrandName()             { return brandName; }
    public void   setBrandName(String name)  { this.brandName = name; }

    public List<String> getModels()          { return models; }
    public void   setModels(List<String> m)  { this.models = m; }
}
