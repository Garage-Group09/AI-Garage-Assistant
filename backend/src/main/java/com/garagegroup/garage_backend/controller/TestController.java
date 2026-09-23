package com.garagegroup.garage_backend.controller;

import com.garagegroup.garage_backend.service.NaiveBayesService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class TestController {

    @Autowired
    private NaiveBayesService naiveBayesService;

    /**
     * Quick smoke-test endpoint for the Naive Bayes service.
     * Example: GET /api/test-nb?text=brake+squeaking+noise
     */
    @GetMapping("/test-nb")
    public NaiveBayesService.NbPrediction testNb(@RequestParam String text) {
        return naiveBayesService.predictWithConfidence(text);
    }
}