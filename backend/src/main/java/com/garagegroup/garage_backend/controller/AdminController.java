package com.garagegroup.garage_backend.controller;

import com.garagegroup.garage_backend.dto.CreateBrandRequest;
import com.garagegroup.garage_backend.dto.CreateModelRequest;
import com.garagegroup.garage_backend.dto.GarageRequest;
import com.garagegroup.garage_backend.dto.UpdateUserRequest;
import com.garagegroup.garage_backend.dto.UserAdminDto;
import com.garagegroup.garage_backend.entity.Garage;
import com.garagegroup.garage_backend.entity.User;
import com.garagegroup.garage_backend.entity.VehicleBrand;
import com.garagegroup.garage_backend.entity.VehicleModel;
import com.garagegroup.garage_backend.repository.GarageRecommendationRepository;
import com.garagegroup.garage_backend.repository.GarageRepository;
import com.garagegroup.garage_backend.repository.SymptomRepository;
import com.garagegroup.garage_backend.repository.UserRepository;
import com.garagegroup.garage_backend.repository.VehicleBrandRepository;
import com.garagegroup.garage_backend.repository.VehicleModelRepository;
import com.garagegroup.garage_backend.repository.VehicleRepository;
import com.garagegroup.garage_backend.repository.DiagnosisRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.garagegroup.garage_backend.entity.Diagnosis;
import com.garagegroup.garage_backend.entity.Symptom;
import com.garagegroup.garage_backend.repository.SymptomRepository;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * AdminController — exposes privileged user-management endpoints.
 *
 * Auth strategy:
 *   Derives caller identity strictly from the server-validated session
 *   (via AuthFilter and HttpServletRequest attribute "currentUser").
 *   Caller-supplied headers cannot bypass server-side role validation.
 */
@RestController
@RequestMapping("/api/admin")
public class AdminController {

    @Autowired
    private HttpServletRequest request;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private VehicleBrandRepository brandRepository;

    @Autowired
    private VehicleModelRepository modelRepository;

    @Autowired
    private GarageRepository garageRepository;

    @Autowired
    private VehicleRepository vehicleRepository;

    @Autowired
    private SymptomRepository symptomRepository;

    @Autowired
    private DiagnosisRepository diagnosisRepository;

    @Autowired
    private GarageRecommendationRepository garageRecommendationRepository;

    @Autowired(required = false)
    private com.garagegroup.garage_backend.service.NaiveBayesService naiveBayesService;

    // ── Auth helper ───────────────────────────────────────────────────────────

    /**
     * Returns true only when the authenticated session user has admin privileges.
     * Never trusts unverified caller-supplied headers.
     */
    private boolean isCallerAdmin() {
        if (request == null) return false;
        User caller = (User) request.getAttribute("currentUser");
        return caller != null && caller.isAdmin();
    }

    private boolean isCallerAdmin(String adminUserIdHeader) {
        return isCallerAdmin();
    }

    // ── GET /api/admin/users ──────────────────────────────────────────────────

    /**
     * Returns all registered users, with the password field excluded.
     *
     * @param adminUserIdHeader  X-Admin-User-Id header — ID of the requesting admin
     */
    @GetMapping("/users")
    public ResponseEntity<?> listAllUsers(
            @RequestHeader(value = "X-Admin-User-Id", required = false) String adminUserIdHeader) {

        if (!isCallerAdmin()) {
            return ResponseEntity.status(403).body("Access denied: admin privileges required.");
        }

        List<UserAdminDto> users = userRepository.findAll()
                .stream()
                .map(UserAdminDto::from)
                .collect(Collectors.toList());

        return ResponseEntity.ok(users);
    }

    // ── GET /api/admin/users/{id}/details ─────────────────────────────────────

