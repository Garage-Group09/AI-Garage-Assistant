package com.garagegroup.garage_backend.controller;

import com.garagegroup.garage_backend.entity.User;
import com.garagegroup.garage_backend.entity.Vehicle;
import com.garagegroup.garage_backend.entity.VehicleBrand;
import com.garagegroup.garage_backend.entity.VehicleModel;
import com.garagegroup.garage_backend.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/vehicles")
public class VehicleController {

    @Autowired
    private VehicleRepository vehicleRepository;

    @Autowired
    private VehicleModelRepository vehicleModelRepository;

    @Autowired
    private VehicleBrandRepository vehicleBrandRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SymptomRepository symptomRepository;

    @Autowired
    private jakarta.servlet.http.HttpServletRequest request;

    private void attachModelNames(List<Vehicle> vehicles) {
        if (vehicles == null || vehicles.isEmpty()) return;
        Map<Integer, String> modelMap = vehicleModelRepository.findAll().stream()
                .collect(Collectors.toMap(VehicleModel::getModelId, VehicleModel::getModelName, (a, b) -> a));
        for (Vehicle v : vehicles) {
            if (v.getModelId() != null) {
                v.setModelName(modelMap.get(v.getModelId()));
            }
        }
    }

    @GetMapping("/{userId}")
    public ResponseEntity<?> getVehiclesByUser(@PathVariable Integer userId) {
        User currentUser = (User) request.getAttribute("currentUser");
        if (currentUser == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Authentication required."));
        }
        if (!currentUser.getUserId().equals(userId) && !currentUser.isAdmin()) {
            return ResponseEntity.status(403).body(Map.of("error", "Access denied: cannot view another user's vehicles."));
        }

        List<Vehicle> vehicles = vehicleRepository.findByUserId(userId);
        attachModelNames(vehicles);
        return ResponseEntity.ok(vehicles);
    }

    @PostMapping
    public ResponseEntity<?> addVehicle(@RequestBody Vehicle vehicle) {
        User currentUser = (User) request.getAttribute("currentUser");
        if (currentUser == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Valid authenticated user required to register a vehicle."));
        }

        // Always enforce that non-admin users cannot register vehicles under other accounts
        if (!currentUser.isAdmin() || vehicle.getUserId() == null) {
            vehicle.setUserId(currentUser.getUserId());
        }

        // 2. Validate Model and Brand Consistency
        if (vehicle.getModelId() != null) {
            Optional<VehicleModel> optModel = vehicleModelRepository.findById(vehicle.getModelId());
            if (optModel.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Specified model does not exist."));
            }
            VehicleModel model = optModel.get();

            // Check model brand matches vehicle brand
            if (vehicle.getBrand() != null && !vehicle.getBrand().isBlank()) {
                Optional<VehicleBrand> optBrand = vehicleBrandRepository.findById(model.getBrandId());
                if (optBrand.isPresent() && !optBrand.get().getBrandName().equalsIgnoreCase(vehicle.getBrand().trim())) {
                    return ResponseEntity.badRequest().body(Map.of("error",
                            String.format("Model '%s' belongs to brand '%s', not '%s'.",
                                    model.getModelName(), optBrand.get().getBrandName(), vehicle.getBrand())));
                }
            }

            // 3. Fuel compatibility check (e.g. Nissan Leaf requires Electric)
            if (model.getModelName() != null && model.getModelName().toLowerCase().contains("leaf")) {
                if (vehicle.getFuelType() != null && !vehicle.getFuelType().equalsIgnoreCase("Electric")) {
                    return ResponseEntity.badRequest().body(Map.of("error",
                            "Nissan Leaf is a dedicated battery electric vehicle. Fuel type cannot be " + vehicle.getFuelType() + ". Please select Electric."));
                }
            }

            vehicle.setModelName(model.getModelName());
        }

        Vehicle saved = vehicleRepository.save(vehicle);
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteVehicle(
            @PathVariable Integer id,
            @RequestParam(required = false) Integer userId) {
        User currentUser = (User) request.getAttribute("currentUser");
        if (currentUser == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Authentication required."));
        }

        Optional<Vehicle> optVehicle = vehicleRepository.findById(id);
        if (optVehicle.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Vehicle vehicle = optVehicle.get();
        if (!currentUser.isAdmin() && !currentUser.getUserId().equals(vehicle.getUserId())) {
            return ResponseEntity.status(403).body(Map.of("error", "Unauthorized: You do not own this vehicle."));
        }

        // Check for referenced records to avoid accidental diagnostic data loss
        if (!symptomRepository.findByVehicleId(id).isEmpty()) {
            return ResponseEntity.status(409).body(Map.of("error",
                    "Cannot delete vehicle: It has linked diagnostic records. To preserve diagnostic integrity, this vehicle cannot be deleted."));
        }

        vehicleRepository.deleteById(id);
        return ResponseEntity.ok().body(Map.of("message", "Vehicle " + id + " deleted successfully."));
    }
}
