package com.garagegroup.garage_backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.garagegroup.garage_backend.entity.ChatHistory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;

@Service
public class GroqService {

    @Value("${groq.api.key}")
    private String groqApiKey;

    @Autowired
    private NaiveBayesService naiveBayesService;

    private static final String GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
    private static final String MODEL = "openai/gpt-oss-20b";

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    private final ObjectMapper objectMapper = new ObjectMapper();

    public String getDiagnosis(String userMessage, String language,
                               List<ChatHistory> history) throws Exception {
        // Run Naive Bayes pre-classifier to get a category hint
        String predictedCategory = naiveBayesService.predict(userMessage);

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
                + "Do not quote exact repair costs. Keep it beginner-friendly, no jargon dump."
                + " Based on a preliminary classifier, this issue is likely related to: "
                + predictedCategory.replace("_", " ")
                + ". Use this as a hint but rely on your own reasoning about the actual symptom described."
                + " If the conversation history includes earlier symptoms from the same user, consider whether"
                + " this message is a follow-up or a new issue, and ask a brief clarifying question if the"
                + " message alone is ambiguous.";

        // Build JSON request body
        ObjectNode root = objectMapper.createObjectNode();
        root.put("model", MODEL);
        root.put("temperature", 0.4);
        root.put("max_tokens", 800); // reasoning model needs headroom beyond the visible answer

        ArrayNode messages = objectMapper.createArrayNode();

        // System message first
        ObjectNode systemMsg = objectMapper.createObjectNode();
        systemMsg.put("role", "system");
        systemMsg.put("content", systemPrompt);
        messages.add(systemMsg);

        // Inject the last 6 history entries (chronological) before the current user message
        if (history != null && !history.isEmpty()) {
            int startIndex = Math.max(0, history.size() - 6);
            for (int i = startIndex; i < history.size(); i++) {
                ChatHistory entry = history.get(i);
                ObjectNode histMsg = objectMapper.createObjectNode();
                String role = (entry.getSender() == ChatHistory.Sender.user) ? "user" : "assistant";
                histMsg.put("role", role);
                histMsg.put("content", entry.getMessage());
                messages.add(histMsg);
            }
        }

        // Current user message
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
        String content = responseJson.at("/choices/0/message/content").asText();

        // Diagnostic: log raw response details when content is empty
        if (content == null || content.isBlank()) {
            String finishReason = responseJson.at("/choices/0/finish_reason").asText("(not present)");
            String stopReason  = responseJson.at("/choices/0/stop_reason").asText("(not present)");
            System.err.println("[GROQ EMPTY CONTENT] finish_reason=" + finishReason
                    + " | stop_reason=" + stopReason
                    + " | raw=" + response.body());
        }

        return content;
    }

    /**
     * Returns the Naive Bayes predicted fault category for the given message.
     * Used by the controller to store the category in the diagnosis record.
     */
    public String getPredictedCategory(String userMessage) {
        return naiveBayesService.predict(userMessage);
    }
}