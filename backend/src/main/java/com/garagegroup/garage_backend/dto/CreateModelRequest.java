package com.garagegroup.garage_backend.dto;

/**
 * Request body for POST /api/admin/models.
 */
public class CreateModelRequest {

    private Integer brandId;
    private String  modelName;

    public Integer getBrandId()              { return brandId; }
    public void    setBrandId(Integer id)    { this.brandId = id; }

    public String  getModelName()            { return modelName; }
    public void    setModelName(String name) { this.modelName = name; }
}
