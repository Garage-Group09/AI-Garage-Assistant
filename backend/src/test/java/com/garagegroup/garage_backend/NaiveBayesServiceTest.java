package com.garagegroup.garage_backend;

import com.garagegroup.garage_backend.service.NaiveBayesService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.junit.jupiter.SpringExtension;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Standalone test for NaiveBayesService.
 * Uses only a minimal Spring context (no DataSource / JPA / web layer)
 * so it runs without a MySQL connection.
 */
@ExtendWith(SpringExtension.class)
@ContextConfiguration(classes = {NaiveBayesService.class})
public class NaiveBayesServiceTest {

    @Autowired
    private NaiveBayesService service;

    @Test
    public void testBrakeSqueakingNoise() {
        NaiveBayesService.NbPrediction p = service.predictWithConfidence("brake squeaking noise");

        System.out.println("\n=== GET /api/test-nb?text=brake+squeaking+noise ===");
        System.out.println("{");
        System.out.println("  \"predictedClass\": \"" + p.getPredictedClass() + "\",");
        System.out.println("  \"confidences\": {");
        Map<String, Double> conf = p.getConfidences();
        String[] keys = conf.keySet().toArray(new String[0]);
        for (int i = 0; i < keys.length; i++) {
            String comma = (i < keys.length - 1) ? "," : "";
            System.out.printf("    \"%s\": %.10f%s%n", keys[i], conf.get(keys[i]), comma);
        }
        System.out.println("  }");
        System.out.println("}");

        assertNotNull(p.getPredictedClass());
        assertFalse(p.getConfidences().isEmpty());
    }

    @Test
    public void testCarWontStartBatteryDead() {
        NaiveBayesService.NbPrediction p = service.predictWithConfidence("car wont start battery dead");

        System.out.println("\n=== GET /api/test-nb?text=car+wont+start+battery+dead ===");
        System.out.println("{");
        System.out.println("  \"predictedClass\": \"" + p.getPredictedClass() + "\",");
        System.out.println("  \"confidences\": {");
        Map<String, Double> conf = p.getConfidences();
        String[] keys = conf.keySet().toArray(new String[0]);
        for (int i = 0; i < keys.length; i++) {
            String comma = (i < keys.length - 1) ? "," : "";
            System.out.printf("    \"%s\": %.10f%s%n", keys[i], conf.get(keys[i]), comma);
        }
        System.out.println("  }");
        System.out.println("}");

        assertNotNull(p.getPredictedClass());
        assertFalse(p.getConfidences().isEmpty());
    }
}