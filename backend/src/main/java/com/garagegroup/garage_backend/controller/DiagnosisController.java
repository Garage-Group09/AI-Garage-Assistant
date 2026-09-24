package com.garagegroup.garage_backend.controller;

import com.garagegroup.garage_backend.dto.DiagnosisRequest;
import com.garagegroup.garage_backend.entity.ChatHistory;
import com.garagegroup.garage_backend.entity.Diagnosis;
import com.garagegroup.garage_backend.entity.Symptom;
import com.garagegroup.garage_backend.entity.User;
import com.garagegroup.garage_backend.entity.Vehicle;
import com.garagegroup.garage_backend.entity.VehicleModel;
import com.garagegroup.garage_backend.repository.ChatHistoryRepository;
import com.garagegroup.garage_backend.repository.DiagnosisRepository;
import com.garagegroup.garage_backend.repository.SymptomRepository;
import com.garagegroup.garage_backend.repository.UserRepository;
import com.garagegroup.garage_backend.repository.VehicleModelRepository;
import com.garagegroup.garage_backend.repository.VehicleRepository;
import com.garagegroup.garage_backend.service.GroqService;
import com.garagegroup.garage_backend.service.GroqService.DiagnosisResult;
import com.garagegroup.garage_backend.service.RepairCostService;
import com.garagegroup.garage_backend.service.RepairCostService.CostEstimate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
public class DiagnosisController {

    @Autowired
    private GroqService groqService;

    @Autowired
    private RepairCostService repairCostService;

    @Autowired
    private ChatHistoryRepository chatHistoryRepository;

    @Autowired
    private SymptomRepository symptomRepository;

    @Autowired
    private DiagnosisRepository diagnosisRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private VehicleRepository vehicleRepository;

    @Autowired
    private VehicleModelRepository vehicleModelRepository;

    @Autowired
    private jakarta.servlet.http.HttpServletRequest httpRequest;

    @Autowired
    private com.garagegroup.garage_backend.service.DiagnosisPersistenceService persistence;

    private static final String DEFAULT_MODEL = "hybrid-naivebayes+groq";

