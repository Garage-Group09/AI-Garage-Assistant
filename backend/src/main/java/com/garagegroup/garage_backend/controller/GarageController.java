package com.garagegroup.garage_backend.controller;

import com.garagegroup.garage_backend.entity.Diagnosis;
import com.garagegroup.garage_backend.entity.Garage;
import com.garagegroup.garage_backend.entity.GarageRecommendation;
import com.garagegroup.garage_backend.entity.User;
import com.garagegroup.garage_backend.repository.DiagnosisRepository;
import com.garagegroup.garage_backend.repository.GarageRecommendationRepository;
import com.garagegroup.garage_backend.repository.GarageRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

/**
 * GarageController — public endpoints for the Garage Finder page and recommendations.
 */
@RestController
@RequestMapping("/api")
public class GarageController {

    @Autowired
    private GarageRepository garageRepository;

    @Autowired
    private DiagnosisRepository diagnosisRepository;

    @Autowired
    private GarageRecommendationRepository garageRecommendationRepository;

    @Autowired
    private jakarta.servlet.http.HttpServletRequest httpRequest;

    // ── GET /api/garages ──────────────────────────────────────────────────────

    /**
     * Returns garages in the database.
     * includeDemo = false (default): returns verified real businesses only.
     * includeDemo = true: returns all garages including demo/test records.
     */
    @GetMapping("/garages")
    public ResponseEntity<List<Garage>> getAllGarages(
            @RequestParam(required = false, defaultValue = "false") boolean includeDemo) {
        if (!includeDemo) {
            List<Garage> realGarages = garageRepository.findByIsDemoFalse();
            // If real directory is empty, fall back to all so UI is never blank
            return ResponseEntity.ok(realGarages);
        }
        return ResponseEntity.ok(garageRepository.findAll());
    }

    // ── GET /api/garages/recommend/{userId} ───────────────────────────────────

