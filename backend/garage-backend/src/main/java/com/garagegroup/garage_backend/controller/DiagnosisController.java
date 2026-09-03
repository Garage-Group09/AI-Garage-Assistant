package com.garagegroup.garage_backend.controller;

import com.garagegroup.garage_backend.dto.DiagnosisRequest;
import com.garagegroup.garage_backend.service.GroqService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/diagnosis")
public class DiagnosisController {

    @Autowired
    private GroqService groqService;

    @PostMapping
    public ResponseEntity<Map<String, String>> diagnose(@RequestBody DiagnosisRequest request) {
        try {
            String result = groqService.getDiagnosis(request.getMessage(), request.getLanguage());
            return ResponseEntity.ok(Map.of("diagnosis", result));
        } catch (Exception e) {
            System.err.println("Groq diagnosis error: " + e.getMessage());
            return ResponseEntity.status(500).body(Map.of("error", "AI service unavailable"));
        }
    }
}