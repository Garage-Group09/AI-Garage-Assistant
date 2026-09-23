package com.garagegroup.garage_backend.controller;

import com.garagegroup.garage_backend.dto.DiagnosisRequest;
import com.garagegroup.garage_backend.entity.ChatHistory;
import com.garagegroup.garage_backend.entity.Diagnosis;
import com.garagegroup.garage_backend.entity.Symptom;
import com.garagegroup.garage_backend.repository.ChatHistoryRepository;
import com.garagegroup.garage_backend.repository.DiagnosisRepository;
import com.garagegroup.garage_backend.repository.SymptomRepository;
import com.garagegroup.garage_backend.service.GroqService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
public class DiagnosisController {

    @Autowired
    private GroqService groqService;

    @Autowired
    private ChatHistoryRepository chatHistoryRepository;

    @Autowired
    private SymptomRepository symptomRepository;

    @Autowired
    private DiagnosisRepository diagnosisRepository;

    private static final String DEFAULT_MODEL = "hybrid-naivebayes+groq";

    @PostMapping("/diagnosis")
    public ResponseEntity<Map<String, String>> diagnose(@RequestBody DiagnosisRequest request) {
        // 1. Save user message to chat history (isolated — FK failure won't abort the request)
        if (request.getUserId() != null) {
            try {
                ChatHistory userEntry = new ChatHistory();
                userEntry.setUserId(request.getUserId());
                userEntry.setSender(ChatHistory.Sender.user);
                userEntry.setMessage(request.getMessage());
                chatHistoryRepository.save(userEntry);
            } catch (Exception e) {
                System.err.println("chat_history user save skipped: " + e.getMessage());
            }
        }

        // 2. Fetch prior conversation history BEFORE calling the AI
        //    so the current user message is NOT yet in the history window
        List<ChatHistory> priorHistory = request.getUserId() != null
                ? chatHistoryRepository.findByUserIdOrderByCreatedAtAsc(request.getUserId())
                : Collections.emptyList();

        // 3. Call AI service with conversation history
        String result;
        try {
            result = groqService.getDiagnosis(request.getMessage(), request.getLanguage(), priorHistory);
        } catch (Exception e) {
            System.err.println("Groq diagnosis error: " + e.getMessage());
            return ResponseEntity.status(500).body(Map.of("error", "AI service unavailable"));
        }

        // 4. Save AI reply to chat history (isolated)
        if (request.getUserId() != null) {
            try {
                ChatHistory aiEntry = new ChatHistory();
                aiEntry.setUserId(request.getUserId());
                aiEntry.setSender(ChatHistory.Sender.ai);
                aiEntry.setMessage(result);
                chatHistoryRepository.save(aiEntry);
            } catch (Exception e) {
                System.err.println("chat_history ai save skipped: " + e.getMessage());
            }
        }

        // 5. Persist Symptom row (vehicleId and userId are optional)
        Long savedSymptomId = null;
        try {
            Symptom symptom = new Symptom();
            symptom.setDescription(request.getMessage());
            if (request.getUserId() != null) {
                symptom.setUserId(request.getUserId());
            }
            if (request.getVehicleId() != null) {
                symptom.setVehicleId(request.getVehicleId());
            }
            Symptom savedSymptom = symptomRepository.save(symptom);
            savedSymptomId = savedSymptom.getSymptomId();
            System.out.println("SYMPTOM SAVED: id=" + savedSymptomId);
        } catch (Exception e) {
            System.out.println("SYMPTOM SAVE FAILED: " + e.getMessage());
            e.printStackTrace();
        }

        // 6. Determine modelUsed — try Naive Bayes category, fall back to DEFAULT_MODEL
        String modelUsed = (request.getModelUsed() != null && !request.getModelUsed().isBlank())
                ? request.getModelUsed()
                : DEFAULT_MODEL;

        try {
            String nbCategory = groqService.getPredictedCategory(request.getMessage());
            System.out.println("NB predicted category: " + nbCategory);
        } catch (Exception e) {
            System.err.println("NaiveBayes category retrieval failed (non-fatal): " + e.getMessage());
        }

        // 7. Persist Diagnosis row — runs independently even if Symptom save failed
        try {
            Diagnosis diagnosis = new Diagnosis();
            // Link to symptom if available, else use -1 as sentinel (column is NOT NULL)
            diagnosis.setSymptomId(savedSymptomId != null ? savedSymptomId : -1L);
            diagnosis.setPossibleCause(result);
            diagnosis.setModelUsed(modelUsed);
            diagnosisRepository.save(diagnosis);
            System.out.println("DIAGNOSIS SAVED: symptomId=" + diagnosis.getSymptomId() + ", modelUsed=" + modelUsed);
        } catch (Exception e) {
            System.out.println("DIAGNOSIS SAVE FAILED: " + e.getMessage());
            e.printStackTrace();
        }

        return ResponseEntity.ok(Map.of("diagnosis", result));
    }

    @GetMapping("/chat-history/{userId}")
    public ResponseEntity<List<Map<String, String>>> getChatHistory(@PathVariable Integer userId) {
        List<ChatHistory> history = chatHistoryRepository.findByUserIdOrderByCreatedAtAsc(userId);

        List<Map<String, String>> response = history.stream()
                .map(entry -> Map.of(
                        "sender", entry.getSender().name(),
                        "message", entry.getMessage()
                ))
                .collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }
}