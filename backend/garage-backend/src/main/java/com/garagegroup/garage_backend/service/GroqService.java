package com.garagegroup.garage_backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

@Service
public class GroqService {

    @Value("${groq.api.key}")
    private String groqApiKey;

    private static final String GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
    private static final String MODEL = "openai/gpt-oss-20b";

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    private final ObjectMapper objectMapper = new ObjectMapper();

    public String getDiagnosis(String userMessage, String language) throws Exception {
        // Map language code to full language name
        String languageName;
        if ("si".equals(language)) {
            languageName = "Sinhala";
        } else if ("ta".equals(language)) {
            languageName = "Tamil";
        } else {
            languageName = "English";
        }

        String systemPrompt = "You are an AI vehicle diagnostic assistant inside a garage-finder app. "
                + "A driver will describe a vehicle symptom. Respond ONLY in " + languageName + ". "
                + "In 2-4 short sentences: state the most likely cause, mention whether it is safe to keep driving, "
                + "and recommend visiting a certified garage if the issue sounds serious. "
                + "Do not quote exact repair costs. Keep it beginner-friendly, no jargon dump.";

        // Build JSON request body
        ObjectNode root = objectMapper.createObjectNode();
        root.put("model", MODEL);
        root.put("temperature", 0.4);
        root.put("max_tokens", 250);

        ArrayNode messages = objectMapper.createArrayNode();

        ObjectNode systemMsg = objectMapper.createObjectNode();
        systemMsg.put("role", "system");
        systemMsg.put("content", systemPrompt);
        messages.add(systemMsg);

        ObjectNode userMsg = objectMapper.createObjectNode();
        userMsg.put("role", "user");
        userMsg.put("content", userMessage);
        messages.add(userMsg);

        root.set("messages", messages);

        String requestBody = objectMapper.writeValueAsString(root);

        // Build and send HTTP request
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(GROQ_URL))
                .header("Authorization", "Bearer " + groqApiKey)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                .timeout(Duration.ofSeconds(15))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() != 200) {
            throw new RuntimeException("Groq API error " + response.statusCode() + ": " + response.body());
        }

        // Parse response and extract content
        JsonNode responseJson = objectMapper.readTree(response.body());
        return responseJson.at("/choices/0/message/content").asText();
    }
}