    /**
     * Admin-only user inspection view: returns a user's vehicles, symptoms,
     * diagnostic assessments, and garage recommendations.
     * Passwords, hashes, and internal secrets are strictly excluded.
     */
    @GetMapping("/users/{id}/details")
    public ResponseEntity<?> getUserDetails(
            @PathVariable Integer id,
            @RequestHeader(value = "X-Admin-User-Id", required = false) String adminUserIdHeader) {

        if (!isCallerAdmin()) {
            return ResponseEntity.status(403).body("Access denied: admin privileges required.");
        }

        Optional<User> optionalUser = userRepository.findById(id);
        if (optionalUser.isEmpty()) {
            return ResponseEntity.status(404).body("User not found with ID: " + id);
        }

        User user = optionalUser.get();
        UserAdminDto userDto = UserAdminDto.from(user);

        // Fetch user vehicles with resolved model names
        List<com.garagegroup.garage_backend.entity.Vehicle> vehicles = vehicleRepository.findByUserId(id);
        for (com.garagegroup.garage_backend.entity.Vehicle v : vehicles) {
            if (v.getModelId() != null) {
                modelRepository.findById(v.getModelId()).ifPresent(m -> v.setModelName(m.getModelName()));
            }
        }

        // Fetch symptoms
        List<com.garagegroup.garage_backend.entity.Symptom> symptoms = symptomRepository.findByUserId(id);

        // Fetch diagnoses
        List<com.garagegroup.garage_backend.entity.Diagnosis> diagnoses = diagnosisRepository.findAllByUserId(id);

        // Fetch garage recommendations
        List<com.garagegroup.garage_backend.entity.GarageRecommendation> recommendations = garageRecommendationRepository.findByUserId(id);

        Map<String, Object> details = new LinkedHashMap<>();
        details.put("user", userDto);
        details.put("vehicles", vehicles);
        details.put("symptoms", symptoms);
        details.put("diagnoses", diagnoses);
        details.put("recommendations", recommendations);

        return ResponseEntity.ok(details);
    }

    // ── PUT /api/admin/users/{id} ─────────────────────────────────────────────

    /**
     * Updates a user's name, email and/or isAdmin flag.
     * Only the non-null fields in the request body are applied (partial update).
     *
     * @param id                 Path variable — ID of the user to update
     * @param adminUserIdHeader  X-Admin-User-Id header — ID of the requesting admin
     * @param request            JSON body with the fields to change
     */
    @PutMapping("/users/{id}")
    public ResponseEntity<?> updateUser(
            @PathVariable Integer id,
            @RequestHeader(value = "X-Admin-User-Id", required = false) String adminUserIdHeader,
            @RequestBody UpdateUserRequest request) {

        if (!isCallerAdmin(adminUserIdHeader)) {
            return ResponseEntity.status(403).body("Access denied: admin privileges required.");
        }

        Optional<User> optionalUser = userRepository.findById(id);
        if (optionalUser.isEmpty()) {
            return ResponseEntity.status(404).body("User not found with ID: " + id);
        }

        User user = optionalUser.get();

        // Apply only the fields that were explicitly provided in the request body
        if (request.getName() != null)    { user.setName(request.getName()); }
        if (request.getEmail() != null)   { user.setEmail(request.getEmail()); }
        if (request.getIsAdmin() != null) { user.setAdmin(request.getIsAdmin()); }

        User updated = userRepository.save(user);
        return ResponseEntity.ok(UserAdminDto.from(updated));
    }

    // ── DELETE /api/admin/users/{id} ─────────────────────────────────────────

    /**
     * Permanently deletes a user record.
     *
     * @param id                 Path variable — ID of the user to delete
     * @param adminUserIdHeader  X-Admin-User-Id header — ID of the requesting admin
     */
    @DeleteMapping("/users/{id}")
    public ResponseEntity<?> deleteUser(
            @PathVariable Integer id,
            @RequestHeader(value = "X-Admin-User-Id", required = false) String adminUserIdHeader) {

        if (!isCallerAdmin(adminUserIdHeader)) {
            return ResponseEntity.status(403).body("Access denied: admin privileges required.");
        }

        if (!userRepository.existsById(id)) {
            return ResponseEntity.status(404).body("User not found with ID: " + id);
        }

        userRepository.deleteById(id);
        return ResponseEntity.ok("User " + id + " deleted successfully.");
    }
    // ── GET /api/admin/brands ─────────────────────────────────────────────────