    /**
     * Recommends garages based on the user's latest completed diagnosis assessment and optional GPS location.
     * Enforces authenticated session identity.
     * Only completed assessments (responseType == DIAGNOSIS) are eligible for garage recommendations.
     */
    @GetMapping("/garages/recommend/{userId}")
    public ResponseEntity<?> recommendGarages(
            @PathVariable Integer userId,
            @RequestParam(required = false) Integer vehicleId,
            @RequestParam(required = false) Double lat,
            @RequestParam(required = false) Double lng,
            @RequestParam(required = false) String sessionId,
            @RequestParam(defaultValue = "false") boolean includeDemo) {

        User currentUser = (User) httpRequest.getAttribute("currentUser");
        if (currentUser == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Authentication required."));
        }
        if (!currentUser.getUserId().equals(userId) && !currentUser.isAdmin()) {
            return ResponseEntity.status(403).body(Map.of("error", "Access denied: cannot generate recommendations for another user."));
        }

        // Step 1: Find the user's most relevant completed diagnosis assessment
        Optional<Diagnosis> latestDiagnosis = Optional.empty();
        if (vehicleId != null) {
            List<Diagnosis> vehList = sessionId != null && !sessionId.isBlank()
                ? diagnosisRepository.findSessionDiagnosis(userId, vehicleId, sessionId, PageRequest.of(0, 1))
                : diagnosisRepository.findMostRecentDiagnosisByVehicle(userId, vehicleId, PageRequest.of(0, 1));
            if (!vehList.isEmpty()) {
                latestDiagnosis = Optional.of(vehList.get(0));
            }
        }

        if (latestDiagnosis.isEmpty() && vehicleId == null && sessionId == null) {
            List<Diagnosis> diagList = diagnosisRepository.findMostRecentCompletedDiagnosisByUserId(
                    userId, PageRequest.of(0, 1));
            if (!diagList.isEmpty()) {
                latestDiagnosis = Optional.of(diagList.get(0));
            }
        }

        // If no completed diagnosis assessment exists, do not fabricate recommendations or persist rows
        if (latestDiagnosis.isEmpty()) {
            Map<String, Object> emptyResponse = new LinkedHashMap<>();
            emptyResponse.put("recommendations", Collections.emptyList());
            emptyResponse.put("diagnosisId", null);
            emptyResponse.put("faultName", null);
            emptyResponse.put("matchedKeyword", null);
            emptyResponse.put("matchScore", 0.0);
            emptyResponse.put("message", "No completed diagnostic assessment found. Please complete a vehicle diagnosis first.");
            return ResponseEntity.ok(emptyResponse);
        }

        String faultName = latestDiagnosis.map(Diagnosis::getFaultName).orElse(null);
        String keyword = extractKeyword(faultName);

        // Use the user's selected directory mode consistently, including recommendations.
        List<Garage> available = includeDemo ? garageRepository.findAll() : garageRepository.findByIsDemoFalse();
        List<Garage> candidates = new ArrayList<>();
        if (keyword != null && !keyword.isBlank()) {
            for (Garage garage : available) {
                if (garage.getSpecialization() != null && garage.getSpecialization().toLowerCase(Locale.ROOT).contains(keyword.toLowerCase(Locale.ROOT))) candidates.add(garage);
            }
        }
        boolean keywordMatched = !candidates.isEmpty();
        if (!keywordMatched) candidates = available;

        final boolean hasCoords = (lat != null && lng != null && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180);

        // Step 3: Sort candidates
        // Criteria: Real businesses first, then by distance if user coords provided, else rating
        Comparator<Garage> comparator = Comparator
                .comparing((Garage g) -> Boolean.TRUE.equals(g.getIsDemo()) ? 1 : 0);

        if (hasCoords) {
            comparator = comparator.thenComparing(g -> {
                if (g.getLatitude() != null && g.getLongitude() != null) {
                    return calculateDistanceKm(lat, lng, g.getLatitude(), g.getLongitude());
                }
                return 99999.0;
            });
        } else {
            comparator = comparator.thenComparing(g -> g.getRating() != null ? -g.getRating() : 0.0);
        }

        List<Garage> top3 = candidates.stream()
                .sorted(comparator)
                .limit(3)
                .collect(Collectors.toList());

        // Step 4: Persist a GarageRecommendation row with snapshot of matchScore, distance, diagnosisId
        double score = keywordMatched ? 1.0 : 0.5;
        Long diagId = latestDiagnosis.map(Diagnosis::getDiagnosisId).orElse(null);

        for (Garage g : top3) {
            try {
                Double dist = null;
                if (hasCoords && g.getLatitude() != null && g.getLongitude() != null) {
                    dist = calculateDistanceKm(lat, lng, g.getLatitude(), g.getLongitude());
                }

                GarageRecommendation rec = garageRecommendationRepository
                    .findFirstByUserIdAndGarageIdAndDiagnosisId(userId, g.getGarageId(), diagId)
                    .orElseGet(GarageRecommendation::new);
                rec.setUserId(userId);
                rec.setGarageId(g.getGarageId());
                rec.setDiagnosisId(diagId);
                rec.setMatchScore(score);
                rec.setDistance(dist);
                garageRecommendationRepository.save(rec);
            } catch (Exception e) {
                System.err.println("garage_recommendation save skipped for garageId="
                        + g.getGarageId() + ": " + e.getMessage());
            }
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("recommendations", top3);
        response.put("diagnosisId", diagId);
        response.put("faultName", faultName);
        response.put("matchedKeyword", keywordMatched ? keyword : null);
        response.put("matchScore", score);

        return ResponseEntity.ok(response);
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    /**
     * Calculates straight-line distance in kilometers using the Haversine formula.
     */
    private double calculateDistanceKm(double lat1, double lon1, double lat2, double lon2) {
        final int R = 6371; // Earth radius in km
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return Math.round(R * c * 10.0) / 10.0;
    }

    /**
     * Extracts a search keyword from a Fault_Name string.
     */
    private String extractKeyword(String faultName) {
        if (faultName == null || faultName.isBlank()) return null;

        String lower = faultName.toLowerCase();

        Map<String, String> keywordMap = new LinkedHashMap<>();
        keywordMap.put("brake",       "brake");
        keywordMap.put("engine",      "engine");
        keywordMap.put("transmission","transmission");
        keywordMap.put("oil",         "oil");
        keywordMap.put("tyre",        "tyre");
        keywordMap.put("tire",        "tyre");
        keywordMap.put("battery",     "battery");
        keywordMap.put("electrical",  "electrical");
        keywordMap.put("exhaust",     "exhaust");
        keywordMap.put("suspension",  "suspension");
        keywordMap.put("steering",    "steering");
        keywordMap.put("coolant",     "cooling");
        keywordMap.put("overheating", "cooling");
        keywordMap.put("ac",          "air conditioning");
        keywordMap.put("air",         "air conditioning");
        keywordMap.put("fuel",        "fuel");
        keywordMap.put("clutch",      "transmission");
        keywordMap.put("gear",        "transmission");

        for (Map.Entry<String, String> entry : keywordMap.entrySet()) {
            if (lower.contains(entry.getKey())) {
                return entry.getValue();
            }
        }

        String[] tokens = faultName.trim().split("\\s+");
        return tokens.length > 0 ? tokens[0] : null;
    }
}