    @PostMapping("/diagnosis")
    public ResponseEntity<Map<String, Object>> diagnose(@RequestBody DiagnosisRequest request) {
        // 1. Validate user authentication from verified session
        User currentUser = (User) httpRequest.getAttribute("currentUser");
        if (currentUser == null) {
            return ResponseEntity.status(401).body(error("Authentication required. Please log in before requesting a diagnosis."));
        }
        // Always bind to the server-validated user identity
        Integer validUserId = currentUser.getUserId();

        if (request.getMessage() == null || request.getMessage().isBlank() || request.getMessage().length() > 2000) {
            return ResponseEntity.badRequest().body(error("Enter a symptom of 1–2000 characters."));
        }
        if (request.getSessionId() == null || !request.getSessionId().matches("[A-Za-z0-9_-]{1,64}")) {
            return ResponseEntity.badRequest().body(error("A valid diagnosis session is required. Start New Diagnosis."));
        }
        // 2. Validate saved vehicle requirement (vehicleId required, exists, belongs to user or admin)
        if (request.getVehicleId() == null) {
            return ResponseEntity.status(400).body(error("Vehicle selection required. Please select or add a vehicle to start diagnosis."));
        }
        Optional<Vehicle> optVehicle = vehicleRepository.findById(request.getVehicleId());
        if (optVehicle.isEmpty()) {
            return ResponseEntity.status(404).body(error("Vehicle not found."));
        }
        Vehicle vehicle = optVehicle.get();
        if (vehicle.getUserId() == null || (!vehicle.getUserId().equals(validUserId) && !currentUser.isAdmin())) {
            return ResponseEntity.status(403).body(error("Unauthorized: Selected vehicle does not belong to the authenticated user."));
        }
        Integer validVehicleId = vehicle.getVehicleId();

        // 3. Retrieve specifications from the database
        String brand = (vehicle.getBrand() != null && !vehicle.getBrand().isBlank()) ? vehicle.getBrand() : "Unknown Brand";
        String modelName = "Unknown Model";
        if (vehicle.getModelId() != null) {
            Optional<VehicleModel> optModel = vehicleModelRepository.findById(vehicle.getModelId());
            if (optModel.isPresent() && optModel.get().getModelName() != null) {
                modelName = optModel.get().getModelName();
            }
        }
        String yearStr = (vehicle.getYear() != null) ? String.valueOf(vehicle.getYear()) : "Year unknown";
        String fuelType = (vehicle.getFuelType() != null && !vehicle.getFuelType().isBlank()) ? vehicle.getFuelType() : "Unknown fuel";
        String vehicleType = (vehicle.getVehicleType() != null && !vehicle.getVehicleType().isBlank()) ? vehicle.getVehicleType() : "Vehicle";
        String vehicleSpecSummary = String.format("%s %s (%s), %s, %s", brand, modelName, yearStr, fuelType, vehicleType);

        // 4. Fetch prior conversation history scoped to this user, vehicle, and session (if provided)
        List<ChatHistory> priorHistory;
        if (request.getSessionId() != null && !request.getSessionId().isBlank()) {
            priorHistory = chatHistoryRepository
                    .findByUserIdAndVehicleIdAndSessionIdOrderByCreatedAtAsc(validUserId, validVehicleId, request.getSessionId().trim());
        } else {
            priorHistory = chatHistoryRepository
                    .findByUserIdAndVehicleIdOrderByCreatedAtAsc(validUserId, validVehicleId);
        }

        String context = GroqService.symptomContext(request.getMessage(), priorHistory);
        if (context.length() > 16000 || priorHistory.size() > 40) {
            return ResponseEntity.badRequest().body(error("This conversation is full. Please start New Diagnosis."));
        }
        // 5. Call AI service with structured JSON response
        DiagnosisResult result;
        try {
            result = groqService.getDiagnosis(request.getMessage(), request.getLanguage(), priorHistory, vehicleSpecSummary);
        } catch (java.net.http.HttpTimeoutException e) {
            System.err.println("GroqService call timed out: " + e.getMessage());
            return ResponseEntity.status(504).body(error("AI service timed out. Your message has been preserved — please retry."));
        } catch (Exception e) {
            String msg = e.getMessage();
            // Never expose API key or internal stack details to client
            if (msg != null && (msg.contains("API") || msg.contains("rate limit") || msg.contains("timed out"))) {
                System.err.println("Groq diagnosis error: " + msg);
                return ResponseEntity.status(502).body(error(msg));
            }
            System.err.println("Groq diagnosis error: " + msg);
            return ResponseEntity.status(502).body(error("AI diagnostic service temporarily unavailable. Please retry."));
        }

        CostEstimate cost = repairCostService.resolveEstimate(result.getFaultName(), result.getMinCost(),
                result.getMaxCost(), result.getCostAssumptions());
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("diagnosis", result.getReply());
        response.put("responseType", result.getResponseType().name());
        if (result.getResponseType() == Diagnosis.ResponseType.DIAGNOSIS) {
            response.put("faultName", result.getFaultName());
            response.put("possibleCause", result.getPossibleCause());
            response.put("safeToDrive", result.getSafeToDrive());
            response.put("confidence", result.getConfidence());
            response.put("costEstimate", cost.toMap());
        }
        try {
            persistence.save(validUserId, validVehicleId, request.getSessionId(), request.getMessage(), context,
                result, cost, response);
        } catch (Exception e) {
            System.err.println("Diagnosis transaction failed: " + e.getClass().getSimpleName());
            return ResponseEntity.status(500).body(error("Could not save this diagnosis. Your message has been preserved; please retry."));
        }
        return ResponseEntity.ok(response);
    }

    @GetMapping("/chat-history/{userId}")
    public ResponseEntity<?> getChatHistory(
            @PathVariable Integer userId,
            @RequestParam(required = false) Integer vehicleId,
            @RequestParam(required = false) String sessionId) {

        User currentUser = (User) httpRequest.getAttribute("currentUser");
        if (currentUser == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Authentication required."));
        }
        if (!currentUser.getUserId().equals(userId) && !currentUser.isAdmin()) {
            return ResponseEntity.status(403).body(Map.of("error", "Access denied: cannot view another user's chat history."));
        }

        List<ChatHistory> history;
        if (vehicleId != null && sessionId != null && !sessionId.isBlank()) {
            history = chatHistoryRepository.findByUserIdAndVehicleIdAndSessionIdOrderByCreatedAtAsc(userId, vehicleId, sessionId.trim());
        } else if (vehicleId != null) {
            history = chatHistoryRepository.findByUserIdAndVehicleIdOrderByCreatedAtAsc(userId, vehicleId);
        } else {
            history = chatHistoryRepository.findByUserIdOrderByCreatedAtAsc(userId);
        }

        List<Map<String, Object>> responseList = history.stream().map(entry -> {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("sender", entry.getSender().name()); item.put("message", entry.getMessage());
            item.put("createdAt", entry.getCreatedAt());
            if (entry.getMetadataJson() != null) {
                try { item.put("diagnosisData", new com.fasterxml.jackson.databind.ObjectMapper()
                    .readValue(entry.getMetadataJson(), Map.class)); }
                catch (Exception ignored) { /* Legacy history may contain no structured data. */ }
            }
            return item;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(responseList);
    }

    // Helper to build a consistent error response
    private Map<String, Object> error(String message) {
        Map<String, Object> m = new HashMap<>();
        m.put("error", message);
        return m;
    }
}