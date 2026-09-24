package com.garagegroup.garage_backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.garagegroup.garage_backend.entity.ChatHistory;
import com.garagegroup.garage_backend.entity.Diagnosis;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;

/**
 * GroqService — calls the Groq AI API in JSON-object mode.
 *
 * The response is a structured object with:
 *   - responseType: GREETING | CLARIFICATION | DIAGNOSIS
 *   - reply:        Conversational message to show the driver.
 *   - faultName:    Short fault category/name, null if unresolved.
 *   - possibleCause: Technical explanation, null if not a full diagnosis.
 *   - safeToDrive:  Boolean or null (null when uncertain — never defaults to safe).
 *   - confidence:   0.0–1.0 or null (AI-self-reported, not independently validated).
 *   - estimatedCost: optional, explicitly approximate LKR repair estimate.
 *
 * The Naive Bayes prediction is injected as a hint but the LLM is instructed
 * not to be forced by it.
 */
@Service
public class GroqService {

    @Value("${groq.api.key:${GROQ_API_KEY:}}")
    private String groqApiKey;

    @Autowired
    private NaiveBayesService naiveBayesService;

    private static final String GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
    private static final String MODEL = "openai/gpt-oss-20b";

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Represents the structured AI response.
     */
    public static class DiagnosisResult {
        private final Diagnosis.ResponseType responseType;
        private final String reply;          // Always present — display to driver
        private final String faultName;      // Only on DIAGNOSIS
        private final String possibleCause;  // Only on DIAGNOSIS
        private final Boolean safeToDrive;   // null = unknown/unassessed
        private final Double confidence;     // LLM self-report, not classifier probability
        private Double minCost;
        private Double maxCost;
        private String costAssumptions;

        public DiagnosisResult(Diagnosis.ResponseType responseType, String reply,
                               String faultName, String possibleCause,
                               Boolean safeToDrive, Double confidence) {
            this.responseType = responseType;
            this.reply = reply;
            this.faultName = faultName;
            this.possibleCause = possibleCause;
            this.safeToDrive = safeToDrive;
            this.confidence = confidence;
        }

        public Diagnosis.ResponseType getResponseType() { return responseType; }
        public String getReply() { return reply; }
        public String getFaultName() { return faultName; }
        public String getPossibleCause() { return possibleCause; }
        public Boolean getSafeToDrive() { return safeToDrive; }
        public Double getConfidence() { return confidence; }
        public Double getMinCost() { return minCost; }
        public Double getMaxCost() { return maxCost; }
        public String getCostAssumptions() { return costAssumptions; }
    }

