package com.garagegroup.garage_backend.controller;

import com.garagegroup.garage_backend.entity.Garage;
import com.garagegroup.garage_backend.repository.GarageRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * GarageController — public, read-only endpoint for the Garage Finder page.
 * No authentication is required.
 */
@RestController
@RequestMapping("/api")
public class GarageController {

    @Autowired
    private GarageRepository garageRepository;

    // ── GET /api/garages ──────────────────────────────────────────────────────

    /**
     * Returns all garages in the database.
     * Used by the public Garage Finder page to display workshop listings.
     */
    @GetMapping("/garages")
    public ResponseEntity<List<Garage>> getAllGarages() {
        return ResponseEntity.ok(garageRepository.findAll());
    }
}
