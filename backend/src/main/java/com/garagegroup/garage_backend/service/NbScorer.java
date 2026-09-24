package com.garagegroup.garage_backend.service;

import java.util.*;

/** Pure Java scoring shared by the production service and cross-language checks. */
public final class NbScorer {
    private NbScorer() {}
    public static double[] probabilities(String text, Map<String, Integer> vocabulary,
                                         double[] priors, double[][] weights) {
        String[] tokens = (text == null ? "" : text).toLowerCase(Locale.ROOT).split("[^a-z0-9_]+");
        double[] scores = priors.clone();
        for (int c = 0; c < scores.length; c++) {
            for (String token : tokens) {
                Integer idx = vocabulary.get(token);
                if (idx != null) scores[c] += weights[c][idx];
            }
        }
        double max = Arrays.stream(scores).max().orElse(0);
        double total = 0;
        for (int c = 0; c < scores.length; c++) total += (scores[c] = Math.exp(scores[c] - max));
        for (int c = 0; c < scores.length; c++) scores[c] /= total;
        return scores;
    }
}
