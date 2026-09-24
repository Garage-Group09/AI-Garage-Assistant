package com.garagegroup.garage_backend.service;

import org.springframework.stereotype.Service;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * RepairCostService — Prototype LKR repair-cost estimation service for completed assessments.
 *
 * Validates optional LLM estimates; no unsourced fixed price tables are used.
 * Estimation architecture:
 * 2. Labelled rough AI-generated estimate if supported by the fault/symptoms.
 * 3. Honest "UNAVAILABLE" fallback when information is insufficient or invalid (never invents prices).
 */
@Service
public class RepairCostService {

    public static class CostEstimate {
        private final Double minCost;
        private final Double maxCost;
        private final String currency;
        private final String source;      // "REFERENCE_BENCHMARK", "AI_ESTIMATE", "UNAVAILABLE"
        private final String assumptions;
        private final String displayLabel;

        public CostEstimate(Double minCost, Double maxCost, String currency, String source, String assumptions, String displayLabel) {
            this.minCost = minCost;
            this.maxCost = maxCost;
            this.currency = currency;
            this.source = source;
            this.assumptions = assumptions;
            this.displayLabel = displayLabel;
        }

        public Double getMinCost() { return minCost; }
        public Double getMaxCost() { return maxCost; }
        public String getCurrency() { return currency; }
        public String getSource() { return source; }
        public String getAssumptions() { return assumptions; }
        public String getDisplayLabel() { return displayLabel; }

        public Map<String, Object> toMap() {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("minCost", minCost);
            map.put("maxCost", maxCost);
            map.put("currency", currency);
            map.put("source", source);
            map.put("assumptions", assumptions);
            map.put("displayLabel", displayLabel);
            return map;
        }
    }

    /**
     * Resolves the repair cost estimate.
     *
     * @param faultCategory  Normalized category (e.g. from Naive Bayes or Groq)
     * @param aiMin          AI-suggested minimum in LKR
     * @param aiMax          AI-suggested maximum in LKR
     * @param aiAssumptions  AI-suggested assumptions
     * @return CostEstimate with validated numbers and clear provenance
     */
    public CostEstimate resolveEstimate(String faultCategory, Double aiMin, Double aiMax, String aiAssumptions) {
        // Tier 2: Validated AI-generated estimate
        if (aiMin != null && aiMax != null && Double.isFinite(aiMin) && Double.isFinite(aiMax)
                && aiMin >= 0 && aiMax >= aiMin && aiMax <= 10_000_000.0) {
            String assumptions = (aiAssumptions != null && !aiAssumptions.isBlank())
                ? aiAssumptions.trim().substring(0, Math.min(250, aiAssumptions.trim().length()))
                : "Approximate AI estimate — confirm with a garage";
            String label = String.format("LKR %,.0f – %,.0f (Approximate AI estimate — confirm with a garage)", aiMin, aiMax);
            return new CostEstimate(aiMin, aiMax, "LKR", "AI_ESTIMATE", assumptions, label);
        }

        // Tier 3: Unavailable fallback (honest, never invents numbers)
        return new CostEstimate(null, null, "LKR", "UNAVAILABLE", null, "Estimate unavailable");
    }
}