    /**
     * Returns all vehicle brands.
     *
     * @param adminUserIdHeader  X-Admin-User-Id header
     */
    @GetMapping("/brands")
    public ResponseEntity<?> listAllBrands(
            @RequestHeader(value = "X-Admin-User-Id", required = false) String adminUserIdHeader) {

        if (!isCallerAdmin(adminUserIdHeader)) {
            return ResponseEntity.status(403).body("Access denied: admin privileges required.");
        }
        return ResponseEntity.ok(brandRepository.findAll());
    }

    // ── POST /api/admin/brands ────────────────────────────────────────────────

    /**
     * Creates a new vehicle brand.
     * Returns 409 if a brand with the same name already exists.
     *
     * @param adminUserIdHeader  X-Admin-User-Id header
     * @param request            JSON body: { "brandName": "Toyota" }
     */
    @PostMapping("/brands")
    public ResponseEntity<?> createBrand(
            @RequestHeader(value = "X-Admin-User-Id", required = false) String adminUserIdHeader,
            @RequestBody CreateBrandRequest request) {

        if (!isCallerAdmin(adminUserIdHeader)) {
            return ResponseEntity.status(403).body("Access denied: admin privileges required.");
        }
        if (request.getBrandName() == null || request.getBrandName().isBlank()) {
            return ResponseEntity.badRequest().body("brandName must not be blank.");
        }
        if (brandRepository.existsByBrandNameIgnoreCase(request.getBrandName().trim())) {
            return ResponseEntity.status(409).body("Brand '" + request.getBrandName().trim() + "' already exists.");
        }

        VehicleBrand brand = new VehicleBrand();
        brand.setBrandName(request.getBrandName().trim());
        return ResponseEntity.status(201).body(brandRepository.save(brand));
    }

    // ── GET /api/admin/models ─────────────────────────────────────────────────

    /**
     * Returns vehicle models. When {@code brandId} is supplied only models for
     * that brand are returned; otherwise all models are returned.
     *
     * @param adminUserIdHeader  X-Admin-User-Id header
     * @param brandId            Optional query param to filter by brand
     */
    @GetMapping("/models")
    public ResponseEntity<?> listModels(
            @RequestHeader(value = "X-Admin-User-Id", required = false) String adminUserIdHeader,
            @RequestParam(required = false) Integer brandId) {

        if (!isCallerAdmin(adminUserIdHeader)) {
            return ResponseEntity.status(403).body("Access denied: admin privileges required.");
        }
        List<VehicleModel> models = (brandId != null)
                ? modelRepository.findByBrandId(brandId)
                : modelRepository.findAll();
        return ResponseEntity.ok(models);
    }

    // ── POST /api/admin/models ────────────────────────────────────────────────

    /**
     * Creates a new vehicle model under an existing brand.
     * Returns 404 if the referenced brand does not exist.
     *
     * @param adminUserIdHeader  X-Admin-User-Id header
     * @param request            JSON body: { "brandId": 1, "modelName": "Corolla" }
     */
    @PostMapping("/models")
    public ResponseEntity<?> createModel(
            @RequestHeader(value = "X-Admin-User-Id", required = false) String adminUserIdHeader,
            @RequestBody CreateModelRequest request) {

        if (!isCallerAdmin(adminUserIdHeader)) {
            return ResponseEntity.status(403).body("Access denied: admin privileges required.");
        }
        if (request.getModelName() == null || request.getModelName().isBlank()) {
            return ResponseEntity.badRequest().body("modelName must not be blank.");
        }
        if (request.getBrandId() == null || !brandRepository.existsById(request.getBrandId())) {
            return ResponseEntity.status(404).body("Brand not found with ID: " + request.getBrandId());
        }

        VehicleModel model = new VehicleModel();
        model.setBrandId(request.getBrandId());
        model.setModelName(request.getModelName().trim());
        return ResponseEntity.status(201).body(modelRepository.save(model));
    }

