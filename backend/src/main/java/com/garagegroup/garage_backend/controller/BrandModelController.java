package com.garagegroup.garage_backend.controller;

import com.garagegroup.garage_backend.entity.VehicleBrand;
import com.garagegroup.garage_backend.entity.VehicleModel;
import com.garagegroup.garage_backend.repository.VehicleBrandRepository;
import com.garagegroup.garage_backend.repository.VehicleModelRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * BrandModelController — public, read-only endpoints for vehicle brands and models.
 *
 * No authentication is required for these endpoints; they are used by
 * the frontend to populate brand/model dropdowns for all users.
 */
@RestController
@RequestMapping("/api")
public class BrandModelController {

    @Autowired
    private VehicleBrandRepository brandRepository;

    @Autowired
    private VehicleModelRepository modelRepository;

    // ── GET /api/brands ───────────────────────────────────────────────────────

    /**
     * Returns every vehicle brand in the catalogue.
     * Used to populate the brand dropdown on the diagnosis and vehicle-add forms.
     */
    @GetMapping("/brands")
    public ResponseEntity<List<VehicleBrand>> getAllBrands() {
        return ResponseEntity.ok(brandRepository.findAll());
    }

    // ── GET /api/models/{brandId} ─────────────────────────────────────────────

    /**
     * Returns all models that belong to the given brand.
     * Returns an empty array (not 404) when the brand has no models yet,
     * so the frontend can handle this gracefully without an error toast.
     *
     * @param brandId  Path variable — the brand whose models are requested
     */
    @GetMapping("/models/{brandId}")
    public ResponseEntity<List<VehicleModel>> getModelsByBrand(
            @PathVariable Integer brandId) {

        return ResponseEntity.ok(modelRepository.findByBrandId(brandId));
    }
}
