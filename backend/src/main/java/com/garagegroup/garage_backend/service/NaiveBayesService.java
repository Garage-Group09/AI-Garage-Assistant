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

    // -- Model fields ---------------------------------------------------------
    private List<String> classes;
    private Map<String, Integer> vocabulary;
    private double[] classLogPrior;
    private double[][] featureLogProb;

    // -- Nested result type ---------------------------------------------------
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

    // -- Model loading --------------------------------------------------------
    @PostConstruct
    public void loadModel() {
        try {
            ObjectMapper mapper = new ObjectMapper();
            ClassPathResource resource = new ClassPathResource("nb_model.json");

            try (InputStream is = resource.getInputStream()) {
                JsonNode root = mapper.readTree(is);

                // classes
                JsonNode classesNode = root.get("classes");
                classes = new ArrayList<>();
                for (JsonNode cn : classesNode) {
                    classes.add(cn.asText());
                }

                // vocabulary: word -> index
                JsonNode vocabNode = root.get("vocabulary");
                vocabulary = new HashMap<>();
                vocabNode.fields().forEachRemaining(e -> vocabulary.put(e.getKey(), e.getValue().asInt()));

                // class_log_prior  (snake_case in JSON)
                JsonNode priorNode = root.get("class_log_prior");
                classLogPrior = new double[priorNode.size()];
                for (int i = 0; i < priorNode.size(); i++) {
                    classLogPrior[i] = priorNode.get(i).asDouble();
                }

                // feature_log_prob  (snake_case in JSON)
                JsonNode flpNode = root.get("feature_log_prob");
                featureLogProb = new double[flpNode.size()][];
                for (int i = 0; i < flpNode.size(); i++) {
                    JsonNode row = flpNode.get(i);
                    featureLogProb[i] = new double[row.size()];
                    for (int j = 0; j < row.size(); j++) {
                        featureLogProb[i][j] = row.get(j).asDouble();
                    }
                }
            }

            System.out.println("Naive Bayes model loaded: " + classes.size()
                    + " classes, " + vocabulary.size() + " vocabulary words");

        } catch (Exception e) {
            throw new RuntimeException("Failed to load Naive Bayes model from nb_model.json", e);
        }
    }

    // -- Tokenisation helper --------------------------------------------------
    private List<String> tokenize(String text) {
        List<String> tokens = new ArrayList<>();
        for (String t : text.toLowerCase().split("\\W+")) {
            if (!t.isEmpty()) tokens.add(t);
        }
        return tokens;
    }

    // -- Scoring helper -------------------------------------------------------
    private double[] computeScores(String text) {
        List<String> tokens = tokenize(text);
        int numClasses = classes.size();
        double[] scores = new double[numClasses];

        for (int c = 0; c < numClasses; c++) {
            scores[c] = classLogPrior[c];
            for (String token : tokens) {
                Integer idx = vocabulary.get(token);
                if (idx != null) {
                    scores[c] += featureLogProb[c][idx];
                }
            }
        }
        return scores;
    }

    // -- Public API -----------------------------------------------------------

    /**
     * Returns the name of the most likely fault category for the given text.
     */
    public String predict(String text) {
        double[] scores = computeScores(text);
        int bestIdx = 0;
        for (int c = 1; c < scores.length; c++) {
            if (scores[c] > scores[bestIdx]) bestIdx = c;
        }
        return classes.get(bestIdx);
    }

    /**
     * Returns the predicted class together with per-class confidence values
     * computed via softmax (numerically stable).
     */
    public NbPrediction predictWithConfidence(String text) {
        double[] scores = computeScores(text);
        int numClasses = classes.size();

        // Softmax: subtract max for numerical stability
        double maxScore = Arrays.stream(scores).max().orElse(0.0);
        double[] expScores = new double[numClasses];
        double sumExp = 0.0;
        for (int c = 0; c < numClasses; c++) {
            expScores[c] = Math.exp(scores[c] - maxScore);
            sumExp += expScores[c];
        }

        // Normalise & find best class
        Map<String, Double> confidences = new LinkedHashMap<>();
        int bestIdx = 0;
        for (int c = 0; c < numClasses; c++) {
            double prob = expScores[c] / sumExp;
            confidences.put(classes.get(c), prob);
            if (expScores[c] > expScores[bestIdx]) bestIdx = c;
        }

        return new NbPrediction(classes.get(bestIdx), confidences);
    }
}