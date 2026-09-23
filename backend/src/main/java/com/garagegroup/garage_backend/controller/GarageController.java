package com.garagegroup.garage_backend.controller;

import com.garagegroup.garage_backend.entity.Diagnosis;
import com.garagegroup.garage_backend.entity.Garage;
import com.garagegroup.garage_backend.entity.GarageRecommendation;
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
 * GarageController — public, read-only endpoints for the Garage Finder page.
 * No authentication is required.
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

    // ── GET /api/garages ──────────────────────────────────────────────────────

    /**
     * Returns all garages in the database.
     * Used by the public Garage Finder page to display workshop listings.
     */
    @GetMapping("/garages")
    public ResponseEntity<List<Garage>> getAllGarages() {
        return ResponseEntity.ok(garageRepository.findAll());
    }

    // ── GET /api/garages/recommend/{userId} ───────────────────────────────────

    /**
     * 1. Fetches the user's most recent Diagnosis.Fault_Name.
     * 2. Extracts a keyword from the fault name for specialization matching.
     * 3. Queries garages whose Specialization contains that keyword.
     * 4. Saves a GarageRecommendation row for each matched garage.
     * 5. Returns the top 3 garages sorted by Rating descending.
     *
     * If no diagnosis exists, falls back to returning top 3 highest-rated garages.
     */
    @GetMapping("/garages/recommend/{userId}")
    public ResponseEntity<?> recommendGarages(@PathVariable Integer userId) {
        // Step 1: Find the user's most recent diagnosis (PageRequest ensures at most 1 row)
        List<Diagnosis> recentList = diagnosisRepository.findMostRecentByUserId(userId, PageRequest.of(0, 1));
        Optional<Diagnosis> latestDiagnosis = recentList.isEmpty() ? Optional.empty() : Optional.of(recentList.get(0));

        String keyword = extractKeyword(latestDiagnosis.map(Diagnosis::getFaultName).orElse(null));

        // Step 2: Match garages by specialization keyword; fall back to all garages
        List<Garage> candidates;
        if (keyword != null && !keyword.isBlank()) {
            candidates = garageRepository.findBySpecializationContainingIgnoreCase(keyword);
        } else {
            candidates = garageRepository.findAll();
        }

        // Step 3: Sort by Rating descending and take top 3
        List<Garage> top3 = candidates.stream()
                .filter(g -> g.getRating() != null)
                .sorted(Comparator.comparingDouble(Garage::getRating).reversed())
                .limit(3)
                .collect(Collectors.toList());

        // Step 4: Persist a GarageRecommendation row for each recommended garage
        //         Match_Score = 1.0 for keyword hit, 0.5 for fallback; Distance is null (future work)
        double score = (keyword != null && !keyword.isBlank()) ? 1.0 : 0.5;
        for (Garage g : top3) {
            try {
                GarageRecommendation rec = new GarageRecommendation();
                rec.setUserId(userId);
                rec.setGarageId(g.getGarageId());
                rec.setMatchScore(score);
                // Distance left null — will be enriched by location-aware pipeline later
                garageRecommendationRepository.save(rec);
            } catch (Exception e) {
                System.err.println("garage_recommendation save skipped for garageId="
                        + g.getGarageId() + ": " + e.getMessage());
            }
        }

        return ResponseEntity.ok(top3);
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    /**
     * Extracts a single search keyword from a Fault_Name string.
     *
     * Strategy:
     *  - Common fault terms are mapped to garage specialization keywords.
     *  - Falls back to the first meaningful word of the fault name.
     *  - Returns null if faultName is null/blank (triggers fallback to all garages).
     */
    private String extractKeyword(String faultName) {
        if (faultName == null || faultName.isBlank()) return null;

        String lower = faultName.toLowerCase();

        // Keyword mapping: fault term → specialization keyword
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

        // Fallback: first token of the fault name
        String[] tokens = faultName.trim().split("\\s+");
        return tokens.length > 0 ? tokens[0] : null;
    }
}
