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
import com.garagegroup.garage_backend.repository.GarageRepository;
import com.garagegroup.garage_backend.repository.UserRepository;
import com.garagegroup.garage_backend.repository.VehicleBrandRepository;
import com.garagegroup.garage_backend.repository.VehicleModelRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * AdminController — exposes privileged user-management endpoints.
 *
 * Auth strategy (interim):
 *   Every request must supply the admin's own user ID in the
 *   "X-Admin-User-Id" request header.  The server performs a live
 *   database look-up and returns HTTP 403 if the caller is not an admin.
 *   (This will be replaced with proper session / JWT-based auth later.)
 */
@RestController
@RequestMapping("/api/admin")
public class AdminController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private VehicleBrandRepository brandRepository;

    @Autowired
    private VehicleModelRepository modelRepository;

    @Autowired
    private GarageRepository garageRepository;

    // ── Auth helper ───────────────────────────────────────────────────────────

    /**
     * Returns true only when the header contains a valid user-ID that
     * corresponds to an admin account in the database.
     */
    private boolean isCallerAdmin(String adminUserIdHeader) {
        if (adminUserIdHeader == null || adminUserIdHeader.isBlank()) {
            return false;
        }
        try {
            int callerId = Integer.parseInt(adminUserIdHeader.trim());
            Optional<User> caller = userRepository.findById(callerId);
            return caller.isPresent() && caller.get().isAdmin();
        } catch (NumberFormatException e) {
            return false;
        }
    }

    // ── GET /api/admin/users ──────────────────────────────────────────────────

    /**
     * Returns all registered users, with the password field excluded.
     *
     * @param adminUserIdHeader  X-Admin-User-Id header — ID of the requesting admin
     */
    @GetMapping("/users")
    public ResponseEntity<?> listAllUsers(
            @RequestHeader("X-Admin-User-Id") String adminUserIdHeader) {

        if (!isCallerAdmin(adminUserIdHeader)) {
            return ResponseEntity.status(403).body("Access denied: admin privileges required.");
        }

        List<UserAdminDto> users = userRepository.findAll()
                .stream()
                .map(UserAdminDto::from)
                .collect(Collectors.toList());

        return ResponseEntity.ok(users);
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
            @RequestHeader("X-Admin-User-Id") String adminUserIdHeader,
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
            @RequestHeader("X-Admin-User-Id") String adminUserIdHeader) {

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
            @RequestHeader("X-Admin-User-Id") String adminUserIdHeader) {

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
            @RequestHeader("X-Admin-User-Id") String adminUserIdHeader,
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
            @RequestHeader("X-Admin-User-Id") String adminUserIdHeader,
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
            @RequestHeader("X-Admin-User-Id") String adminUserIdHeader,
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
            @RequestHeader("X-Admin-User-Id") String adminUserIdHeader) {

        if (!isCallerAdmin(adminUserIdHeader)) {
            return ResponseEntity.status(403).body("Access denied: admin privileges required.");
        }
        return ResponseEntity.ok(garageRepository.findAll());
    }

    // ── POST /api/admin/garages ───────────────────────────────────────────────

    /** Creates a new garage record. Returns 400 if garageName is blank. */
    @PostMapping("/garages")
    public ResponseEntity<?> createGarage(
            @RequestHeader("X-Admin-User-Id") String adminUserIdHeader,
            @RequestBody GarageRequest request) {

        if (!isCallerAdmin(adminUserIdHeader)) {
            return ResponseEntity.status(403).body("Access denied: admin privileges required.");
        }
        if (request.getGarageName() == null || request.getGarageName().isBlank()) {
            return ResponseEntity.badRequest().body("garageName must not be blank.");
        }

        Garage garage = new Garage();
        garage.setGarageName(request.getGarageName().trim());
        if (request.getLocation()       != null) garage.setLocation(request.getLocation().trim());
        if (request.getSpecialization() != null) garage.setSpecialization(request.getSpecialization().trim());
        if (request.getRating()         != null) garage.setRating(request.getRating());
        if (request.getPhoneNo()        != null) garage.setPhoneNo(request.getPhoneNo().trim());

        return ResponseEntity.status(201).body(garageRepository.save(garage));
    }

    // ── PUT /api/admin/garages/{id} ───────────────────────────────────────────

    /** Partially updates a garage — only non-null fields are applied. */
    @PutMapping("/garages/{id}")
    public ResponseEntity<?> updateGarage(
            @PathVariable Integer id,
            @RequestHeader("X-Admin-User-Id") String adminUserIdHeader,
            @RequestBody GarageRequest request) {

        if (!isCallerAdmin(adminUserIdHeader)) {
            return ResponseEntity.status(403).body("Access denied: admin privileges required.");
        }
        Optional<Garage> opt = garageRepository.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.status(404).body("Garage not found with ID: " + id);
        }

        Garage garage = opt.get();
        if (request.getGarageName()     != null) garage.setGarageName(request.getGarageName().trim());
        if (request.getLocation()       != null) garage.setLocation(request.getLocation().trim());
        if (request.getSpecialization() != null) garage.setSpecialization(request.getSpecialization().trim());
        if (request.getRating()         != null) garage.setRating(request.getRating());
        if (request.getPhoneNo()        != null) garage.setPhoneNo(request.getPhoneNo().trim());

        return ResponseEntity.ok(garageRepository.save(garage));
    }

    // ── DELETE /api/admin/garages/{id} ────────────────────────────────────────

    /** Permanently deletes a garage record. */
    @DeleteMapping("/garages/{id}")
    public ResponseEntity<?> deleteGarage(
            @PathVariable Integer id,
            @RequestHeader("X-Admin-User-Id") String adminUserIdHeader) {

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
