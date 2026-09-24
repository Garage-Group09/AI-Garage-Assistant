package com.garagegroup.garage_backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import jakarta.annotation.PostConstruct;
import java.io.InputStream;
import java.util.*;

@Service
public class NaiveBayesService {
    private List<String> classes;
    private Map<String, Integer> vocabulary;
    private double[] priors;
    private double[][] weights;

    public static class NbPrediction {
        private final String predictedClass;
        private final Map<String, Double> confidences;
        public NbPrediction(String predictedClass, Map<String, Double> confidences) {
            this.predictedClass = predictedClass;
            this.confidences = confidences;
        }
        public String getPredictedClass() { return predictedClass; }
        public Map<String, Double> getConfidences() { return confidences; }
    }

    @PostConstruct
    public synchronized void loadModel() {
        try {
            ObjectMapper mapper = new ObjectMapper();
            JsonNode root;
            java.io.File file = new java.io.File("src/main/resources/nb_model.json");
            if (file.exists()) root = mapper.readTree(file);
            else try (InputStream in = new ClassPathResource("nb_model.json").getInputStream()) {
                root = mapper.readTree(in);
            }
            List<String> nextClasses = mapper.convertValue(root.get("classes"),
                new com.fasterxml.jackson.core.type.TypeReference<List<String>>() {});
            Map<String, Integer> nextVocabulary = mapper.convertValue(root.get("vocabulary"),
                new com.fasterxml.jackson.core.type.TypeReference<Map<String, Integer>>() {});
            double[] nextPriors = mapper.treeToValue(root.get("class_log_prior"), double[].class);
            double[][] nextWeights = mapper.treeToValue(root.get("feature_log_prob"), double[][].class);
            if (nextClasses == null || nextClasses.isEmpty() || nextVocabulary == null || nextVocabulary.isEmpty()
                || nextPriors.length != nextClasses.size() || nextWeights.length != nextClasses.size())
                throw new IllegalArgumentException("Invalid model dimensions");
            for (double prior : nextPriors) if (!Double.isFinite(prior)) throw new IllegalArgumentException("Invalid prior");
            for (int idx : nextVocabulary.values()) if (idx < 0 || idx >= nextVocabulary.size()) throw new IllegalArgumentException("Invalid vocabulary index");
            for (double[] row : nextWeights) {
                if (row.length != nextVocabulary.size()) throw new IllegalArgumentException("Invalid model row");
                for (double value : row) if (!Double.isFinite(value)) throw new IllegalArgumentException("Invalid weight");
            }
            // Swap only after complete validation. Predictions and reload share this lock.
            classes = nextClasses; vocabulary = nextVocabulary; priors = nextPriors; weights = nextWeights;
        } catch (Exception e) { throw new IllegalStateException("Unable to load model; previous model retained", e); }
    }

    public synchronized String predict(String text) { return predictWithConfidence(text).getPredictedClass(); }

    public synchronized NbPrediction predictWithConfidence(String text) {
        double[] probs = NbScorer.probabilities(text, vocabulary, priors, weights);
        int best = 0;
        Map<String, Double> values = new LinkedHashMap<>();
        for (int i = 0; i < probs.length; i++) {
            values.put(classes.get(i), probs[i]);
            if (probs[i] > probs[best]) best = i;
        }
        boolean known = Arrays.stream((text == null ? "" : text).toLowerCase(Locale.ROOT)
            .split("[^a-z0-9_]+")).anyMatch(vocabulary::containsKey);
        // Abstain on unknown words / weak evidence. These probabilities are not calibrated accuracy.
        return new NbPrediction(known && probs[best] >= 0.35 ? classes.get(best) : null, values);
    }
}