    // ── GET /api/admin/garages ────────────────────────────────────────────────

    /** Returns all garages. */
    @GetMapping("/garages")
    public ResponseEntity<?> listAllGarages(
            @RequestHeader(value = "X-Admin-User-Id", required = false) String adminUserIdHeader) {

        if (!isCallerAdmin(adminUserIdHeader)) {
            return ResponseEntity.status(403).body("Access denied: admin privileges required.");
        }
        return ResponseEntity.ok(garageRepository.findAll());
    }

    // ── POST /api/admin/garages ───────────────────────────────────────────────

    /** Creates a new garage record. Returns 400 if garageName is blank. */
    @PostMapping("/garages")
    public ResponseEntity<?> createGarage(
            @RequestHeader(value = "X-Admin-User-Id", required = false) String adminUserIdHeader,
            @RequestBody GarageRequest request) {

        if (!isCallerAdmin(adminUserIdHeader)) {
            return ResponseEntity.status(403).body("Access denied: admin privileges required.");
        }
        if (request.getGarageName() == null || request.getGarageName().isBlank()) {
            return ResponseEntity.badRequest().body("garageName must not be blank.");
        }

        if (request.getLatitude() != null) {
            if (request.getLatitude() < -90.0 || request.getLatitude() > 90.0) {
                return ResponseEntity.badRequest().body("Latitude must be between -90.0 and 90.0");
            }
        }
        if (request.getLongitude() != null) {
            if (request.getLongitude() < -180.0 || request.getLongitude() > 180.0) {
                return ResponseEntity.badRequest().body("Longitude must be between -180.0 and 180.0");
            }
        }

        Garage garage = new Garage();
        garage.setGarageName(request.getGarageName().trim());
        if (request.getLocation()       != null) garage.setLocation(request.getLocation().trim());
        if (request.getSpecialization() != null) garage.setSpecialization(request.getSpecialization().trim());
        if (request.getRating()         != null) garage.setRating(request.getRating());
        if (request.getPhoneNo()        != null) garage.setPhoneNo(request.getPhoneNo().trim());
        if (request.getLatitude()       != null) garage.setLatitude(request.getLatitude());
        if (request.getLongitude()      != null) garage.setLongitude(request.getLongitude());

        return ResponseEntity.status(201).body(garageRepository.save(garage));
    }

    // ── PUT /api/admin/garages/{id} ───────────────────────────────────────────

    /** Partially updates a garage — only non-null fields are applied. */
    @PutMapping("/garages/{id}")
    public ResponseEntity<?> updateGarage(
            @PathVariable Integer id,
            @RequestHeader(value = "X-Admin-User-Id", required = false) String adminUserIdHeader,
            @RequestBody GarageRequest request) {

        if (!isCallerAdmin(adminUserIdHeader)) {
            return ResponseEntity.status(403).body("Access denied: admin privileges required.");
        }
        Optional<Garage> opt = garageRepository.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.status(404).body("Garage not found with ID: " + id);
        }

        if (request.getLatitude() != null) {
            if (request.getLatitude() < -90.0 || request.getLatitude() > 90.0) {
                return ResponseEntity.badRequest().body("Latitude must be between -90.0 and 90.0");
            }
        }
        if (request.getLongitude() != null) {
            if (request.getLongitude() < -180.0 || request.getLongitude() > 180.0) {
                return ResponseEntity.badRequest().body("Longitude must be between -180.0 and 180.0");
            }
        }

        Garage garage = opt.get();
        if (request.getGarageName()     != null) garage.setGarageName(request.getGarageName().trim());
        if (request.getLocation()       != null) garage.setLocation(request.getLocation().trim());
        if (request.getSpecialization() != null) garage.setSpecialization(request.getSpecialization().trim());
        if (request.getRating()         != null) garage.setRating(request.getRating());
        if (request.getPhoneNo()        != null) garage.setPhoneNo(request.getPhoneNo().trim());
        if (request.getLatitude()       != null) garage.setLatitude(request.getLatitude());
        if (request.getLongitude()      != null) garage.setLongitude(request.getLongitude());

