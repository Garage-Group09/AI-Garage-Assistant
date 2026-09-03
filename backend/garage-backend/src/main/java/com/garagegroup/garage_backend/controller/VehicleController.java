package com.garagegroup.garage_backend.controller;

import com.garagegroup.garage_backend.entity.Vehicle;
import com.garagegroup.garage_backend.repository.VehicleRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/vehicles")
public class VehicleController {

    @Autowired
    private VehicleRepository vehicleRepository;

    @GetMapping("/{userId}")
    public ResponseEntity<List<Vehicle>> getVehiclesByUser(@PathVariable Integer userId) {
        List<Vehicle> vehicles = vehicleRepository.findByUserId(userId);
        return ResponseEntity.ok(vehicles);
    }

    @PostMapping
    public ResponseEntity<Vehicle> addVehicle(@RequestBody Vehicle vehicle) {
        Vehicle saved = vehicleRepository.save(vehicle);
        return ResponseEntity.ok(saved);
    }
}