    public DiagnosisResult getDiagnosis(String userMessage, String language,
                                        List<ChatHistory> history,
                                        String vehicleSpecSummary) throws Exception {
        if (groqApiKey == null || groqApiKey.isBlank()) throw new IllegalStateException("Groq API key is not configured.");
        // Run Naive Bayes pre-classifier for a category hint
        String predictedCategory = naiveBayesService.predict(symptomContext(userMessage, history));

        // Map language code to full language name
        String languageName;
        if ("si".equals(language)) {
            languageName = "Sinhala";
        } else if ("ta".equals(language)) {
            languageName = "Tamil";
        } else {
            languageName = "English";
        }

        String vehicleClause = (vehicleSpecSummary != null && !vehicleSpecSummary.isBlank())
                ? " The driver's vehicle is: " + vehicleSpecSummary + "."
                  + " Use this vehicle information for technical context (e.g. fuel type, engine type, body type)."
                  + " Do NOT assume faults that are not described by the driver or invent unsupported diagnoses."
                  + " Base your diagnosis strictly on the actual symptoms described."
                : "";

        String systemPrompt = "You are an AI vehicle diagnostic assistant for Smart Garage.AI. "
                + "Respond ONLY in " + languageName + ". "
                + vehicleClause + " "
                + "A preliminary category classifier suggests this issue is related to: "
                + (predictedCategory == null ? "unknown (insufficient classifier evidence)" : predictedCategory.replace("_", " "))
                + ". Use this only as a hint — do NOT let it force your conclusion if the symptoms suggest otherwise.\n\n"
                + "Output ONLY a valid JSON object (no markdown, no explanation outside JSON) with these keys:\n"
                + "  responseType: 'GREETING', 'CLARIFICATION', or 'DIAGNOSIS'\n"
                + "  reply: Conversational message to display to the driver.\n"
                + "  faultName: One of air_conditioning, brake_system, cooling_system, electrical_battery, engine_mechanical, tires_suspension, transmission; or null if not determined. Choose based on the whole conversation, not blindly on the classifier hint.\n"
                + "  possibleCause: Technical possible-cause explanation SEPARATE from the reply. "
                + "null for GREETING or CLARIFICATION, or when insufficient information exists.\n"
                + "  safeToDrive: true, false, or null. CRITICAL: Set null when safety cannot be assessed "
                + "from the information available. Do NOT default to true or safe when uncertain.\n"
                + "  confidence: Number 0.0–1.0 representing your uncertainty, or null if not assessed. "
                + "This is your self-reported confidence, NOT a validated diagnostic accuracy score.\n"
                + "  estimatedCost: null if uncertain, otherwise an object {minCost: number, maxCost: number, assumptions: string}. Only for DIAGNOSIS: a rough LKR estimate for the described repair and vehicle in Sri Lanka, including parts/labour assumptions. Never describe it as a quote or verified market price. Leave null if the repair scope is unclear.\n\n"
                + "Rules:\n"
                + "1. On the first message or when the complaint is vague (e.g. 'ticking', 'after warm up', "
                + "'different sound'), use responseType CLARIFICATION and ask one specific, unanswered question.\n"
                + "2. Do NOT confidently diagnose from short vague inputs. A post-warmup ticking in a petrol engine "
                + "could be valve lifters, exhaust leak, fuel injectors, or low oil — NOT specifically a water pump. "
                + "Acknowledge uncertainty explicitly.\n"
                + "3. Do NOT repeat questions already answered in the conversation history.\n"
                + "4. Only use DIAGNOSIS responseType when enough information exists for a real assessment.\n"
                + "5. When diagnosing, keep possibleCause technically accurate and separate from the conversational reply.\n"
                + "6. Keep responses beginner-friendly and under 3 short sentences for reply.";

        // Build JSON request body
        ObjectNode root = objectMapper.createObjectNode();
        root.put("model", MODEL);
        root.put("temperature", 0.3);
        root.put("max_tokens", 800);

        // Enable JSON mode
        ObjectNode responseFormat = objectMapper.createObjectNode();
        responseFormat.put("type", "json_object");
        root.set("response_format", responseFormat);

        ArrayNode messages = objectMapper.createArrayNode();

        // System message
        ObjectNode systemMsg = objectMapper.createObjectNode();
        systemMsg.put("role", "system");
        systemMsg.put("content", systemPrompt);
        messages.add(systemMsg);

        // Inject bounded session history entries (chronological) before the current user message
        if (history != null && !history.isEmpty()) {
            int startIndex = 0;
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
                .timeout(Duration.ofSeconds(20))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() == 429) {
            throw new RuntimeException("AI service rate limit reached. Please wait a moment and retry.");
        }
        if (response.statusCode() != 200) {
            System.err.println("[GROQ HTTP " + response.statusCode() + "] body=" + response.body());
            throw new RuntimeException("AI service error (HTTP " + response.statusCode() + "). Please retry.");
        }

        // Parse the structured JSON response
        JsonNode responseJson = objectMapper.readTree(response.body());
        String rawContent = responseJson.at("/choices/0/message/content").asText();

        if (rawContent == null || rawContent.isBlank()) {
            String finishReason = responseJson.at("/choices/0/finish_reason").asText("unknown");
            System.err.println("[GROQ EMPTY CONTENT] finish_reason=" + finishReason + " | raw=" + response.body());
            throw new RuntimeException("AI service returned empty response (finish_reason: " + finishReason + "). Please retry.");
        }

        // Parse the inner JSON object from the AI
        JsonNode parsed;
        try {
            parsed = objectMapper.readTree(rawContent);
        } catch (Exception e) {
            System.err.println("[GROQ PARSE ERROR] raw_content=" + rawContent);
            throw new RuntimeException("AI response could not be parsed. Please retry.");
        }

        // Extract fields safely
        String responseTypeStr = parsed.path("responseType").asText("CLARIFICATION").toUpperCase();
        String reply = parsed.path("reply").asText(null);
        String faultName = parsed.path("faultName").isNull() ? null : parsed.path("faultName").asText(null);
        String possibleCause = parsed.path("possibleCause").isNull() ? null : parsed.path("possibleCause").asText(null);
        Boolean safeToDrive = parsed.path("safeToDrive").isBoolean() ? parsed.path("safeToDrive").booleanValue() : null;
        Double confidence = numberOrNull(parsed.path("confidence"));
        if (confidence != null && (confidence < 0 || confidence > 1)) confidence = null;

        // Guard: reply must be present
        if (reply == null || reply.isBlank()) {
            throw new IllegalStateException("AI response did not contain a reply. Please retry.");
        }

        // Parse responseType enum safely
        Diagnosis.ResponseType responseType;
        try {
            responseType = Diagnosis.ResponseType.valueOf(responseTypeStr);
        } catch (IllegalArgumentException e) {
            responseType = Diagnosis.ResponseType.CLARIFICATION;
        }

        // For non-DIAGNOSIS types, clear technical fields to prevent wrong persistence
        if (responseType != Diagnosis.ResponseType.DIAGNOSIS) {
            faultName = null;
            possibleCause = null;
            safeToDrive = null;
            confidence = null;
        }

        if (faultName != null && !java.util.Set.of("air_conditioning", "brake_system", "cooling_system",
                "electrical_battery", "engine_mechanical", "tires_suspension", "transmission").contains(faultName)) faultName = null;
        DiagnosisResult result = new DiagnosisResult(responseType, reply, faultName, possibleCause, safeToDrive, confidence);
        if (responseType == Diagnosis.ResponseType.DIAGNOSIS) {
            JsonNode cost = parsed.path("estimatedCost");
            result.minCost = numberOrNull(cost.path("minCost"));
            result.maxCost = numberOrNull(cost.path("maxCost"));
            result.costAssumptions = cost.path("assumptions").isTextual() ? cost.path("assumptions").asText() : null;
        }
        return result;
    }

    private static Double numberOrNull(JsonNode node) {
        if (!node.isNumber()) return null;
        double value = node.asDouble();
        return Double.isFinite(value) ? value : null;
    }

    public static String symptomContext(String message, List<ChatHistory> history) {
        StringBuilder context = new StringBuilder();
        if (history != null) {
            for (ChatHistory entry : history) {
                if (entry.getSender() == ChatHistory.Sender.user && entry.getMessage() != null) {
                    context.append(entry.getMessage()).append("\n");
                }
            }
        }
        context.append(message == null ? "" : message);
        // Request/session length checks in the controller keep this bounded.
        return context.toString();
    }
}