        return ResponseEntity.ok(garageRepository.save(garage));
    }

    // ── PUT /api/admin/brands/{id} ────────────────────────────────────────────

    /** Updates an existing brand and its models. */
    @PutMapping("/brands/{id}")
    public ResponseEntity<?> updateBrand(
            @PathVariable Integer id,
            @RequestHeader(value = "X-Admin-User-Id", required = false) String adminUserIdHeader,
            @RequestBody com.garagegroup.garage_backend.dto.UpdateBrandRequest request) {

        if (!isCallerAdmin(adminUserIdHeader)) {
            return ResponseEntity.status(403).body("Access denied: admin privileges required.");
        }
        Optional<VehicleBrand> opt = brandRepository.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.status(404).body("Brand not found with ID: " + id);
        }

        VehicleBrand brand = opt.get();
        if (request.getBrandName() != null && !request.getBrandName().isBlank()) {
            brand.setBrandName(request.getBrandName().trim());
            brandRepository.save(brand);
        }

        if (request.getModels() != null) {
            List<VehicleModel> existingModels = modelRepository.findByBrandId(id);
            java.util.Set<String> newNames = request.getModels().stream()
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .collect(java.util.stream.Collectors.toSet());

            for (VehicleModel em : existingModels) {
                if (!newNames.contains(em.getModelName())) {
                    try {
                        modelRepository.delete(em);
                    } catch (Exception e) {
                        System.err.println("Could not delete model " + em.getModelName() + ": " + e.getMessage());
                    }
                }
            }

            java.util.Set<String> existingNames = existingModels.stream()
                    .map(VehicleModel::getModelName)
                    .collect(java.util.stream.Collectors.toSet());

            for (String mName : newNames) {
                if (!existingNames.contains(mName)) {
                    VehicleModel vm = new VehicleModel();
                    vm.setBrandId(id);
                    vm.setModelName(mName);
                    modelRepository.save(vm);
                }
            }
        }

        return ResponseEntity.ok(java.util.Map.of("message", "Brand updated successfully", "brandId", id));
    }

    // ── DELETE /api/admin/brands/{id} ─────────────────────────────────────────

    /** Deletes an existing brand and its models. */
    @DeleteMapping("/brands/{id}")
    public ResponseEntity<?> deleteBrand(
            @PathVariable Integer id,
            @RequestHeader(value = "X-Admin-User-Id", required = false) String adminUserIdHeader) {

        if (!isCallerAdmin(adminUserIdHeader)) {
            return ResponseEntity.status(403).body("Access denied: admin privileges required.");
        }
        if (!brandRepository.existsById(id)) {
            return ResponseEntity.status(404).body("Brand not found with ID: " + id);
        }
        try {
            List<VehicleModel> models = modelRepository.findByBrandId(id);
            modelRepository.deleteAll(models);
            brandRepository.deleteById(id);
            return ResponseEntity.ok("Brand " + id + " deleted successfully.");
        } catch (Exception e) {
            return ResponseEntity.status(409).body("Cannot delete brand: It is currently linked to vehicles.");
        }
    }

    // ── DELETE /api/admin/garages/{id} ────────────────────────────────────────

    /** Permanently deletes a garage record. */
    @DeleteMapping("/garages/{id}")
    public ResponseEntity<?> deleteGarage(
            @PathVariable Integer id,
            @RequestHeader(value = "X-Admin-User-Id", required = false) String adminUserIdHeader) {

        if (!isCallerAdmin(adminUserIdHeader)) {
            return ResponseEntity.status(403).body("Access denied: admin privileges required.");
        }
        if (!garageRepository.existsById(id)) {
            return ResponseEntity.status(404).body("Garage not found with ID: " + id);
        }
        garageRepository.deleteById(id);
        return ResponseEntity.ok("Garage " + id + " deleted successfully.");
    }

}
